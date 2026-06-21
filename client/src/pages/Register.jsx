import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Input, Label } from '../components/ui';
import { useAuth } from '../lib/auth';

const EDUCATION_LEVELS = [
  'SD/MI', 'SMP/MTs', 'SMA/SMK/MA', 'D3', 'S1', 'S2', 'S3'
];

const REFERRAL_SOURCES = [
  'Media Sosial', 'Rekomendasi', 'Search Engine', 'Teman/Keluarga', 'Lainnya'
];

const SELECT_CLASS = [
  'w-full rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900',
  'focus:outline-none focus:border-[#0C628D] focus:ring-2 focus:ring-[rgba(12,98,141,.15)]',
  'transition-colors duration-150',
].join(' ');

const TEXTAREA_CLASS = [
  'w-full rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900',
  'placeholder:text-gray-400 font-[inherit]',
  'focus:outline-none focus:border-[#0C628D] focus:ring-2 focus:ring-[rgba(12,98,141,.15)]',
  'transition-colors duration-150',
].join(' ');

export default function Register() {
  const { api, setToken } = useAuth();
  const nav = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    fullName: '',
    email: '',
    password: '',
    whatsappNumber: '',
    institution: '',
    referralSource: '',
    reason: '',
    educationLevel: '',
    referralCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!formData.name.trim()) throw new Error('Username harus diisi');
      if (!formData.fullName.trim()) throw new Error('Nama Lengkap harus diisi');
      if (!/^[a-zA-Z\s.'-]{2,}$/.test(formData.fullName.trim()))
        throw new Error('Nama Lengkap hanya boleh berisi huruf dan spasi (bukan email/password)');
      if (formData.fullName.trim().split(/\s+/).length < 2)
        throw new Error('Nama Lengkap harus terdiri dari minimal 2 kata');
      if (!formData.email.trim()) throw new Error('Email harus diisi');
      if (!formData.password.trim()) throw new Error('Password harus diisi');

      const res = await api.post('/auth/register', formData);
      if (res?.data?.requiresOtp) {
        nav(`/otp?flow=register&email=${encodeURIComponent(res.data.email || formData.email)}`, {
          replace: true,
          state: { devOtp: res?.data?.devOtp || '' },
        });
        return;
      }
      setToken(res.data.token);
      nav('/courses', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Register gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-14 px-4" style={{ background: '#F7F8FA' }}>
      <div className="w-full max-w-[600px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-color.png" alt="Inspira Innovation" className="h-[40px] w-auto object-contain" />
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[20px] p-8"
          style={{ border: '1px solid #E5E7EB', boxShadow: '0 20px 25px rgba(0,0,0,.08), 0 8px 10px rgba(0,0,0,.04)' }}
        >
          <h1 className="font-display font-extrabold text-2xl tracking-tight text-gray-900 mb-1">Daftar Akun Baru</h1>
          <p className="text-sm text-gray-500 mb-6">Isi form berikut untuk membuat akun. Akun baru otomatis role: student.</p>

          {error && (
            <div className="mb-5 rounded-[10px] p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <form className="grid gap-4" onSubmit={submit}>
            {/* Username & Password */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="username" className="block mb-1">Username</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Username"
                />
              </div>
              <div>
                <Label htmlFor="password" className="block mb-1">Password</Label>
                <Input
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Minimal 6 karakter"
                />
              </div>
            </div>

            <div>
              <Label className="block mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
                <span className="ml-1 text-gray-400 font-normal normal-case tracking-normal">(untuk keperluan sertifikat)</span>
              </Label>
              <Input
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Nama lengkap Anda"
              />
            </div>

            <div>
              <Label className="block mb-1">
                Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label className="block mb-1">Asal Lembaga / Instansi</Label>
              <Input
                value={formData.institution}
                onChange={(e) => handleChange('institution', e.target.value)}
                placeholder="Nama sekolah, universitas, atau perusahaan"
              />
            </div>

            <div>
              <Label className="block mb-1">
                No WhatsApp <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.whatsappNumber}
                onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                placeholder="62812345678"
              />
            </div>

            <div>
              <Label className="block mb-1">Dari mana mengetahui kami?</Label>
              <select
                value={formData.referralSource}
                onChange={(e) => handleChange('referralSource', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Pilih sumber</option>
                {REFERRAL_SOURCES.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="block mb-1">Alasan bergabung</Label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                placeholder="Ceritakan motivasi Anda mengikuti program ini"
                className={TEXTAREA_CLASS}
                rows={3}
              />
            </div>

            <div>
              <Label className="block mb-1">Pendidikan Terakhir</Label>
              <select
                value={formData.educationLevel}
                onChange={(e) => handleChange('educationLevel', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Pilih tingkat pendidikan</option>
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="block mb-1">
                Kode Referral
                <span className="ml-1 text-gray-400 font-normal normal-case tracking-normal">(opsional)</span>
              </Label>
              <Input
                value={formData.referralCode}
                onChange={(e) => handleChange('referralCode', e.target.value.toUpperCase())}
                placeholder="Masukkan kode dari pengajar (jika ada)"
                maxLength={16}
              />
              <p className="mt-1 text-xs text-gray-400">Dapatkan potongan 5% untuk pembelian course pertama Anda.</p>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full font-semibold rounded-[10px] py-3 text-[0.9rem] text-white transition-all duration-200 mt-1 disabled:opacity-50"
              style={{ background: '#0C628D', boxShadow: '0 1px 2px rgba(12,98,141,.3),inset 0 1px 0 rgba(255,255,255,.08)' }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#0A527A'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(12,98,141,.4)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0C628D'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(12,98,141,.3),inset 0 1px 0 rgba(255,255,255,.08)'; }}
            >
              {loading ? 'Membuat Akun...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="mt-5 text-sm text-gray-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold" style={{ color: '#0C628D' }}>
              Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
