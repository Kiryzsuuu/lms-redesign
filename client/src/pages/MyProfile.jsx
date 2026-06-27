import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input, Label } from '../components/ui';
import { PageSpinner } from '../components/PageSpinner';
import { DsPage } from '../components/ds';
import { useAuth } from '../lib/auth';
import { ConfirmDialog } from '../components/ConfirmDialog';

const TABS = [
  { key: 'profile', label: 'Informasi Pribadi' },
  { key: 'courses', label: 'Riwayat Courses' },
  { key: 'certificates', label: 'Sertifikat' },
  { key: 'testimonial', label: 'Testimoni' },
];

function cleanCourseHtml(html) {
  let s = String(html || '');
  if (!s) return '';
  s = s.replace(/<li>\s*<p>\s*(?:<br\s*\/?\s*>)\s*<\/p>\s*<\/li>/gi, '');
  s = s.replace(/<li>\s*<p>\s*<\/p>\s*<\/li>/gi, '');
  s = s.replace(/<li>\s*(?:<br\s*\/?\s*>)\s*<\/li>/gi, '');
  return s;
}

function snippet(text, max = 150) {
  const s = String(text || '').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '').trim() + '…';
}

const EDUCATION_LEVELS = ['SD/MI', 'SMP/MTs', 'SMA/SMK/MA', 'D3', 'S1', 'S2', 'S3'];
const REFERRAL_SOURCES = ['Media Sosial', 'Rekomendasi', 'Search Engine', 'Teman/Keluarga', 'Lainnya'];

