import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Container, Input, Label } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { api, isAuthed, setToken } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const nextPath = location.state?.from?.pathname || '/dashboard';

  if (isAuthed) return <Navigate to={nextPath} replace />;

  // Langkah 1: email + password -> server kirim OTP ke email
  async function submitCredentials(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.requiresOtp) {
        setStep('otp');
        setInfo('Kode OTP telah dikirim ke email Anda. Berlaku 10 menit.');
        if (res.data.devOtp) setDevOtp(String(res.data.devOtp));
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  // Langkah 2: verifikasi OTP -> dapat token
  async function submitOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login/verify-otp', { email, code });
      setToken(res.data.token);
      nav(nextPath, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'OTP salah atau kedaluwarsa');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login/resend-otp', { email });
      setInfo('Kode OTP baru telah dikirim ke email Anda.');
      if (res.data.devOtp) setDevOtp(String(res.data.devOtp));
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Gagal mengirim ulang OTP');
    } finally {
      setLoading(false);
    }
  }

  const btnStyle = { background: '#0C628D', boxShadow: '0 1px 2px rgba(12,98,141,.3),inset 0 1px 0 rgba(255,255,255,.08)' };
  const btnEnter = (e) => { if (!loading) { e.currentTarget.style.background = '#0A527A'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(12,98,141,.4)'; } };
  const btnLeave = (e) => { e.currentTarget.style.background = '#0C628D'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(12,98,141,.3),inset 0 1px 0 rgba(255,255,255,.08)'; };

  return (
    <div className="min-h-screen flex items-center justify-center py-14 px-4" style={{ background: '#F7F8FA' }}>
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-color.png" alt="Edulyfe" className="h-[40px] w-auto object-contain" />
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[20px] p-8"
          style={{ border: '1px solid #E5E7EB', boxShadow: '0 20px 25px rgba(0,0,0,.08), 0 8px 10px rgba(0,0,0,.04)' }}
        >
          <h1 className="font-display font-extrabold text-2xl tracking-tight text-gray-900 mb-1">
            {step === 'credentials' ? 'Masuk' : 'Verifikasi OTP'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {step === 'credentials'
              ? 'Masuk untuk mengakses kursus dan materi pembelajaran.'
              : `Masukkan 6 digit kode yang kami kirim ke ${email}.`}
          </p>

          {error && (
            <div className="mb-5 rounded-[10px] p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-5 rounded-[10px] p-3 text-sm bg-sky-50 border border-sky-200 text-sky-700">
              {info}
              {devOtp && <span className="block mt-1 font-mono font-bold">DEV OTP: {devOtp}</span>}
            </div>
          )}

          {step === 'credentials' ? (
            <form className="grid gap-4" onSubmit={submitCredentials}>
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
                style={btnStyle}
                onMouseEnter={btnEnter}
                onMouseLeave={btnLeave}
              >
                {loading ? 'Memproses...' : 'Kirim Kode OTP'}
              </button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={submitOtp}>
              <div>
                <Label className="block mb-1">Kode OTP</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  autoFocus
                  style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.1rem' }}
                />
              </div>

              <button
                disabled={loading || code.length < 4}
                type="submit"
                className="w-full font-semibold rounded-[10px] py-3 text-[0.9rem] text-white transition-all duration-200 mt-1 disabled:opacity-50"
                style={btnStyle}
                onMouseEnter={btnEnter}
                onMouseLeave={btnLeave}
              >
                {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
              </button>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setCode(''); setError(''); setInfo(''); setDevOtp(''); }}
                  className="font-semibold"
                  style={{ color: '#0C628D' }}
                >
                  ← Ganti email
                </button>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={loading}
                  className="font-semibold disabled:opacity-50"
                  style={{ color: '#0C628D' }}
                >
                  Kirim ulang OTP
                </button>
              </div>
            </form>
          )}

          {step === 'credentials' && (
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
          )}
        </div>
      </div>
    </div>
  );
}
