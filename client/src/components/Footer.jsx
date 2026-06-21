import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/config';

const FOOTER_DEFAULTS = {
  footerTagline: 'Platform belajar online untuk profesional Indonesia yang ingin naik level karir dengan skill nyata dari industri.',
  footerSocials: [
    { label: 'IG', href: '#' },
    { label: 'YT', href: '#' },
    { label: 'in', href: '#' },
    { label: 'X', href: '#' },
  ],
  footerNavCols: [
    { title: 'Produk', links: [
      { label: 'Online Courses', href: '/courses' },
      { label: 'Sertifikasi', href: '/' },
      { label: 'Program Korporat', href: '/' },
    ]},
    { title: 'Perusahaan', links: [
      { label: 'Tentang Kami', href: '/tentang-kami' },
      { label: 'Blog', href: '/' },
      { label: 'Karir', href: '/' },
    ]},
    { title: 'Bantuan', links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Hubungi Kami', href: 'mailto:support@inspiratekno.com' },
      { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
      { label: 'Syarat & Ketentuan', href: '/' },
    ]},
  ],
  footerBottomLinks: [
    { label: 'Privasi', href: '#' },
    { label: 'Syarat', href: '#' },
    { label: 'Cookie', href: '#' },
  ],
  footerCopyright: 'InspiraLearn by Inspiratekno. All rights reserved.',
};

function FooterLink({ href, label }) {
  const linkStyle = { color: 'rgba(255,255,255,.45)', fontSize: '0.87rem', textDecoration: 'none', transition: 'color .15s' };
  const hoverOn = e => { e.currentTarget.style.color = 'rgba(255,255,255,.8)'; };
  const hoverOff = e => { e.currentTarget.style.color = 'rgba(255,255,255,.45)'; };
  const isExternal = href?.startsWith('http') || href?.startsWith('mailto:');
  if (isExternal) {
    return <a href={href} style={linkStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{label}</a>;
  }
  return <Link to={href || '/'} style={linkStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>{label}</Link>;
}

export function Footer() {
  const year = new Date().getFullYear();
  const [s, setS] = useState(FOOTER_DEFAULTS);

  useEffect(() => {
    fetch(`${API_BASE_URL}/settings/homePage`)
      .then(r => r.json())
      .then(data => { if (data?.value) setS(v => ({ ...v, ...data.value })); })
      .catch(() => {});
  }, []);

  const navCols = s.footerNavCols?.length ? s.footerNavCols : FOOTER_DEFAULTS.footerNavCols;
  const socials = s.footerSocials?.length ? s.footerSocials : FOOTER_DEFAULTS.footerSocials;
  const bottomLinks = s.footerBottomLinks?.length ? s.footerBottomLinks : FOOTER_DEFAULTS.footerBottomLinks;

  return (
    <footer style={{ background: '#0A0E1A', padding: '4rem 0 0' }}>
      <div className="w-full max-w-[1200px] mx-auto px-6">
        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2.5fr_1fr_1fr_1fr] gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <img src="/logo-putih.png" alt="Inspira Innovation" className="h-[30px] w-auto object-contain" />
            </div>
            <p className="text-[0.85rem] leading-[1.65] max-w-[260px] mb-6" style={{ color: 'rgba(255,255,255,.35)' }}>
              {s.footerTagline || FOOTER_DEFAULTS.footerTagline}
            </p>
            <div className="flex gap-2 flex-wrap">
              {socials.map((sc) => (
                <a
                  key={sc.label}
                  href={sc.href || '#'}
                  aria-label={sc.label}
                  className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[0.8rem] font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = 'rgba(255,255,255,.8)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.4)'; }}
                >
                  {sc.label}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {navCols.map((col) => (
            <div key={col.title}>
              <div className="text-[0.75rem] font-bold uppercase tracking-[.07em] mb-[1.1rem]" style={{ color: 'rgba(255,255,255,.35)' }}>
                {col.title}
              </div>
              <ul className="flex flex-col gap-[0.55rem]">
                {(col.links || []).map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6"
          style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}
        >
          <p className="text-[0.78rem]" style={{ color: 'rgba(255,255,255,.25)' }}>
            © {year} {s.footerCopyright || FOOTER_DEFAULTS.footerCopyright}
          </p>
          <div className="flex gap-6">
            {bottomLinks.map((link) => (
              <a
                key={link.label}
                href={link.href || '#'}
                className="text-[0.78rem] transition-colors"
                style={{ color: 'rgba(255,255,255,.3)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