export default function MyProfile() {
  const { api, user: authUser, role, logout } = useAuth();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState('profile'); // profile, courses, certificates, testimonial
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile data
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({});

  // Email update
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // Password update
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Course history
  const [courses, setCourses] = useState([]);

  // Testimonial
  const [myTestimonial, setMyTestimonial] = useState(null);
  const [testimonialLoaded, setTestimonialLoaded] = useState(false);
  const [testimonialText, setTestimonialText] = useState('');
  const [testimonialRole, setTestimonialRole] = useState('');
  const [testimonialError, setTestimonialError] = useState('');
  const [testimonialSuccess, setTestimonialSuccess] = useState('');
  const [testimonialLoading, setTestimonialLoading] = useState(false);

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Signature upload (teacher/admin)
  const [signatureUploading, setSignatureUploading] = useState(false);

  // Logout confirmation
  const [logoutOpen, setLogoutOpen] = useState(false);

  async function loadProfile() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setProfileData(res.data.user);
      setNewEmail(res.data.user.email);
      setError('');
    } catch (e) {
      const errMsg = e?.response?.data?.error?.message || 'Gagal memuat profil';
      setError(errMsg);
      console.error('Load profile error:', e);
    }
  }

  async function loadCourses() {
    try {
      const res = await api.get('/courses/my-courses');
      setCourses(res.data.courses || []);
    } catch (e) {
      console.log('Courses endpoint not available or error:', e?.response?.data?.error?.message);
    }
  }

  async function loadMyTestimonial() {
    try {
      const res = await api.get('/testimonials/my');
      const list = res.data.testimonials || [];
      const active = list.find((t) => t.status !== 'rejected') || list[0] || null;
      setMyTestimonial(active);
      if (active && active.status === 'pending') {
        setTestimonialText(active.text);
        setTestimonialRole(active.role || '');
      }
    } catch {
      setMyTestimonial(null);
    } finally {
      setTestimonialLoaded(true);
    }
  }

  async function submitTestimonial(e) {
    e.preventDefault();
    setTestimonialError('');
    setTestimonialSuccess('');
    setTestimonialLoading(true);
    try {
      const res = await api.post('/testimonials', { text: testimonialText, role: testimonialRole });
      setMyTestimonial(res.data.testimonial);
      setTestimonialSuccess('Testimoni berhasil dikirim! Akan tampil setelah disetujui admin.');
    } catch (err) {
      setTestimonialError(err?.response?.data?.error?.message || 'Gagal mengirim testimoni');
    } finally {
      setTestimonialLoading(false);
    }
  }

  async function withdrawTestimonial() {
    setTestimonialError('');
    setTestimonialLoading(true);
    try {
      await api.delete('/testimonials/my');
      setMyTestimonial(null);
      setTestimonialText('');
      setTestimonialRole('');
      setTestimonialSuccess('Testimoni berhasil dihapus. Kamu bisa mengirim ulang.');
    } catch (err) {
      setTestimonialError(err?.response?.data?.error?.message || 'Gagal menghapus');
    } finally {
      setTestimonialLoading(false);
    }
  }

  useEffect(() => {
    // Reset state when user identity changes (e.g. logout + login as different account)
    setUser(null);
    setProfileData({});
    setCourses([]);
    async function init() {
      setLoading(true);
      await loadProfile();
      await loadCourses();
      setLoading(false);
    }
    init();
    loadMyTestimonial();
  }, [authUser?._id]);

  async function saveProfile() {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updates = {
        fullName: profileData.fullName,
        institution: profileData.institution,
        whatsappNumber: profileData.whatsappNumber,
        referralSource: profileData.referralSource,
        reason: profileData.reason,
        educationLevel: profileData.educationLevel,
      };
      const res = await api.put('/auth/me', updates);
      setUser(res.data.user);
      setProfileData(res.data.user);
      setSuccess('Profil berhasil diperbarui');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal update profil');
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    setAvatarUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/uploads/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const avatarUrl = uploadRes.data.url;
      const res = await api.put('/auth/me', { avatarUrl });
      setUser(res.data.user);
      setSuccess('Foto profil berhasil diperbarui');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal upload foto');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function uploadSignature(file) {
    if (!file) return;
    setSignatureUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/uploads/signature', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const signatureUrl = uploadRes.data.url;
      const res = await api.put('/auth/me', { signatureUrl });
      setUser(res.data.user);
      setSuccess('Tanda tangan berhasil diperbarui');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal upload tanda tangan');
    } finally {
      setSignatureUploading(false);
    }
  }

  async function updateEmail() {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (!newEmail.trim()) throw new Error('Email tidak boleh kosong');
      const res = await api.post('/auth/email/request-otp', { newEmail });
      setEditingEmail(false);
      nav(`/otp?flow=email_change&email=${encodeURIComponent(newEmail)}`, {
        replace: true,
        state: { devOtp: res?.data?.devOtp || '' },
      });
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal mengirim OTP');
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword() {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (!passwordData.currentPassword.trim()) throw new Error('Password saat ini harus diisi');
      if (!passwordData.newPassword.trim()) throw new Error('Password baru harus diisi');
      if (passwordData.newPassword !== passwordData.confirmPassword) throw new Error('Password baru tidak cocok');
      if (passwordData.newPassword.length < 6) throw new Error('Password minimal 6 karakter');

      const res = await api.post('/auth/password/request-otp', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setEditingPassword(false);
      nav('/otp?flow=password_change', { replace: true, state: { devOtp: res?.data?.devOtp || '' } });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || 'Gagal mengirim OTP');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    nav('/', { replace: true });
  }

  function handleLogoutClick() {
    setLogoutOpen(true);
  }

  function confirmLogout() {
    setLogoutOpen(false);
    handleLogout();
  }

  if (loading) return <PageSpinner fullPage />;

  if (error || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="bg-rose-50 border border-rose-200 rounded p-6 max-w-md w-full">
          <h2 className="text-lg font-bold text-rose-900 mb-2">⚠️ Error</h2>
          <p className="text-sm text-rose-700 mb-4">{error || 'Gagal memuat profil. Silakan login ulang.'}</p>
          <a href="/login" className="text-sm text-rose-600 hover:text-rose-700 underline">Kembali ke Login</a>
        </div>
      </div>
    );
  }

  const purchasedCourses = courses.filter((c) => user.purchasedCourseIds?.includes(c._id));
  const completedCourses = courses.filter((c) => user.completedCourseIds?.includes(c._id));
  const activeCourse = user.activeCourseId ? courses.find((c) => c._id === user.activeCourseId) : null;

  return (
    <DsPage
      title="Profil Saya"
      subtitle="Kelola informasi pribadi, pantau course yang sedang dipelajari, dan akses sertifikat Anda."
    >
      <div className="ds-tabs">
        {TABS.map((t) => (
          <div
            key={t.key}
            className={`ds-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {error ? <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Avatar upload */}
              <Card className="p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="relative group">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-20 h-20 rounded-full object-cover"
                        style={{ border: '3px solid #E5E7EB' }}
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #0C628D, #0FADA8)' }}
                      >
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.45)' }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadAvatar(e.target.files?.[0])}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{user?.fullName || user?.name}</div>
                    <div className="text-sm text-slate-500 capitalize">{user?.role}</div>
                    <label
                      htmlFor="avatar-upload"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-[8px] transition-colors"
                      style={{ background: '#EBF6FC', color: '#0C628D' }}
                    >
                      {avatarUploading ? 'Mengupload...' : 'Ganti Foto'}
                    </label>
                  </div>
                </div>
              </Card>

              {/* Signature upload — only for teacher/admin */}
              {(role === 'teacher' || role === 'admin') && (
                <Card className="p-5 border border-slate-200 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900 mb-3">Tanda Tangan Instruktur</h2>
                  <p className="text-xs text-slate-500 mb-4">Tanda tangan ini akan muncul di sertifikat course yang Anda ampu.</p>
                  <div className="flex items-center gap-5">
                    <div className="flex-shrink-0">
                      {user?.signatureUrl ? (
                        <img
                          src={user.signatureUrl}
                          alt="Tanda Tangan"
                          className="h-16 max-w-[160px] object-contain border border-slate-200 rounded-lg bg-white p-1"
                        />
                      ) : (
                        <div
                          className="h-16 w-40 flex items-center justify-center rounded-lg border border-dashed border-slate-300"
                          style={{ background: '#F8FAFC', color: '#94A3B8', fontSize: '0.78rem' }}
                        >
                          Belum ada tanda tangan
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="signature-upload"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-[8px] transition-colors"
                        style={{ background: '#EBF6FC', color: '#0C628D' }}
                      >
                        {signatureUploading ? 'Mengupload...' : user?.signatureUrl ? 'Ganti Tanda Tangan' : 'Upload Tanda Tangan'}
                      </label>
                      <input
                        id="signature-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadSignature(e.target.files?.[0])}
                      />
                      <p className="text-xs text-slate-400 mt-2">PNG/JPG transparan, maks 5MB</p>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Informasi Dasar */}
                  <Card className="p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Informasi Dasar</h2>
                    <div className="mt-4 space-y-4 text-sm">
                      <div className="pb-3 border-b border-slate-100">
                        <span className="text-slate-600 text-xs uppercase tracking-wider">Username</span>
                        <p className="font-semibold text-slate-900 mt-1">{user.name}</p>
                      </div>
                      <div className="pb-3 border-b border-slate-100">
                        <span className="text-slate-600 text-xs uppercase tracking-wider">Role</span>
                        <p className="font-semibold text-slate-900 mt-1 capitalize">{user.role}</p>
                      </div>
                      <div>
                        <span className="text-slate-600 text-xs uppercase tracking-wider">Bergabung</span>
                        <p className="font-semibold text-slate-900 mt-1">{new Date(user.createdAt).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Profil Pribadi */}
                  <Card className="p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h2 className="text-lg font-bold text-slate-900">Profil Pribadi</h2>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Nama Lengkap</Label>
                        <Input
                          value={profileData.fullName || ''}
                          onChange={(e) => setProfileData((p) => ({ ...p, fullName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Asal Lembaga/Instansi</Label>
                        <Input
                          value={profileData.institution || ''}
                          onChange={(e) => setProfileData((p) => ({ ...p, institution: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>No WhatsApp</Label>
                        <Input
                          value={profileData.whatsappNumber || ''}
                          onChange={(e) => setProfileData((p) => ({ ...p, whatsappNumber: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Dari mana tahunya tentang kami?</Label>
                        <select
                          value={profileData.referralSource || ''}
                          onChange={(e) => setProfileData((p) => ({ ...p, referralSource: e.target.value }))}
                          className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-[#0C628D]"
                        >
                          <option value="">Pilih sumber</option>
                          {REFERRAL_SOURCES.map((src) => (
                            <option key={src} value={src}>
                              {src}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Alasan</Label>
                        <textarea
                          value={profileData.reason || ''}
                          onChange={(e) => setProfileData((p) => ({ ...p, reason: e.target.value }))}
                          className="w-full border border-slate-200 px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-[#0C628D]"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Pendidikan Terakhir</Label>
                        <select
                          value={profileData.educationLevel || ''}
                          onChange={(e) => setProfileData((p) => ({ ...p, educationLevel: e.target.value }))}
                          className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-[#0C628D]"
                        >
                          <option value="">Pilih tingkat pendidikan</option>
                          {EDUCATION_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={saveProfile}
                          disabled={loading}
                          className="bg-[#0C628D] text-white hover:bg-[#0A527A]"
                        >
                          {loading ? 'Menyimpan...' : 'Simpan Profil'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Email Management */}
                  <Card className="p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h2 className="text-lg font-bold text-slate-900">Update Email</h2>
                      {!editingEmail && (
                        <Button
                          variant="outline"
                          onClick={() => setEditingEmail(true)}
                          className="shrink-0 text-sm"
                        >
                          Ubah
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <Label>Email Saat Ini</Label>
                        <Input value={user.email} disabled className="bg-slate-100 text-slate-600" />
                      </div>
                      <div>
                        <Label>Email Baru</Label>
                        <Input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          disabled={!editingEmail}
                          placeholder="email@baru.com"
                          className={!editingEmail ? "bg-slate-100 text-slate-600" : ""}
                        />
                      </div>
                      {editingEmail && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={updateEmail}
                            disabled={loading}
                            className="bg-[#0C628D] text-white hover:bg-[#0A527A]"
                          >
                            Simpan
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingEmail(false);
                              setNewEmail(user.email);
                            }}
                          >
                            Batal
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Password Management */}
                  <Card className="p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h2 className="text-lg font-bold text-slate-900">Update Password</h2>
                      {!editingPassword && (
                        <Button
                          variant="outline"
                          onClick={() => setEditingPassword(true)}
                          className="shrink-0 text-sm"
                        >
                          Ubah
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <Label>Password Saat Ini</Label>
                        <Input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))
                          }
                          disabled={!editingPassword}
                          placeholder="Password saat ini"
                          className={!editingPassword ? "bg-slate-100 text-slate-600" : ""}
                        />
                      </div>
                      <div>
                        <Label>Password Baru</Label>
                        <Input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData((p) => ({ ...p, newPassword: e.target.value }))
                          }
                          disabled={!editingPassword}
                          placeholder="Password baru (minimal 6 karakter)"
                          className={!editingPassword ? "bg-slate-100 text-slate-600" : ""}
                        />
                      </div>
                      <div>
                        <Label>Konfirmasi Password Baru</Label>
                        <Input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))
                          }
                          disabled={!editingPassword}
                          placeholder="Konfirmasi password baru"
                          className={!editingPassword ? "bg-slate-100 text-slate-600" : ""}
                        />
                      </div>
                      {editingPassword && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={updatePassword}
                            disabled={loading}
                            className="bg-[#0C628D] text-white hover:bg-[#0A527A]"
                          >
                            Simpan
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingPassword(false);
                              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            }}
                          >
                            Batal
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Logout Button di bawah */}
              <div className="pt-6 mt-2 border-t border-slate-200 flex lg:justify-end">
                <Button
                  onClick={handleLogoutClick}
                  className="w-full sm:w-auto bg-rose-600 text-white hover:bg-rose-700 shadow-md hover:shadow-lg transition-all font-semibold"
                >
                  Logout
                </Button>
              </div>

              {/* Logout Confirmation Dialog */}
              <ConfirmDialog
                open={logoutOpen}
                title="Logout?"
                message="Apakah Anda yakin ingin logout dari akun ini?"
                confirmText="Ya, Keluar"
                cancelText="Batal"
                confirmVariant="primary"
                onCancel={() => setLogoutOpen(false)}
                onConfirm={confirmLogout}
              />
            </div>
          )}

          {/* Courses Tab */}
          {activeTab === 'courses' && (
            <div className="space-y-4 max-w-3xl">
              {/* Sedang dikerjakan */}
              {activeCourse && (
                <Card className="p-6 border-l-4 border-l-orange-500">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-bold text-slate-900">Sedang Dikerjakan</h3>
                    <Link to={`/courses/${activeCourse._id}`}>
                      <Button variant="outline" size="sm">Lanjutkan</Button>
                    </Link>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700">{activeCourse.title}</h4>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                      {snippet(activeCourse?.description?.replace(/<[^>]*>/g, '') || 'Tidak ada deskripsi', 150)}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
                      <span>📚 Materi: {activeCourse.lessons?.length || 0} pelajaran</span>
                      {activeCourse.quizCount > 0 && <span>📝 Quiz: {activeCourse.quizCount} soal</span>}
                    </div>
                  </div>
                </Card>
              )}

              {/* Riwayat Courses - Selesai */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3">
                  Course yang Selesai <span className="text-sm text-slate-600">({completedCourses.length})</span>
                </h3>
                {completedCourses.length > 0 ? (
                  <div className="grid gap-3">
                    {completedCourses.map((c) => (
                      <Card key={c._id} className="p-4 border border-slate-200 border-l-4 border-l-green-500">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">✓ {c.title}</h4>
                            <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                              {snippet(c?.description?.replace(/<[^>]*>/g, '') || 'Tidak ada deskripsi', 120)}
                            </p>
                          </div>
                          <span className="text-xs font-medium bg-green-100 text-green-900 px-2 py-1 rounded whitespace-nowrap">
                            Selesai
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Belum ada course yang diselesaikan.</p>
                )}
              </div>
            </div>
          )}

          {/* Testimonial Tab */}
          {activeTab === 'testimonial' && (
            <div className="max-w-xl space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">Bagikan Pengalaman Belajarmu</h3>
              <p className="text-sm text-slate-500">Testimonimu akan tampil di halaman utama setelah disetujui admin.</p>

              {testimonialError && (
                <div className="rounded-[10px] p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700">{testimonialError}</div>
              )}
              {testimonialSuccess && (
                <div className="rounded-[10px] p-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700">{testimonialSuccess}</div>
              )}

              {/* Status badge */}
              {myTestimonial && (
                <div className="rounded-[14px] p-4 border" style={{
                  background: myTestimonial.status === 'approved' ? '#E0F5F5' : myTestimonial.status === 'rejected' ? '#FFF1F2' : '#FEF9E7',
                  borderColor: myTestimonial.status === 'approved' ? '#0FADA8' : myTestimonial.status === 'rejected' ? '#FDA4AF' : '#FDE68A',
                }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{
                      color: myTestimonial.status === 'approved' ? '#0a7a76' : myTestimonial.status === 'rejected' ? '#be123c' : '#92400e',
                    }}>
                      {myTestimonial.status === 'approved' ? '✓ Disetujui & tampil di homepage' : myTestimonial.status === 'rejected' ? '✗ Ditolak' : '⏳ Menunggu persetujuan admin'}
                    </span>
                    {myTestimonial.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={withdrawTestimonial}
                        disabled={testimonialLoading}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Tarik
                      </button>
                    )}
                  </div>
                  <p className="text-sm italic text-slate-700">"{myTestimonial.text}"</p>
                  {myTestimonial.role && <p className="text-xs text-slate-500 mt-1">{myTestimonial.role}</p>}
                  {myTestimonial.status === 'rejected' && (
                    <p className="text-xs text-rose-600 mt-2">Kamu dapat mengirim ulang setelah menarik testimoni ini.</p>
                  )}
                </div>
              )}

              {/* Form — only show if no pending/approved testimonial */}
              {testimonialLoaded && !myTestimonial && (
                <form onSubmit={submitTestimonial} className="space-y-4">
                  <div>
                    <Label className="block mb-1">Ceritakan pengalamanmu belajar di sini *</Label>
                    <textarea
                      value={testimonialText}
                      onChange={(e) => setTestimonialText(e.target.value)}
                      placeholder='Contoh: "Gaji naik 2× setelah selesaikan kursus Data Science..."'
                      rows={4}
                      maxLength={500}
                      required
                      className="w-full border border-gray-200 rounded-[10px] px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none"
                      style={{ focusRingColor: '#0C628D' }}
                    />
                    <div className="text-right text-xs text-gray-400 mt-1">{testimonialText.length}/500</div>
                  </div>
                  <div>
                    <Label className="block mb-1">Profesi / Instansi (opsional)</Label>
                    <Input
                      value={testimonialRole}
                      onChange={(e) => setTestimonialRole(e.target.value)}
                      placeholder='Contoh: Data Analyst · Traveloka'
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-400 mt-1">Ini yang akan tampil di bawah namamu</p>
                  </div>
                  <button
                    type="submit"
                    disabled={testimonialLoading || !testimonialText.trim()}
                    className="font-semibold text-sm text-white px-6 py-2.5 rounded-[10px] transition-all disabled:opacity-50"
                    style={{ background: '#0C628D' }}
                    onMouseEnter={(e) => { if (!testimonialLoading) e.currentTarget.style.background = '#0A527A'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#0C628D'; }}
                  >
                    {testimonialLoading ? 'Mengirim...' : 'Kirim Testimoni'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div className="space-y-4 max-w-3xl">
              <div>
                <h3 className="font-bold text-slate-900 mb-3">
                  Sertifikat yang Diperoleh <span className="text-sm text-slate-600">({completedCourses.length})</span>
                </h3>
                {completedCourses.length > 0 ? (
                  <div className="grid gap-3">
                    {completedCourses.map((c) => (
                      <Card key={c._id} className="p-4 border border-slate-200 border-l-4 border-l-green-500">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-slate-900">✓ {c.title}</h4>
                            <p className="mt-1 text-sm text-slate-600">Selesai 100%</p>
                          </div>
                          <Link to={`/certificate/${c._id}`}>
                            <Button variant="outline" className="shrink-0 text-xs">
                              Lihat Sertifikat
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Belum ada sertifikat. Selesaikan course untuk mendapatkan sertifikat!</p>
                )}
              </div>
            </div>
          )}
    </DsPage>
  );
}
