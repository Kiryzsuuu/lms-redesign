import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || 'var(--gray-900)' }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function QuickLink({ to, icon, label, desc }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        className="panel"
        style={{ cursor: 'pointer', transition: '.15s', display: 'flex', gap: 12, alignItems: 'flex-start' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16, color: 'var(--blue)' }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', lineHeight: 1.4 }}>{desc}</div>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { api, user, role } = useAuth();
  const nav = useNavigate();
  const [courseCount, setCourseCount] = useState(0);
  const [pendingContracts, setPendingContracts] = useState(0);

  useEffect(() => {
    api.get('/courses').then(r => setCourseCount((r.data.courses || []).length)).catch(() => {});

    if (role === 'teacher') {
      api.get('/contracts/mine').then(r => {
        const pending = (r.data.contracts || []).filter(c => c.status === 'sent').length;
        setPendingContracts(pending);
      }).catch(() => {});
    }

    if (role === 'admin') {
      api.get('/contracts?status=sent').then(r => {
        setPendingContracts((r.data.contracts || []).length);
      }).catch(() => {});
    }
  }, [api, role]);

  const getRoleLabel = () => {
    if (role === 'admin') return 'Administrator';
    if (role === 'teacher') return 'Instruktur';
    return 'Peserta Didik';
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Welcome Banner */}
      <div style={{ background: 'var(--sidebar-bg)', padding: '28px 0', marginBottom: 0 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Dashboard</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Halo, {user?.name}!</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Selamat datang di InspiraLearn</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pendingContracts > 0 && (
              <button
                onClick={() => nav(role === 'admin' ? '/dashboard/contracts' : '/dashboard/contracts')}
                style={{ background: 'rgba(243,146,27,.25)', border: '1px solid rgba(243,146,27,.4)', borderRadius: 'var(--r-md)', padding: '6px 12px', color: '#FBBF6A', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="ti ti-file-contract" style={{ fontSize: 14 }} />
                {pendingContracts} kontrak menunggu
              </button>
            )}
            <div style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 'var(--r-md)', padding: '5px 12px', color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: 600 }}>
              {getRoleLabel()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {role === 'student' ? (
            <>
              <StatCard label="Kursus Tersedia" value={courseCount} sub="Total kursus publik" color="var(--blue)" />
              <StatCard label="Kursus Diikuti" value="0" sub="Beli dari katalog" />
              <StatCard label="Sertifikat" value="0" sub="Selesaikan kursus dulu" color="var(--teal)" />
            </>
          ) : role === 'teacher' ? (
            <>
              <StatCard label="Kontrak Aktif" value={courseCount} sub="Kursus yang kamu ampu" color="var(--blue)" />
              <StatCard label="Kontrak Pending" value={pendingContracts} sub="Perlu persetujuanmu" color={pendingContracts > 0 ? 'var(--orange)' : 'var(--gray-900)'} />
              <StatCard label="Status Sistem" value="Aktif" sub="Semua layanan berjalan" color="var(--green)" />
            </>
          ) : (
            <>
              <StatCard label="Total Kursus" value={courseCount} sub="Kursus di platform" color="var(--blue)" />
              <StatCard label="Kontrak Pending" value={pendingContracts} sub="Teacher belum merespons" color={pendingContracts > 0 ? 'var(--orange)' : 'var(--gray-900)'} />
              <StatCard label="Status Sistem" value="Aktif" sub="Semua layanan berjalan" color="var(--green)" />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>Akses Cepat</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
          <QuickLink to="/courses" icon="ti-compass" label="Jelajahi Kursus" desc="Lihat semua kursus yang tersedia" />
          <QuickLink to="/my-profile" icon="ti-user-circle" label="Profil Saya" desc="Kelola akun dan preferensi" />
        </div>

        {(role === 'admin' || role === 'teacher') && (
          <>
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>Manajemen Konten</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {role === 'teacher' && (
                <QuickLink to="/dashboard/contracts" icon="ti-file-contract" label="Kontrak Kerjasama" desc="Baca dan setujui kontrak dari perusahaan" />
              )}
              <QuickLink to="/dashboard/courses" icon="ti-book-2" label="Kelola Kursus" desc="Buat, edit, dan kelola materi kursus" />
              <QuickLink to="/dashboard/question-bank" icon="ti-database" label="Bank Soal" desc="Kelola soal dan import/export" />
              <QuickLink to="/dashboard/student-progress" icon="ti-users" label="Monitor Siswa" desc="Pantau progress belajar siswa" />
              <QuickLink to="/dashboard/royalties" icon="ti-coin" label="Royalti" desc="Lihat pendapatan dari kursus" />
              <QuickLink to="/dashboard/activity-log" icon="ti-history" label="Log Aktivitas" desc="Riwayat semua perubahan konten" />
            </div>
          </>
        )}

        {role === 'admin' && (
          <>
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>Administrasi Platform</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <QuickLink to="/dashboard/contracts" icon="ti-file-contract" label="Kontrak Kerjasama" desc="Buat dan kelola kontrak dengan teacher" />
              <QuickLink to="/dashboard/users" icon="ti-users" label="Kelola Pengguna" desc="Atur role, royalti, dan referral" />
              <QuickLink to="/dashboard/categories" icon="ti-category" label="Kategori" desc="Kelola kategori kursus" />
              <QuickLink to="/dashboard/accounting" icon="ti-chart-bar" label="Pembukuan" desc="Laporan keuangan dan transaksi" />
              <QuickLink to="/dashboard/coupons" icon="ti-tag" label="Kupon Diskon" desc="Buat dan kelola kode diskon" />
              <QuickLink to="/dashboard/testimonials" icon="ti-message-star" label="Testimoni" desc="Moderasi ulasan dari siswa" />
              <QuickLink to="/dashboard/heroes" icon="ti-photo" label="Hero Carousel" desc="Kelola slide halaman utama" />
              <QuickLink to="/dashboard/site-settings" icon="ti-settings" label="Pengaturan Situs" desc="Midtrans, SMTP, konten halaman" />
              <QuickLink to="/dashboard/about" icon="ti-info-circle" label="Tentang Kami" desc="Edit halaman About dan instruktur" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
