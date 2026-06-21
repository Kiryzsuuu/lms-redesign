import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Button } from './ui';

const SB_PX = { 'w-64': 256, 'w-72': 288, 'w-80': 320, 'w-96': 384 };

export function SidebarShell({
  title,
  description,
  actions,
  sidebarTitle,
  sidebar,
  renderSidebar,
  children,
  sidebarWidth = 'w-72',
  contentClassName = '',
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    function onResize() { if (window.innerWidth >= 1024) setSidebarOpen(false); }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sbPx = SB_PX[sidebarWidth] || 288;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F5F6F8' }}>
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: '#fff', overflow: 'hidden',
      }}>
        {/* Page header */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid #E5E7EB', padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                {title}
              </h1>
              {description && <p style={{ marginTop: 3, fontSize: '0.78rem', color: '#9CA3AF' }}>{description}</p>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{actions}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          {/* Desktop sidebar */}
          <aside
            style={{
              width: collapsed ? 0 : sbPx,
              flexShrink: 0,
              overflow: 'hidden',
              borderRight: collapsed ? 'none' : '1px solid #E5E7EB',
              background: '#FAFAFA',
              transition: 'width 0.22s ease',
            }}
            className="hidden lg:flex lg:flex-col"
          >
            <div style={{ width: sbPx, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {sidebarTitle && (
                <div style={{
                  flexShrink: 0, padding: '0.75rem 1rem 0.55rem',
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.12em', color: '#9CA3AF',
                  borderBottom: '1px solid #E5E7EB', background: '#FAFAFA',
                }}>
                  {sidebarTitle}
                </div>
              )}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem 0.875rem 1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {renderSidebar ? renderSidebar(() => {}) : sidebar}
                </div>
              </div>
            </div>
          </aside>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            className="hidden lg:flex"
            style={{
              flexShrink: 0, width: 18, border: 'none',
              borderRight: '1px solid #E5E7EB',
              background: '#F3F4F6', cursor: 'pointer', padding: 0,
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; }}
          >
            <div style={{
              height: 40, width: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '0 7px 7px 0',
              background: '#fff', border: '1px solid #E5E7EB', borderLeft: 'none',
              boxShadow: '1px 0 4px rgba(0,0,0,0.05)',
            }}>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="#9CA3AF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                {collapsed ? <path d="M1 1l5 5-5 5" /> : <path d="M6 1L1 6l5 5" />}
              </svg>
            </div>
          </button>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Mobile menu toggle */}
            <div className="lg:hidden" style={{ flexShrink: 0, borderBottom: '1px solid #E5E7EB', padding: '0.6rem 1rem' }}>
              <Button variant="outline" className="w-full justify-center" size="sm" onClick={() => setSidebarOpen(true)}>
                ☰ Buka Menu
              </Button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className={clsx('p-5 sm:p-6', contentClassName)}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.35)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: '85vw', maxWidth: 360,
            borderRight: '1px solid #E5E7EB', background: '#fff',
            boxShadow: '4px 0 20px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', padding: '0.875rem 1rem' }}>
              {sidebarTitle && (
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#9CA3AF' }}>
                  {sidebarTitle}
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>Tutup</Button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem 1rem 1.25rem' }}>
              {renderSidebar ? renderSidebar(() => setSidebarOpen(false)) : sidebar}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
