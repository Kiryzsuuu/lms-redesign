import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Container, Input, Label } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { api, isAuthed, setToken } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const nextPath = location.state?.from?.pathname || '/courses';

  if (isAuthed) return <Navigate to={nextPath} replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setToken(res.data.token);
      nav(nextPath, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-14 px-4" style={{ background: '#F7F8FA' }}>
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-color.png" alt="Inspira Innovation" className="h-[40px] w-auto object-contain" />
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[20px] p-8"
          style={{ border: '1px solid #E5E7EB', boxShadow: '0 20px 25px rgba(0,0,0,.08), 0 8px 10px rgba(0,0,0,.04)' }}
        >
          <h1 className="font-display font-extrabold text-2xl tracking-tight text-gray-900 mb-1">Masuk</h1>
          <p className="text-sm text-gray-500 mb-6">Masuk untuk mengakses kursus dan materi pembelajaran.</p>

          {error && (
            <div className="mb-5 rounded-[10px] p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <form className="grid gap-4" onSubmit={submit}>
            <div>
              <Label className="block mb-1">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="block mb-1">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full font-semibold rounded-[10px] py-3 text-[0.9rem] text-white transition-all duration-200 mt-1 disabled:opacity-50"
              style={{ background: '#0C628D', boxShadow: '0 1px 2px rgba(12,98,141,.3),inset 0 1px 0 rgba(255,255,255,.08)' }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#0A527A'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(12,98,141,.4)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0C628D'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(12,98,141,.3),inset 0 1px 0 rgba(255,255,255,.08)'; }}
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-sm text-gray-500">
            <span>
              Belum punya akun?{' '}
              <Link to="/register" className="font-semibold" style={{ color: '#0C628D' }}>
                Daftar Gratis
              </Link>
            </span>
            <span>
              Lupa password?{' '}
              <Link to="/forgot-password" className="font-semibold" style={{ color: '#0C628D' }}>
                Reset di sini
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
