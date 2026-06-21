import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, marginBottom: 3, color: color || '#111827' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{sub}</div>}
    </div>
  );
}

function NavCard({ to, icon, label, desc, badge }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0C628D'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(12,98,141,.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EBF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 15, color: '#0C628D' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {label}
            {badge > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: 'rgba(243,146,27,.2)', color: '#B45309' }}>{badge}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>{desc}</div>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { api, user, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ courses: 0, users: 0, pendingContracts: 0, pendingRoyalties: 0 });

  useEffect(() => {
    if (!api) return;
    const load = async () => {
      try {
        const [coursesRes] = await Promise.allSettled([api.get('/courses')]);
        const courseCount = coursesRes.status === 'fulfilled' ? (coursesRes.value.data.courses || []).length : 0;

        let pendingContracts = 0;
        if (role === 'admin') {
          const r = await api.get('/contracts?status=sent').catch(() => ({ data: { contracts: [] } }));
          pendingContracts = (r.data.contracts || []).length;
        } else if (role === 'teacher') {
          const r = await api.get('/contracts/mine').catch(() => ({ data: { contracts: [] } }));
          pendingContracts = (r.data.contracts || []).filter(c => c.status === 'sent').length;
        }

        setStats(s => ({ ...s, courses: courseCount, pendingContracts }));
      } catch {}
    };
    load();
  }, [api, role]);

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';

  const fmt = n => (typeof n === 'number' ? n.toLocaleString('id-ID') : n);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
    <div style={{ padding: 22, maxWidth: 1100 }}>
      {/* Page title */}
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
        {isAdmin ? 'Dashboard Admin' : isTeacher ? 'Dashboard Instruktur' : 'Dashboard'}
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 18 }}>
        Selamat datang kembali, <strong style={{ color: '#4B5563' }}>{user?.name}</strong>
        {isAdmin && ' — ringkasan platform dan hal-hal yang butuh perhatian hari ini'}
        {isTeacher && ' — pantau kursus, kontrak, dan royalti Anda'}
      </div>

      {/* Alert banner for pending items */}
      {stats.pendingContracts > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: '#B45309', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#B45309' }}>
            {stats.pendingContracts} kontrak menunggu {isAdmin ? 'respons teacher' : 'persetujuan Anda'}
          </div>
          <button
            onClick={() => navigate('/dashboard/contracts')}
            style={{ padding: '5px 12px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: '#4B5563', fontFamily: 'inherit' }}
          >
            Tinjau →
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 22 }}>
        {(isAdmin || isTeacher) ? (
          <>
            <StatCard label="Total Kursus" value={fmt(stats.courses)} sub="Di platform" color="#0C628D" />
            <StatCard label="Kontrak Pending" value={fmt(stats.pendingContracts)} sub={isAdmin ? 'Belum respons teacher' : 'Menunggu persetujuan'} color={stats.pendingContracts > 0 ? '#B45309' : '#111827'} />
            <StatCard label="Status Sistem" value="Aktif" sub="Semua layanan berjalan" color="#15803D" />
          </>
        ) : (
          <>
            <StatCard label="Kursus Tersedia" value={fmt(stats.courses)} sub="Total kursus publik" color="#0C628D" />
            <StatCard label="Kursus Diikuti" value="0" sub="Beli dari katalog" />
            <StatCard label="Sertifikat" value="0" sub="Selesaikan kursus dulu" color="#0FADA8" />
          </>
        )}
      </div>

      {/* Quick navigation */}
      {(isAdmin || isTeacher) && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Manajemen Konten</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 22 }}>
            {isTeacher && <NavCard to="/dashboard/contracts" icon="ti-file-contract" label="Kontrak Kerjasama" desc="Baca dan setujui kontrak" badge={stats.pendingContracts} />}
            <NavCard to="/dashboard/courses" icon="ti-book-2" label="Kelola Kursus" desc="Buat dan edit materi kursus" />
            <NavCard to="/dashboard/question-bank" icon="ti-database" label="Bank Soal" desc="Kelola soal dan import/export" />
            <NavCard to="/dashboard/student-progress" icon="ti-users" label="Monitor Siswa" desc="Pantau progress belajar siswa" />
            <NavCard to="/dashboard/royalties" icon="ti-coin" label="Royalti" desc="Lihat pendapatan dari kursus" />
            <NavCard to="/dashboard/activity-log" icon="ti-history" label="Log Aktivitas" desc="Riwayat semua perubahan" />
          </div>
        </>
      )}

      {isAdmin && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Administrasi Platform</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 22 }}>
            <NavCard to="/dashboard/contracts" icon="ti-file-contract" label="Kontrak Kerjasama" desc="Buat dan kelola kontrak teacher" badge={stats.pendingContracts} />
            <NavCard to="/dashboard/users" icon="ti-users" label="Kelola Pengguna" desc="Atur role, royalti, dan referral" />
            <NavCard to="/dashboard/categories" icon="ti-category" label="Kategori" desc="Kelola kategori kursus" />
            <NavCard to="/dashboard/accounting" icon="ti-chart-bar" label="Pembukuan" desc="Laporan keuangan dan transaksi" />
            <NavCard to="/dashboard/coupons" icon="ti-tag" label="Kupon Diskon" desc="Buat dan kelola kode diskon" />
            <NavCard to="/dashboard/testimonials" icon="ti-message-star" label="Testimoni" desc="Moderasi ulasan dari siswa" />
            <NavCard to="/dashboard/heroes" icon="ti-photo" label="Hero Carousel" desc="Kelola slide halaman utama" />
            <NavCard to="/dashboard/site-settings" icon="ti-settings" label="Pengaturan Situs" desc="Midtrans, SMTP, konten halaman" />
            <NavCard to="/dashboard/about" icon="ti-info-circle" label="Tentang Kami" desc="Edit halaman About" />
          </div>
        </>
      )}

      {!isAdmin && !isTeacher && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          <NavCard to="/courses" icon="ti-compass" label="Jelajahi Kursus" desc="Lihat semua kursus yang tersedia" />
          <NavCard to="/my-profile" icon="ti-user-circle" label="Profil Saya" desc="Kelola akun dan preferensi" />
        </div>
      )}
    </div>
    </div>
  );
}
