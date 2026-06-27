import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, Container, Input, Label } from '../components/ui';
import { useAuth } from '../lib/auth';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function OtpVerify() {
  const { api, setToken, refreshUser, token } = useAuth();
  const nav = useNavigate();
  const q = useQuery();

  const flow = q.get('flow') || '';
  const email = q.get('email') || '';

  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    try {
      if (!flow) throw new Error('Flow OTP tidak valid');
      if (!code.trim()) throw new Error('Kode OTP harus diisi');

      if (flow === 'register') {
        if (!email) throw new Error('Email tidak ditemukan');
        const res = await api.post('/auth/register/verify-otp', { email, code });
        setToken(res.data.token);
        nav('/courses', { replace: true });
        return;
      }

      if (flow === 'email_change') {
        if (!token) throw new Error('Silakan login terlebih dahulu');
        if (!email) throw new Error('Email baru tidak ditemukan');
        const res = await api.post('/auth/email/verify-otp', { newEmail: email, code });
        setToken(res.data.token);
        await refreshUser();
        nav('/dashboard/profile', { replace: true });
        return;
      }

      if (flow === 'password_change') {
        if (!token) throw new Error('Silakan login terlebih dahulu');
        await api.post('/auth/password/verify-otp', { code });
        setStatus('Password berhasil diperbarui');
        setTimeout(() => nav('/dashboard/profile', { replace: true }), 700);
        return;
      }

      throw new Error('Flow OTP tidak didukung');
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Verifikasi OTP gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="py-10">
      <Container className="max-w-lg">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Verifikasi OTP</h1>
          <p className="mt-1 text-sm text-slate-600">
            Masukkan kode OTP yang dikirim ke email{email ? `: ${email}` : ''}.
          </p>

          {error ? <div className="mt-4 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          {status ? <div className="mt-4 bg-emerald-50 p-3 text-sm text-emerald-700">{status}</div> : null}

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <div>
              <Label>Kode OTP</Label>
              <div className="mt-1">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="contoh: 123456" />
              </div>
            </div>

            <Button disabled={loading} type="submit" className="w-full">
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </Button>
          </form>

          <div className="mt-4 text-sm text-slate-600">
            <Link to="/login" className="font-semibold text-slate-900 hover:underline">
              Kembali ke Login
            </Link>
          </div>
        </Card>
      </Container>
    </section>
  );
}
