import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DsPage, DsStat, DsCard, DsSectionHdr, DsCourseCard, DsEmpty } from '../components/ds';

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

function AdminDashboard({ api, user, stats }) {
  const navigate = useNavigate();
  const [recentContracts, setRecentContracts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingRoyalties, setPendingRoyalties] = useState([]);

  useEffect(() => {
    api.get('/contracts?status=sent&limit=3').catch(() => ({ data: { contracts: [] } }))
      .then(r => setRecentContracts((r.data.contracts || []).slice(0, 3)));
    api.get('/audit-logs?limit=5').catch(() => ({ data: { logs: [] } }))
      .then(r => setRecentActivity(r.data.logs || []));
    api.get('/royalties?status=pending&limit=3').catch(() => ({ data: { royalties: [] } }))
      .then(r => setPendingRoyalties(r.data.royalties || []));
  }, [api]);

  const dotColors = { create: '#0C628D', update: '#0FADA8', delete: '#B91C1C', upload: '#15803D', payment: '#F3921B' };

  const menuItems = [
    { to: '/dashboard/courses',    icon: 'ti-book-2',        label: 'Kelola Kursus',    color: '#0C628D', bg: '#EBF5FF' },
    { to: '/dashboard/contracts',  icon: 'ti-file-contract', label: 'Kontrak',          color: '#B45309', bg: '#FEF3C7', badge: stats.pendingContracts },
    { to: '/dashboard/users',      icon: 'ti-users',         label: 'Pengguna',         color: '#7C3AED', bg: '#F5F3FF' },
    { to: '/dashboard/royalties',  icon: 'ti-coin',          label: 'Royalti',          color: '#B45309', bg: '#FEF9C3' },
    { to: '/dashboard/accounting', icon: 'ti-chart-bar',     label: 'Pembukuan',        color: '#15803D', bg: '#DCFCE7' },
    { to: '/dashboard/coupons',    icon: 'ti-tag',           label: 'Kupon Diskon',     color: '#0FADA8', bg: '#CCFBF1' },
    { to: '/dashboard/categories', icon: 'ti-category',      label: 'Kategori',         color: '#6B7280', bg: '#F3F4F6' },
    { to: '/dashboard/heroes',     icon: 'ti-photo',         label: 'Hero Carousel',    color: '#EC4899', bg: '#FCE7F3' },
    { to: '/dashboard/testimonials',icon:'ti-message-star',  label: 'Testimoni',        color: '#F59E0B', bg: '#FEF3C7' },
    { to: '/dashboard/about',      icon: 'ti-info-circle',   label: 'Tentang Kami',     color: '#6B7280', bg: '#F3F4F6' },
    { to: '/dashboard/site-settings',icon:'ti-settings',     label: 'Pengaturan Situs', color: '#374151', bg: '#F9FAFB' },
    { to: '/dashboard/activity-log',icon:'ti-history',       label: 'Log Aktivitas',    color: '#6B7280', bg: '#F3F4F6' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: '20px 20px 32px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Selamat datang, {user?.name?.split(' ')[0]} 👋</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Ringkasan platform hari ini</div>
        </div>

        {/* Alert */}
        {stats.pendingContracts > 0 && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '11px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: '#B45309', flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#92400E' }}>
              {stats.pendingContracts} kontrak menunggu respons teacher
            </div>
            <button onClick={() => navigate('/dashboard/contracts')} style={{ padding: '4px 12px', border: 'none', borderRadius: 7, background: '#B45309', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Tinjau
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="dash-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EBF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-book-2" style={{ fontSize: 18, color: '#0C628D' }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0C628D', lineHeight: 1 }}>{stats.courses}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Total Kursus</div>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: stats.pendingContracts > 0 ? '#FEF3C7' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-file-contract" style={{ fontSize: 18, color: stats.pendingContracts > 0 ? '#B45309' : '#9CA3AF' }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: stats.pendingContracts > 0 ? '#B45309' : '#111827', lineHeight: 1 }}>{stats.pendingContracts}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Kontrak Pending</div>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 18, color: '#15803D' }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#15803D', lineHeight: 1 }}>Aktif</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Status Sistem</div>
            </div>
          </div>
        </div>

        {/* Menu akses cepat */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Akses Cepat</div>
        <div className="dash-menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          {menuItems.map(item => (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              <div
                style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = `0 2px 8px ${item.color}22`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 15, color: item.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                    {item.badge > 0 && (
                      <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: '#FEF3C7', color: '#B45309' }}>{item.badge}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom 2-col: kontrak + aktivitas */}
        <div className="dash-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Kontrak pending */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Kontrak Pending</div>
              <Link to="/dashboard/contracts" style={{ fontSize: 11, color: '#0C628D', textDecoration: 'none', fontWeight: 500 }}>Lihat semua</Link>
            </div>
            {recentContracts.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                <i className="ti ti-circle-check" style={{ fontSize: 24, display: 'block', marginBottom: 6, color: '#15803D' }} />
                Tidak ada kontrak pending
              </div>
            ) : recentContracts.map((c, i) => (
              <div key={c._id} style={{ padding: '11px 16px', borderBottom: i < recentContracts.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1B3A5C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {(c.companyName || '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.courseId?.title || 'Kursus'}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>{c.companyName} · {fmtDate(c.createdAt)}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FEF3C7', color: '#B45309', whiteSpace: 'nowrap' }}>Menunggu</span>
              </div>
            ))}

            {/* Royalti pending */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: recentContracts.length === 0 ? 0 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Royalti Pending</div>
              <Link to="/dashboard/royalties" style={{ fontSize: 11, color: '#0C628D', textDecoration: 'none', fontWeight: 500 }}>Bayar semua</Link>
            </div>
            {pendingRoyalties.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                <i className="ti ti-circle-check" style={{ fontSize: 20, display: 'block', marginBottom: 4, color: '#15803D' }} />
                Tidak ada royalti pending
              </div>
            ) : pendingRoyalties.map((r, i) => {
              const ini = (r.teacherId?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={r._id} style={{ padding: '10px 16px', borderBottom: i < pendingRoyalties.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1B3A5C', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{r.teacherId?.name || 'Teacher'}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.courseId?.title || 'Kursus'}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>{r.amount ? `Rp ${r.amount.toLocaleString('id-ID')}` : '—'}</div>
                </div>
              );
            })}
          </div>

          {/* Aktivitas terbaru */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Aktivitas Terbaru</div>
              <Link to="/dashboard/activity-log" style={{ fontSize: 11, color: '#0C628D', textDecoration: 'none', fontWeight: 500 }}>Log lengkap</Link>
            </div>
            <div style={{ padding: '8px 16px' }}>
              {recentActivity.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>Belum ada aktivitas</div>
              ) : recentActivity.map((log, i) => {
                const color = dotColors[log.action] || '#9CA3AF';
                return (
                  <div key={log._id || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                        <strong style={{ color: '#111827' }}>{log.actorId?.name || 'User'}</strong>
                        {' '}<span style={{ color: color, fontWeight: 600 }}>{log.action}</span>{' '}{log.resource}
                        {log.resourceTitle && <span style={{ color: '#9CA3AF' }}> "{log.resourceTitle}"</span>}
                      </div>
                      <div style={{ fontSize: 10, color: '#D1D5DB', marginTop: 1 }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dash-menu-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .dash-stat-grid { grid-template-columns: 1fr !important; }
          .dash-menu-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function TeacherDashboard({ api, user, stats }) {
  const navigate = useNavigate();
  const [myCourses, setMyCourses] = useState([]);
  const [myContracts, setMyContracts] = useState([]);

  useEffect(() => {
    api.get('/courses/owned').catch(() => ({ data: { courses: [] } }))
      .then(r => setMyCourses((r.data.courses || []).slice(0, 3)));
    api.get('/contracts/mine').catch(() => ({ data: { contracts: [] } }))
      .then(r => setMyContracts((r.data.contracts || []).filter(c => c.status === 'sent').slice(0, 2)));
  }, [api]);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ padding: 22 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 3 }}>Dashboard</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 18 }}>
          Selamat datang, <strong style={{ color: '#4B5563' }}>{user?.name}</strong>.
          {stats.pendingContracts > 0 && ` Ada ${stats.pendingContracts} kontrak baru menunggu persetujuanmu.`}
        </div>

        {stats.pendingContracts > 0 && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-file-contract" style={{ fontSize: 18, color: '#B45309' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309' }}>{stats.pendingContracts} Kontrak Kerjasama Menunggu Persetujuan</div>
              <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>Kamu perlu menyetujui kontrak sebelum bisa mengisi materi kursus dari perusahaan mitra.</div>
            </div>
            <button onClick={() => navigate('/dashboard/contracts')} style={{ padding: '6px 14px', background: '#0C628D', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              Tinjau Kontrak
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard label="Kursus Aktif" value={stats.courses} sub="Kursus yang kamu ampu" color="#0C628D" />
          <StatCard label="Kontrak Pending" value={stats.pendingContracts} sub="Perlu persetujuan" color={stats.pendingContracts > 0 ? '#B45309' : '#111827'} />
          <StatCard label="Status" value="Aktif" sub="Akun berjalan normal" color="#15803D" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Left: My Courses */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Kursus Saya</div>
              <Link to="/dashboard/courses" style={{ fontSize: 11, color: '#0C628D', textDecoration: 'none' }}>Semua</Link>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              {myCourses.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                  <i className="ti ti-book-2" style={{ fontSize: 20, display: 'block', marginBottom: 6 }} />
                  Belum ada kursus
                </div>
              ) : myCourses.map((c, i) => (
                <div key={c._id} style={{ padding: '12px 14px', borderBottom: i < myCourses.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 36, borderRadius: 8, background: '#1B3A5C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-book-2" style={{ fontSize: 16, color: 'rgba(255,255,255,.6)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: c.isPublished ? '#DCFCE7' : '#F3F4F6', color: c.isPublished ? '#15803D' : '#9CA3AF' }}>
                      {c.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <Link to="/dashboard/courses" style={{ padding: '3px 9px', background: '#0C628D', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Edit
                  </Link>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <NavCard to="/dashboard/question-bank" icon="ti-database" label="Bank Soal" desc="Kelola soal" />
              <NavCard to="/dashboard/student-progress" icon="ti-users" label="Monitor Siswa" desc="Progress belajar" />
              <NavCard to="/dashboard/royalties" icon="ti-coin" label="Royalti" desc="Pendapatan kursus" />
              <NavCard to="/dashboard/activity-log" icon="ti-history" label="Log Aktivitas" desc="Riwayat perubahan" />
            </div>
          </div>

          {/* Right: Contracts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Kontrak Terbaru</div>
              <Link to="/dashboard/contracts" style={{ fontSize: 11, color: '#0C628D', textDecoration: 'none' }}>Lihat semua</Link>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
              {myContracts.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 20, display: 'block', marginBottom: 6, color: '#15803D' }} />
                  Tidak ada kontrak pending
                </div>
              ) : myContracts.map((c, i) => (
                <div key={c._id} style={{ padding: '12px 14px', borderBottom: i < myContracts.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#0C628D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {(c.companyName || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.courseId?.title || 'Kursus'}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{c.companyName} · Diterima {fmtDate(c.createdAt)}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FEF3C7', color: '#B45309', whiteSpace: 'nowrap' }}>Menunggu</span>
                </div>
              ))}
            </div>

            {/* How contracts work */}
            <div style={{ background: '#EBF5FF', border: '1px solid #BEE3F8', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0C628D', marginBottom: 10 }}>Alur Kerjasama</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                {[
                  { n: '1', color: '#0C628D', label: 'Admin Buat', desc: 'Admin buat kursus & kontrak dari perusahaan mitra' },
                  { n: '2', color: '#F3921B', label: 'Kamu Terima', desc: 'Notifikasi masuk, baca isi kontrak' },
                  { n: '3', color: '#B45309', label: 'Setuju', desc: 'Tanda tangan digital — kursus terbuka' },
                  { n: '4', color: '#15803D', label: 'Isi Materi', desc: 'Upload konten, royalti tercatat' },
                ].map((step, i) => (
                  <div key={step.n} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: step.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>{step.n}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#111827' }}>{step.label}</div>
                      <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, lineHeight: 1.3 }}>{step.desc}</div>
                    </div>
                    {i < 3 && <div style={{ padding: '0 2px', marginBottom: 20 }}><i className="ti ti-arrow-right" style={{ fontSize: 11, color: '#D1D5DB' }} /></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function courseProgress(c) {
  const total = (c.modules || []).reduce((s, m) => s + (m.lessons || []).length, 0);
  const done = (c.modules || []).reduce((s, m) => s + (m.lessons || []).filter(l => l.completed).length, 0);
  if (c.progressPercent != null) return Math.round(c.progressPercent);
  return total ? Math.round((done / total) * 100) : 0;
}

function priceLabel(c) {
  if (!c.priceIdr || c.priceIdr === 0) return { text: 'Gratis', kind: 'free' };
  return { text: `Rp ${Number(c.priceIdr).toLocaleString('id-ID')}`, kind: 'paid' };
}

function StudentDashboard({ user, stats, student }) {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const enrolled = student.myCourses || [];
  const active = enrolled[0];
  const recommended = (student.catalog || []).filter(c => !enrolled.some(e => String(e._id) === String(c._id))).slice(0, 4);

  return (
    <DsPage>
      <div className="ds-page-head">
        <div className="ds-h1">Selamat datang kembali, {user?.name?.split(' ')[0] || 'Pelajar'} 👋</div>
        <div className="ds-sub">{today}</div>
      </div>

      <div className="ds-stat-grid">
        <DsStat label="Kursus Diikuti" value={enrolled.length} sub="Total kursus aktif" color="#0C628D" />
        <DsStat label="Progres Rata-rata" value={`${student.avgProgress || 0}%`} progress={student.avgProgress || 0} sub={`${enrolled.length} kursus`} color="#0C628D" />
        <DsStat label="Sertifikat" value={student.certificates || 0} sub={student.certificates ? 'Selamat!' : 'Selesaikan kursus dulu'} color="#0FADA8" />
        <DsStat label="Kursus di Katalog" value={stats.courses} sub="Tersedia untuk diikuti" color="#F3921B" />
      </div>

      <div className="ds-two-col">
        {/* LEFT */}
        <div>
          <DsSectionHdr title="Kursus Aktif" linkTo="/dashboard/my-courses" linkLabel="Semua" />
          {active ? (
            <Link to={`/courses/${active._id}`} style={{ textDecoration: 'none' }}>
              <div className="ds-card" style={{ marginBottom: 16, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: '#0f1929', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {active.coverImageUrl
                      ? <img src={active.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="ti ti-book" style={{ fontSize: 26, color: 'rgba(255,255,255,.3)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 3 }}>{active.title}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>{active.categoryId?.name || 'Kursus'}</div>
                    <div className="ds-prog-row">
                      <div className="ds-prog-bar"><div className="ds-prog-fill" style={{ width: `${courseProgress(active)}%` }} /></div>
                      <div className="ds-prog-pct">{courseProgress(active)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="ds-card" style={{ marginBottom: 16 }}>
              <DsEmpty icon="ti-book-off">Belum mengikuti kursus apa pun. Jelajahi katalog untuk mulai belajar!</DsEmpty>
            </div>
          )}

          {recommended.length > 0 && (
            <>
              <DsSectionHdr title="Kursus yang Mungkin Kamu Suka" linkTo="/dashboard/catalog" linkLabel="Lihat semua" />
              <div className="ds-c-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
                {recommended.map(c => (
                  <DsCourseCard
                    key={c._id}
                    to={`/courses/${c._id}`}
                    image={c.coverImageUrl}
                    icon="ti-book"
                    pill={priceLabel(c)}
                    title={c.title}
                    metaLeft={c.categoryId?.name || 'Kursus'}
                    metaRight={null}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div>
          <DsSectionHdr title="Akses Cepat" />
          <div className="ds-card">
            <div className="ds-res-item" onClick={() => { window.location.href = '/dashboard/my-courses'; }}>
              <div className="ds-res-icon"><i className="ti ti-book-2" /></div>
              <div className="ds-res-info"><div className="ds-res-name">Kursus Saya</div><div className="ds-res-meta">{enrolled.length} kursus aktif</div></div>
              <i className="ti ti-chevron-right" style={{ color: '#9CA3AF' }} />
            </div>
            <div className="ds-res-item" onClick={() => { window.location.href = '/dashboard/catalog'; }}>
              <div className="ds-res-icon"><i className="ti ti-compass" /></div>
              <div className="ds-res-info"><div className="ds-res-name">Katalog Kursus</div><div className="ds-res-meta">{stats.courses} kursus tersedia</div></div>
              <i className="ti ti-chevron-right" style={{ color: '#9CA3AF' }} />
            </div>
            <div className="ds-res-item" onClick={() => { window.location.href = '/dashboard/certificates'; }}>
              <div className="ds-res-icon"><i className="ti ti-certificate" /></div>
              <div className="ds-res-info"><div className="ds-res-name">Sertifikat</div><div className="ds-res-meta">{student.certificates || 0} diterbitkan</div></div>
              <i className="ti ti-chevron-right" style={{ color: '#9CA3AF' }} />
            </div>
            <div className="ds-res-item" style={{ marginBottom: 0 }} onClick={() => { window.location.href = '/my-profile'; }}>
              <div className="ds-res-icon"><i className="ti ti-user-circle" /></div>
              <div className="ds-res-info"><div className="ds-res-name">Profil Saya</div><div className="ds-res-meta">Kelola akun</div></div>
              <i className="ti ti-chevron-right" style={{ color: '#9CA3AF' }} />
            </div>
          </div>
        </div>
      </div>
    </DsPage>
  );
}

export default function Dashboard() {
  const { api, user, role } = useAuth();
  const [stats, setStats] = useState({ courses: 0, pendingContracts: 0 });
  const [student, setStudent] = useState({ myCourses: [], catalog: [], certificates: 0, avgProgress: 0 });

  useEffect(() => {
    if (!api) return;
    const load = async () => {
      try {
        const [coursesRes] = await Promise.allSettled([api.get('/courses')]);
        const catalog = coursesRes.status === 'fulfilled' ? (coursesRes.value.data.courses || []) : [];

        let pendingContracts = 0;
        if (role === 'admin') {
          const r = await api.get('/contracts?status=sent').catch(() => ({ data: { contracts: [] } }));
          pendingContracts = (r.data.contracts || []).length;
        } else if (role === 'teacher') {
          const r = await api.get('/contracts/mine').catch(() => ({ data: { contracts: [] } }));
          pendingContracts = (r.data.contracts || []).filter(c => c.status === 'sent').length;
        } else {
          // student
          const [mineRes, certRes] = await Promise.allSettled([
            api.get('/courses/my-courses'),
            api.get('/certificates/my-certificates'),
          ]);
          const myCourses = mineRes.status === 'fulfilled' ? (mineRes.value.data.courses || []) : [];
          const certificates = certRes.status === 'fulfilled' ? (certRes.value.data.certificates || []).length : 0;
          const avgProgress = myCourses.length
            ? Math.round(myCourses.reduce((s, c) => s + courseProgress(c), 0) / myCourses.length)
            : 0;
          setStudent({ myCourses, catalog, certificates, avgProgress });
        }

        setStats({ courses: catalog.length, pendingContracts });
      } catch {}
    };
    load();
  }, [api, role]);

  if (role === 'admin') return <AdminDashboard api={api} user={user} stats={stats} />;
  if (role === 'teacher') return <TeacherDashboard api={api} user={user} stats={stats} />;
  return <StudentDashboard user={user} stats={stats} student={student} />;
}
