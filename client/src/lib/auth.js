import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { createApiClient } from './api';

const AuthContext = createContext(null);

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

  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) {
      setToken('');
      localStorage.removeItem('token');
      setUser(null);
      setAuthLoading(false);
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
        setToken('');
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => {
        if (!alive) return;
        setAuthLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

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
        if (t) localStorage.setItem('token', t);
        else localStorage.removeItem('token');

        // If a token is set (e.g. after login), treat auth as loading until /me resolves.
        setAuthLoading(Boolean(t));
      },
      logout: () => {
        setToken('');
        localStorage.removeItem('token');
        setUser(null);
        setAuthLoading(false);
      },
      refreshUser,
    }),
    [token, user, api, authLoading]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
