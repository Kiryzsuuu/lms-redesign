import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, Container, Input, Label } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function ResetPassword() {
  const { api } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const q = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  const [email, setEmail] = useState(q.get('email') || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const devOtp = loc?.state?.devOtp || '';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    try {
      await api.post('/auth/reset-password', { email, code, newPassword });
      setStatus('Password berhasil direset. Silakan login.');
      setTimeout(() => nav('/login'), 700);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Reset password gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-10">
      <Container className="max-w-lg">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-600">Masukkan OTP dan password baru.</p>

          {error ? <div className="mt-4 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          {status ? <div className="mt-4 bg-emerald-50 p-3 text-sm text-emerald-700">{status}</div> : null}

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <div>
              <Label>Email</Label>
              <div className="mt-1">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <Label>OTP</Label>
              <div className="mt-1">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="kode OTP dari email" />
              </div>
            </div>
            <div>
              <Label>Password baru</Label>
              <div className="mt-1">
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>

            <Button disabled={loading} type="submit" className="w-full">
              {loading ? 'Memproses...' : 'Reset password'}
            </Button>
          </form>

          {devOtp ? (
            <div className="mt-6 bg-slate-50 p-4 text-xs text-slate-700">
              <div className="font-semibold">Dev OTP (SMTP belum dikonfigurasi):</div>
              <div className="mt-1 font-mono text-slate-900">{devOtp}</div>
            </div>
          ) : null}

          <div className="mt-4 text-sm text-slate-600">
            Kembali ke{' '}
            <Link to="/login" className="font-semibold text-slate-900 hover:underline">
              Login
            </Link>
          </div>
        </Card>
      </Container>
    </section>
  );
}
