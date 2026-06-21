import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Container, Input, Label } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function ForgotPassword() {
  const { api } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    setDevOtp('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setStatus('Jika email terdaftar, OTP reset password akan dikirim.');
      if (res?.data?.devOtp) setDevOtp(res.data.devOtp);
      nav(`/reset-password?email=${encodeURIComponent(email)}`, { replace: true, state: { devOtp: res?.data?.devOtp || '' } });
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Gagal memproses permintaan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-10">
      <Container className="max-w-lg">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Lupa Password</h1>
          <p className="mt-1 text-sm text-slate-600">Masukkan email untuk menerima OTP reset password.</p>

          {error ? <div className="mt-4 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          {status ? <div className="mt-4 bg-emerald-50 p-3 text-sm text-emerald-700">{status}</div> : null}

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <div>
              <Label>Email</Label>
              <div className="mt-1">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>

            <Button disabled={loading} type="submit" className="w-full">
              {loading ? 'Mengirim...' : 'Kirim OTP reset'}
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
