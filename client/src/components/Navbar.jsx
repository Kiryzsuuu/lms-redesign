import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ConfirmDialog } from './ConfirmDialog';

function LogoMark() {
  return (
    <img
      src="/logo-color.png"
      alt="Edulyfe"
      className="h-[36px] w-auto object-contain flex-shrink-0"
    />
  );
}

function DropLink({ to, children }) {
  return (
    <Link
      to={to}
      className="block px-4 py-2 text-[0.875rem] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
    >
      {children}
    </Link>
  );
}

function MobileMenuGroup({ label, children }) {
  return (
    <>
      <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-t border-gray-100 mt-1">
        {label}
      </div>
      {children}
    </>
  );
}

function MobileMenuItem({ onSelect, children }) {
  return (
    <button
      type="button"
      className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-[10px]"
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

export function Navbar() {
  const { api, isAuthed, role, user, logout } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const confirmExitRef = useRef(() => {});

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCartCount() {
      if (!isAuthed || role !== 'student') { setCartCount(0); return; }
      try {
        const res = await api.get('/cart');
        const count = Array.isArray(res.data?.items) ? res.data.items.length : 0;
        if (!cancelled) setCartCount(count);
      } catch { if (!cancelled) setCartCount(0); }
    }
    const onCartChanged = () => loadCartCount();
    window.addEventListener('cart:changed', onCartChanged);
    loadCartCount();
    return () => { cancelled = true; window.removeEventListener('cart:changed', onCartChanged); };
  }, [api, isAuthed, role, location?.pathname]);

  const path = location?.pathname || '';
  const minimalHeader = /^\/courses\/.+/.test(path) || /^\/quiz\/.+/.test(path);
  const closeMobile = () => setMobileOpen(false);

  const handleExitClick = () => {
    setExitConfirmOpen(true);
    confirmExitRef.current = () => nav('/');
  };

  return (
    <>
      <ConfirmDialog
        open={exitConfirmOpen}
        title="Keluar dari Course"
        message="Anda akan meninggalkan course ini. Pastikan semua perubahan sudah tersimpan."
        confirmText="Ya, Keluar"
        confirmVariant="danger"
        onCancel={() => setExitConfirmOpen(false)}
        onConfirm={() => { setExitConfirmOpen(false); confirmExitRef.current(); }}
      />

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-white z-[999] flex flex-col pt-[var(--nav-h)] px-4 pb-6 overflow-y-auto"
          style={{ top: 'var(--nav-h)' }}
        >
          {!isAuthed && (
            <MobileMenuGroup label="Akun">
              <MobileMenuItem onSelect={() => { closeMobile(); nav('/login'); }}>Masuk</MobileMenuItem>
              <MobileMenuItem onSelect={() => { closeMobile(); nav('/register'); }}>Daftar Gratis</MobileMenuItem>
            </MobileMenuGroup>
          )}
          {isAuthed && (
            <MobileMenuGroup label="Akun">
              <MobileMenuItem onSelect={() => { closeMobile(); nav('/dashboard'); }}>Dashboard</MobileMenuItem>
              <MobileMenuItem onSelect={() => { closeMobile(); nav('/my-profile'); }}>Profil Saya</MobileMenuItem>
              <MobileMenuItem onSelect={() => { closeMobile(); logout(); }}>Logout</MobileMenuItem>
            </MobileMenuGroup>
          )}
        </div>
      )}

      <header
        className="sticky top-0 z-[1000] transition-all duration-300"
        style={{
          height: 'var(--nav-h)',
          background: scrolled ? 'rgba(247,248,250,.95)' : 'rgba(247,248,250,.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,.07)',
          boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.05)' : 'none',
        }}
      >
        <div className="w-full max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between gap-6">

          {minimalHeader ? (
            <>
              <button type="button" onClick={handleExitClick} className="hover:opacity-80 transition-opacity">
                <LogoMark />
              </button>
              <button
                onClick={handleExitClick}
                className="text-[0.9rem] font-semibold px-6 py-3 rounded-[10px] bg-[#0C628D] text-white transition-all hover:-translate-y-px"
                style={{ boxShadow: '0 1px 2px rgba(12,98,141,.3)' }}
              >
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="hover:opacity-90 transition-opacity">
                <LogoMark />
              </Link>

              {/* Desktop actions (logo kiri, profil kanan) */}
              <div className="hidden md:flex items-center gap-[0.6rem] ml-auto">
                {!isAuthed ? (
                  <>
                    <Link to="/login">
                      <button className="text-[0.9rem] font-medium text-gray-600 px-[0.85rem] py-[0.5rem] rounded-[10px] hover:bg-gray-100 hover:text-gray-900 transition-colors">
                        Masuk
                      </button>
                    </Link>
                    <Link to="/register">
                      <button
                        className="text-[0.82rem] font-semibold text-white px-[1.1rem] py-[0.55rem] rounded-[10px] transition-all hover:-translate-y-px"
                        style={{ background: '#0C628D', boxShadow: '0 1px 2px rgba(12,98,141,.3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#0A527A'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#0C628D'; }}
                      >
                        Mulai Gratis
                      </button>
                    </Link>
                  </>
                ) : (
                  <>
                    {role === 'student' && (
                      <Link to="/cart" className="relative" aria-label="Keranjang">
                        <button className="p-2 rounded-[10px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                          </svg>
                        </button>
                        {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#F7F8FA]" />}
                      </Link>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] hover:bg-gray-100 transition-colors"
                      >
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-[34px] h-[34px] rounded-full object-cover flex-shrink-0"
                            style={{ border: '2px solid rgba(255,255,255,0.3)' }}
                          />
                        ) : (
                          <div
                            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #0C628D, #2E86B5)' }}
                          >
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700 hidden lg:block">{user?.name || 'Profile'}</span>
                      </button>
                      {userMenuOpen && (
                        <>
                          <button type="button" className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                          <div
                            className="absolute right-0 top-full mt-2 w-48 bg-white rounded-[16px] z-40 py-1.5 overflow-hidden"
                            style={{ border: '1px solid #E5E7EB', boxShadow: '0 10px 15px rgba(0,0,0,.08), 0 4px 6px rgba(0,0,0,.05)' }}
                          >
                            <DropLink to="/dashboard">Dashboard</DropLink>
                            <DropLink to="/my-profile">Profil Saya</DropLink>
                            <div className="border-t border-gray-100 mt-1 pt-1">
                              <button
                                type="button"
                                className="w-full px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                                onClick={() => { setUserMenuOpen(false); logout(); }}
                              >
                                Logout
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-expanded={mobileOpen}
                aria-label="Buka menu"
                className="md:hidden w-[38px] h-[38px] rounded-[10px] bg-gray-100 flex items-center justify-center flex-col gap-[5px] cursor-pointer"
              >
                <span
                  className="block w-[18px] h-[1.5px] bg-gray-700 rounded transition-all duration-300"
                  style={mobileOpen ? { transform: 'rotate(45deg) translate(4px, 5px)' } : {}}
                />
                <span
                  className="block w-[18px] h-[1.5px] bg-gray-700 rounded transition-all duration-300"
                  style={mobileOpen ? { opacity: 0 } : {}}
                />
                <span
                  className="block w-[18px] h-[1.5px] bg-gray-700 rounded transition-all duration-300"
                  style={mobileOpen ? { transform: 'rotate(-45deg) translate(4px, -5px)' } : {}}
                />
              </button>
            </>
          )}
        </div>
      </header>
    </>
  );
}
