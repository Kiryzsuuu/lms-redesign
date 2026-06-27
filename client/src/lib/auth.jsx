import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createApiClient } from './api';

const AuthContext = createContext(null);

// Idle 5 jam tanpa aktivitas (klik/scroll/ketik/gerak) -> auto logout.
const IDLE_LIMIT_MS = 5 * 60 * 60 * 1000;
// Selama user aktif, perpanjang token setiap 20 menit (sliding window).
const REFRESH_EVERY_MS = 20 * 60 * 1000;
// Hemat: jangan tulis localStorage tiap event, cukup tiap 30 detik.
const ACTIVITY_THROTTLE_MS = 30 * 1000;

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem('token')));

  const api = useMemo(() => createApiClient(() => token), [token]);

  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(Date.now());
  const silentRef = useRef(false); // tandai perpanjangan token diam-diam (tanpa refetch /me)

  const doLogout = useCallback(() => {
    setToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    setUser(null);
    setAuthLoading(false);
  }, []);

  async function refreshUser() {
    if (!token) return;
    try {
      setAuthLoading(true);
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (err) {
      console.error('[Auth] Failed to refresh user:', err?.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // Validasi token & ambil profil. Dilewati saat perpanjangan token diam-diam.
  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) {
      doLogout();
      return;
    }
    if (silentRef.current) {
      // Token diperpanjang otomatis; user sudah ada, tidak perlu refetch.
      silentRef.current = false;
      return;
    }

    let alive = true;
    setAuthLoading(true);
    api
      .get('/auth/me')
      .then((res) => {
        if (!alive) return;
        setUser(res.data.user);
      })
      .catch(() => {
        if (!alive) return;
        doLogout();
      })
      .finally(() => {
        if (!alive) return;
        setAuthLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token, api, doLogout]);

  // Watchdog idle + sliding refresh — hanya saat ada token.
  useEffect(() => {
    if (!token) return;

    // Ambil aktivitas terakhir dari storage (sadar reload & multi-tab).
    const stored = Number(localStorage.getItem('lastActivity'));
    lastActivityRef.current = stored && !Number.isNaN(stored) ? stored : Date.now();

    // Jika sudah idle melebihi batas saat halaman dibuka -> langsung logout.
    if (Date.now() - lastActivityRef.current >= IDLE_LIMIT_MS) {
      doLogout();
      return;
    }
    lastRefreshRef.current = Date.now();

    let lastWrite = 0;
    const markActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      if (now - lastWrite >= ACTIVITY_THROTTLE_MS) {
        lastWrite = now;
        localStorage.setItem('lastActivity', String(now));
      }
    };

    const events = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));

    const interval = setInterval(async () => {
      const now = Date.now();
      // Idle 5 jam -> logout (harus login + OTP lagi).
      if (now - lastActivityRef.current >= IDLE_LIMIT_MS) {
        doLogout();
        return;
      }
      // Masih aktif & sudah waktunya -> perpanjang token.
      if (now - lastRefreshRef.current >= REFRESH_EVERY_MS) {
        lastRefreshRef.current = now;
        try {
          const res = await api.post('/auth/refresh');
          if (res.data?.token) {
            silentRef.current = true;
            setToken(res.data.token);
            localStorage.setItem('token', res.data.token);
          }
        } catch (err) {
          if (err?.response?.status === 401) doLogout();
        }
      }
    }, 60 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActivity));
      clearInterval(interval);
    };
  }, [token, api, doLogout]);

  const value = useMemo(
    () => ({
      token,
      user,
      api,
      authLoading,
      isAuthed: Boolean(token && user),
      role: user?.role || 'guest',
      setToken: (t) => {
        setToken(t);
        if (t) {
          localStorage.setItem('token', t);
          // Mulai hitung idle dari saat login.
          localStorage.setItem('lastActivity', String(Date.now()));
          lastActivityRef.current = Date.now();
          lastRefreshRef.current = Date.now();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('lastActivity');
        }
        setAuthLoading(Boolean(t));
      },
      logout: doLogout,
      refreshUser,
    }),
    [token, user, api, authLoading, doLogout]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
