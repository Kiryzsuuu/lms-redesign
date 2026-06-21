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

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AdminDashboard({ api, user, stats, pendingContracts }) {
  const navigate = useNavigate();
  const [recentContracts, setRecentContracts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingRoyalties, setPendingRoyalties] = useState([]);

  useEffect(() => {
    api.get('/contracts?status=sent&limit=3').catch(() => ({ data: { contracts: [] } }))
      .then(r => setRecentContracts((r.data.contracts || []).slice(0, 3)));

    api.get('/audit-logs?limit=4').catch(() => ({ data: { logs: [] } }))
      .then(r => setRecentActivity(r.data.logs || []));

    api.get('/royalties?status=pending&limit=3').catch(() => ({ data: { royalties: [] } }))
      .then(r => setPendingRoyalties(r.data.royalties || []));
  }, [api]);

  const dotColors = { create: '#0C628D', update: '#0FADA8', delete: '#B91C1C', upload: '#15803D', payment: '#F3921B' };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: 22 }}>
        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 3 }}>Dashboard Admin</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 18 }}>
          Ringkasan platform dan hal-hal yang butuh perhatian hari ini
        </div>

        {/* Alert */}
        {stats.pendingContracts > 0 && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: '#B45309', flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#B45309' }}>
              {stats.pendingContracts} kontrak menunggu respons teacher
            </div>
            <button onClick={() => navigate('/dashboard/contracts')} style={{ padding: '5px 12px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: '#4B5563', fontFamily: 'inherit' }}>
              Tinjau →
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Kursus" value={stats.courses} sub="Di platform" color="#0C628D" />
          <StatCard label="Kontrak Pending" value={stats.pendingContracts} sub="Menunggu teacher" color={stats.pendingContracts > 0 ? '#B45309' : '#111827'} />
          <StatCard label="Status Sistem" value="Aktif" sub="Semua layanan berjalan" color="#15803D" />
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Left column */}
          <div>
            {/* Recent contracts needing action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Kontrak Perlu Tindakan</div>
              <Link to="/dashboard/contracts" style={{ fontSize: 11, color: '#0C628D', textDecoration: 'none' }}>Semua kontrak →</Link>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {recentContracts.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 20, display: 'block', marginBottom: 6, color: '#15803D' }} />
                  Tidak ada kontrak pending
                </div>
              ) : recentContracts.map((c, i) => (
                <div key={c._id} style={{ padding: '11px 14px', borderBottom: i < recentContracts.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: '#0C628D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(c.companyName || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.courseId?.title || 'Kursus tidak diketahui'}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{c.companyName} · Dikirim {fmtDate(c.createdAt)}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FEF3C7', color: '#B45309', whiteSpace: 'nowrap' }}>
                    <i className="ti ti-clock" style={{ fontSize: 9 }} /> Menunggu
                  </span>
                </div>
              ))}
            </div>

            {/* Admin quick links */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Administrasi Platform</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NavCard to="/dashboard/users" icon="ti-users" label="Kelola Pengguna" desc="Atur role & royalti" />
              <NavCard to="/dashboard/accounting" icon="ti-chart-bar" label="Pembukuan" desc="Laporan keuangan" />
              <NavCard to="/dashboard/coupons" icon="ti-tag" label="Kupon Diskon" desc="Buat kode diskon" />
              <NavCard to="/dashboard/testimonials" icon="ti-message-star" label="Testimoni" desc="Moderasi ulasan" />
              <NavCard to="/dashboard/heroes" icon="ti-photo" label="Hero Carousel" desc="Kelola slide" />
              <NavCard to="/dashboard/site-settings" icon="ti-settings" label="Pengaturan Situs" desc="Config platform" />
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Pending royalties */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Royalti Perlu Dibayar</div>
              <Link to="/dashboard/royalties" style={{ fontSize: 11, color: '#0C628D', textDecoration: 'none' }}>Bayar semua →</Link>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {pendingRoyalties.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 20, display: 'block', marginBottom: 6, color: '#15803D' }} />
                  Tidak ada royalti pending
                </div>
              ) : pendingRoyalties.map((r, i) => {
                const initials = (r.teacherId?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={r._id} style={{ padding: '10px 14px', borderBottom: i < pendingRoyalties.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1B3A5C', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{r.teacherId?.name || 'Teacher'}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{r.courseId?.title || 'Kursus'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>
                        {r.amount ? `Rp ${r.amount.toLocaleString('id-ID')}` : '—'}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: '#FEF3C7', color: '#B45309' }}>Pending</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent activity */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Aktivitas Terbaru</div>
              <Link to="/dashboard/activity-log" style={{ fontSize: 11, color: '#0C628D', textDecoration: 'none' }}>Log lengkap →</Link>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
              {recentActivity.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '10px 0' }}>Belum ada aktivitas</div>
              ) : recentActivity.map((log, i) => {
                const color = dotColors[log.action] || '#9CA3AF';
                return (
                  <div key={log._id || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: i < recentActivity.length - 1 ? 10 : 0, marginBottom: i < recentActivity.length - 1 ? 10 : 0, borderBottom: i < recentActivity.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.4 }}>
                        <strong style={{ color: '#111827' }}>{log.actorId?.name || 'User'}</strong> {log.action} {log.resource}
                        {log.resourceTitle && <span style={{ color: '#9CA3AF' }}> — {log.resourceTitle}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Content management */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10, marginTop: 16 }}>Manajemen Konten</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NavCard to="/dashboard/courses" icon="ti-book-2" label="Kelola Kursus" desc="Buat & edit kursus" />
              <NavCard to="/dashboard/contracts" icon="ti-file-contract" label="Kontrak" desc="Kelola kontrak" badge={stats.pendingContracts} />
              <NavCard to="/dashboard/categories" icon="ti-category" label="Kategori" desc="Kelola kategori" />
              <NavCard to="/dashboard/royalties" icon="ti-coin" label="Royalti" desc="Pembayaran royalti" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherDashboard({ api, user, stats }) {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: 22 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 3 }}>Dashboard Instruktur</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 18 }}>
          Halo, <strong style={{ color: '#4B5563' }}>{user?.name}</strong> — pantau kursus, kontrak, dan royalti Anda
        </div>

        {stats.pendingContracts > 0 && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: '#B45309', flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#B45309' }}>
              {stats.pendingContracts} kontrak menunggu persetujuan Anda
            </div>
            <button onClick={() => navigate('/dashboard/contracts')} style={{ padding: '5px 12px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: '#4B5563', fontFamily: 'inherit' }}>
              Tinjau →
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 22 }}>
          <StatCard label="Kursus Aktif" value={stats.courses} sub="Kursus yang Anda ampu" color="#0C628D" />
          <StatCard label="Kontrak Pending" value={stats.pendingContracts} sub="Perlu persetujuan" color={stats.pendingContracts > 0 ? '#B45309' : '#111827'} />
          <StatCard label="Status" value="Aktif" sub="Akun berjalan normal" color="#15803D" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <NavCard to="/dashboard/contracts" icon="ti-file-contract" label="Kontrak Kerjasama" desc="Baca dan setujui kontrak" badge={stats.pendingContracts} />
          <NavCard to="/dashboard/courses" icon="ti-book-2" label="Kelola Kursus" desc="Buat dan edit materi kursus" />
          <NavCard to="/dashboard/question-bank" icon="ti-database" label="Bank Soal" desc="Kelola soal dan import/export" />
          <NavCard to="/dashboard/student-progress" icon="ti-users" label="Monitor Siswa" desc="Pantau progress belajar siswa" />
          <NavCard to="/dashboard/royalties" icon="ti-coin" label="Royalti" desc="Lihat pendapatan dari kursus" />
          <NavCard to="/dashboard/activity-log" icon="ti-history" label="Log Aktivitas" desc="Riwayat semua perubahan" />
        </div>
      </div>
    </div>
  );
}

