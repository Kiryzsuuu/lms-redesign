import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const ADMIN_NAV = [
  {
    section: 'Utama',
    items: [
      { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    ],
  },
  {
    section: 'Kursus & Kontrak',
    items: [
      { to: '/dashboard/courses', icon: 'ti-book-2', label: 'Kelola Kursus' },
      { to: '/dashboard/contracts', icon: 'ti-file-contract', label: 'Kontrak Kerjasama', badgeKey: 'contracts' },
      { to: '/dashboard/course-templates', icon: 'ti-template', label: 'Template Outline' },
      { to: '/dashboard/categories', icon: 'ti-category', label: 'Kategori' },
    ],
  },
  {
    section: 'Pengguna',
    items: [
      { to: '/dashboard/users', icon: 'ti-users', label: 'Kelola Pengguna' },
      { to: '/dashboard/royalties', icon: 'ti-coin', label: 'Royalti Teacher', badgeKey: 'royalties' },
      { to: '/dashboard/coupons', icon: 'ti-tag', label: 'Kupon Diskon' },
    ],
  },
  {
    section: 'Keuangan & Laporan',
    items: [
      { to: '/dashboard/accounting', icon: 'ti-chart-bar', label: 'Pembukuan' },
      { to: '/dashboard/activity-log', icon: 'ti-history', label: 'Log Aktivitas' },
    ],
  },
  {
    section: 'Konten & Tampilan',
    items: [
      { to: '/dashboard/heroes', icon: 'ti-photo', label: 'Hero Carousel' },
      { to: '/dashboard/testimonials', icon: 'ti-message-star', label: 'Testimoni', badgeKey: 'testimonials' },
      { to: '/dashboard/about', icon: 'ti-info-circle', label: 'Tentang Kami' },
      { to: '/dashboard/site-settings', icon: 'ti-settings', label: 'Pengaturan Situs' },
    ],
  },
];

const TEACHER_NAV = [
  {
    section: 'Utama',
    items: [
      { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
    ],
  },
  {
    section: 'Kursus',
    items: [
      { to: '/dashboard/courses', icon: 'ti-book-2', label: 'Kelola Kursus' },
      { to: '/dashboard/question-bank', icon: 'ti-database', label: 'Bank Soal' },
      { to: '/dashboard/student-progress', icon: 'ti-users', label: 'Monitor Siswa' },
    ],
  },
  {
    section: 'Kontrak & Royalti',
    items: [
      { to: '/dashboard/contracts', icon: 'ti-file-contract', label: 'Kontrak Kerjasama', badgeKey: 'contracts' },
      { to: '/dashboard/royalties', icon: 'ti-coin', label: 'Royalti' },
      { to: '/dashboard/activity-log', icon: 'ti-history', label: 'Log Aktivitas' },
    ],
  },
];

const STUDENT_NAV = [
  {
    section: 'Utama',
    items: [
      { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
      { to: '/dashboard/my-courses', icon: 'ti-book-2', label: 'Kursus Saya' },
      { to: '/dashboard/catalog', icon: 'ti-compass', label: 'Katalog Kursus' },
    ],
  },
  {
    section: 'Belajar',
    items: [
      { to: '/dashboard/progress', icon: 'ti-chart-bar', label: 'Nilai & Progress' },
      { to: '/dashboard/assignments', icon: 'ti-checklist', label: 'Tugas' },
      { to: '/dashboard/discussion', icon: 'ti-message-circle', label: 'Diskusi' },
      { to: '/dashboard/certificates', icon: 'ti-certificate', label: 'Sertifikat' },
    ],
  },
  {
    section: 'Akun',
    items: [
      { to: '/my-profile', icon: 'ti-user-circle', label: 'Profil Saya' },
      { to: '/dashboard/notifications', icon: 'ti-bell', label: 'Notifikasi' },
    ],
  },
];

function getBadgeColor(key) {
  if (key === 'contracts') return { bg: 'rgba(243,146,27,.3)', color: '#FBBF6A' };
  if (key === 'testimonials') return { bg: 'rgba(248,113,113,.25)', color: '#FCA5A5' };
  if (key === 'royalties') return { bg: 'rgba(243,146,27,.3)', color: '#FBBF6A' };
  return { bg: 'rgba(255,255,255,.15)', color: '#fff' };
}

export function DashboardLayout({ children }) {
  const { user, role, logout, api } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState({});

  useEffect(() => {
    if (!api) return;
    const loadBadges = async () => {
      const next = {};
      try {
        if (role === 'admin') {
          const r = await api.get('/contracts?status=sent');
          const count = (r.data.contracts || []).length;
          if (count > 0) next.contracts = count;
        } else if (role === 'teacher') {
          const r = await api.get('/contracts/mine');
          const count = (r.data.contracts || []).filter(c => c.status === 'sent').length;
          if (count > 0) next.contracts = count;
        }
      } catch {}
      setBadges(next);
    };
    loadBadges();
  }, [api, role]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navSections = role === 'admin' ? ADMIN_NAV : role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Instruktur' : 'Peserta';
  const roleTagStyle =
    role === 'admin'
      ? { bg: 'rgba(239,68,68,.3)', color: '#FCA5A5' }
      : role === 'teacher'
      ? { bg: 'rgba(243,146,27,.3)', color: '#FBBF6A' }
      : { bg: 'rgba(14,165,233,.3)', color: '#7DD3FC' };

  const SidebarContent = () => (
    <>
      {/* Logo — klik kembali ke beranda */}
      <Link
        to="/"
        style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid rgba(255,255,255,.1)', textDecoration: 'none', flexShrink: 0 }}
        title="Kembali ke Beranda"
      >
        <img
          src="/logo-putih.png"
          alt="EduPoint"
          style={{ height: 28, width: 'auto', objectFit: 'contain', maxWidth: 140 }}
          onError={e => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextSibling.style.display = 'flex';
          }}
        />
        <div style={{ display: 'none', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-school" style={{ color: '#fff', fontSize: 15 }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            <span style={{ color: '#7EC8F5' }}>Edu</span>Point
          </div>
        </div>
      </Link>

      {/* User */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{user?.name || 'Pengguna'}</div>
          <span style={{ fontSize: 9, background: roleTagStyle.bg, color: roleTagStyle.color, padding: '1px 6px', borderRadius: 99, fontWeight: 700, marginTop: 2, display: 'inline-block' }}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
        {navSections.map(sec => (
          <div key={sec.section}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 8px', margin: '12px 0 3px' }}>
              {sec.section}
            </div>
            {sec.items.map(item => {
              const isActive = item.to === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.to);
              const badge = item.badgeKey ? badges[item.badgeKey] : null;
              const badgeStyle = item.badgeKey ? getBadgeColor(item.badgeKey) : null;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 9px', borderRadius: 8, fontSize: 12,
                    color: isActive ? '#fff' : 'rgba(255,255,255,.65)',
                    background: isActive ? 'rgba(255,255,255,.15)' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                    textDecoration: 'none', marginBottom: 1,
                    transition: 'background .12s, color .12s',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = '#fff'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.65)'; } }}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 14, width: 16, textAlign: 'center', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: badgeStyle.bg, color: badgeStyle.color }}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: 8, borderTop: '1px solid rgba(255,255,255,.1)', flexShrink: 0 }}>
        <Link
          to="/my-profile"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,.65)', textDecoration: 'none', marginBottom: 2 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.65)'; }}
        >
          <i className="ti ti-user-circle" style={{ fontSize: 14, width: 16, textAlign: 'center' }} />
          Profil Saya
        </Link>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, fontSize: 12, color: 'rgba(255,255,255,.5)', background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,.5)'; }}
        >
          <i className="ti ti-logout" style={{ fontSize: 14, width: 16, textAlign: 'center' }} />
          Keluar
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F5F6F8' }}>
      {/* Desktop Sidebar */}
      <aside
        className="dash-sidebar-desktop"
        style={{ width: 220, flexShrink: 0, background: '#1B3A5C', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="dash-sidebar-mobile-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)' }} onClick={() => setMobileOpen(false)} />
          <aside style={{ position: 'relative', width: 220, background: '#1B3A5C', display: 'flex', flexDirection: 'column', overflowY: 'auto', zIndex: 201 }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 50, flexShrink: 0, background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
          {/* Mobile menu button */}
          <button
            className="dash-mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            style={{ display: 'none', width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <i className="ti ti-menu-2" style={{ fontSize: 16, color: '#4B5563' }} />
          </button>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 10px', height: 30, maxWidth: 280, flex: 1 }}>
            <i className="ti ti-search" style={{ fontSize: 13, color: '#9CA3AF', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari kursus, pengguna, kontrak…"
              style={{ border: 'none', background: 'none', fontSize: 12, color: '#111827', outline: 'none', width: '100%' }}
            />
          </div>

          {/* Right */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              to="/"
              style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB' }}
              title="Kembali ke Beranda"
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#111827'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
            >
              <i className="ti ti-home" style={{ fontSize: 13 }} />
              <span className="dash-beranda-label">Beranda</span>
            </Link>
            <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: role === 'admin' ? '#FEE2E2' : role === 'teacher' ? '#FEF3E2' : '#EBF5FF', color: role === 'admin' ? '#B91C1C' : role === 'teacher' ? '#F3921B' : '#0C628D' }}>
              {roleLabel}
            </div>
            <Link
              to="/my-profile"
              style={{ width: 30, height: 30, borderRadius: '50%', background: '#1B3A5C', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              title="Profil Saya"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Content — overflow:hidden so SidebarShell pages control their own scroll */}
        <div className="dash-content" style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dash-sidebar-desktop { display: none !important; }
          .dash-mobile-menu-btn { display: flex !important; }
          .dash-beranda-label { display: none; }
        }
      `}</style>
    </div>
  );
}
