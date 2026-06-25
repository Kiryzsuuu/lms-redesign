import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function PageLoader() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const hideTimer = useRef(null);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    clearTimeout(hideTimer.current);
    setVisible(true);

    hideTimer.current = setTimeout(() => setVisible(false), 600);

    return () => clearTimeout(hideTimer.current);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'ep-fade-in 0.12s ease',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <img
          src="/logo-color.png"
          alt="Edulyfe"
          style={{
            height: 48, width: 'auto', objectFit: 'contain',
            animation: 'ep-heartbeat 0.9s ease-in-out infinite',
            transformOrigin: 'center',
          }}
          onError={e => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'flex';
          }}
        />
        {/* Fallback teks jika logo gagal load */}
        <div style={{
          display: 'none', fontSize: 22, fontWeight: 800, color: '#1B3A5C',
          animation: 'ep-heartbeat 0.9s ease-in-out infinite',
        }}>
          <span style={{ color: '#0C628D' }}>Edu</span>lyfe
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#0C628D',
              animation: `ep-dot 1s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ep-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ep-heartbeat {
          0%   { transform: scale(1); }
          14%  { transform: scale(1.18); }
          28%  { transform: scale(1); }
          42%  { transform: scale(1.1); }
          56%  { transform: scale(1); }
          100% { transform: scale(1); }
        }
        @keyframes ep-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
