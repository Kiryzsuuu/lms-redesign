import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function RequireAuth({ children, roles }) {
  const { isAuthed, role, token, authLoading } = useAuth();
  const location = useLocation();

  // Prevent hard-refresh "bounce" to /login while restoring user from stored token.
  if (authLoading && token && !isAuthed) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#F5F6F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 9999 }}>
        <img
          src="/logo-color.png"
          alt="EduPoint"
          style={{ height: 52, width: 'auto', objectFit: 'contain', animation: 'ep-heartbeat 0.9s ease-in-out infinite' }}
          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
        />
        <div style={{ display: 'none', fontSize: 22, fontWeight: 800, color: '#1B3A5C', animation: 'ep-heartbeat 0.9s ease-in-out infinite' }}>
          <span style={{ color: '#0C628D' }}>Edu</span>Point
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#0C628D', animation: `ep-dot 1s ease-in-out ${i * 0.18}s infinite` }} />
          ))}
        </div>
        <style>{`
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

  if (!isAuthed) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && roles.length > 0 && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}