function StudentDashboard({ user, stats }) {
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: 22 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 3 }}>Dashboard</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 18 }}>
          Halo, <strong style={{ color: '#4B5563' }}>{user?.name}</strong> — selamat belajar!
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 22 }}>
          <StatCard label="Kursus Tersedia" value={stats.courses} sub="Total kursus publik" color="#0C628D" />
          <StatCard label="Kursus Diikuti" value="0" sub="Beli dari katalog" />
          <StatCard label="Sertifikat" value="0" sub="Selesaikan kursus dulu" color="#0FADA8" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <NavCard to="/courses" icon="ti-compass" label="Jelajahi Kursus" desc="Lihat semua kursus yang tersedia" />
          <NavCard to="/my-profile" icon="ti-user-circle" label="Profil Saya" desc="Kelola akun dan preferensi" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { api, user, role } = useAuth();
  const [stats, setStats] = useState({ courses: 0, pendingContracts: 0 });

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

        setStats({ courses: courseCount, pendingContracts });
      } catch {}
    };
    load();
  }, [api, role]);

  if (role === 'admin') return <AdminDashboard api={api} user={user} stats={stats} pendingContracts={stats.pendingContracts} />;
  if (role === 'teacher') return <TeacherDashboard api={api} user={user} stats={stats} />;
  return <StudentDashboard user={user} stats={stats} />;
}
