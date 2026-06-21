import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function RequireAuth({ children, roles }) {
  const { isAuthed, role, token, authLoading } = useAuth();
  const location = useLocation();

  // Prevent hard-refresh "bounce" to /login while restoring user from stored token.
  if (authLoading && token && !isAuthed) {
    return <div className="p-6 text-sm text-slate-600">Memuat...</div>;
  }

  if (!isAuthed) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && roles.length > 0 && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}
