import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

function formatIdr(n) {
  try { return new Intl.NumberFormat('id-ID').format(Number(n) || 0); }
  catch { return String(n || 0); }
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/* ── Reveal on scroll — re-observes after async data loads ── */
function useReveal(deps = []) {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); } }),
      { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
    );
    // Only observe elements not yet animated
    document.querySelectorAll('.reveal:not(.in-view)').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const TICKER_ITEMS = [
  'Programming & Dev', 'Data Science', 'UI/UX Design', 'AI & Machine Learning',
  'Cybersecurity', 'Digital Marketing', 'Bisnis & Karir', 'Mobile Dev',
  'Cloud & DevOps', 'Video & Konten',
];


const WHY_ITEMS = [
  { title: 'Kurikulum dari Industri', desc: 'Dirancang bersama praktisi dari perusahaan terkemuka. Bukan teori — langsung dari kebutuhan kerja nyata.', bg: '#E0F0FA' },
  { title: 'Proyek Nyata', desc: 'Setiap kursus punya capstone project yang bisa masuk portfolio kamu. Recruiter mau melihat yang kamu bisa buat.', bg: '#E0F5F5' },
  { title: 'Live Q&A Mingguan', desc: 'Sesi live setiap Sabtu — tanya langsung, dapat jawaban langsung dari instruktur berpengalaman.', bg: '#EEE9FF' },
  { title: 'Sertifikat Terverifikasi', desc: 'Setiap sertifikat punya ID unik yang dapat diverifikasi HRD perusahaan secara langsung.', bg: '#FEF3E2' },
  { title: 'Akses Seumur Hidup', desc: 'Beli sekali, punya selamanya. Saat materi diupdate, kamu dapat akses ke versi baru tanpa bayar lagi.', bg: '#F0FDE4' },
];


const PARTNERS = ['Tokopedia', 'Gojek', 'Traveloka', 'Bukalapak', 'Telkom', 'BCA Digital', 'Shopee', 'Halodoc', 'Akseleran', 'Blibli'];

const THUMB_GRADIENTS = [
  'linear-gradient(135deg,#0f1929,#1a2e4a)',
  'linear-gradient(135deg,#1a0f2e,#2d1b69)',
  'linear-gradient(135deg,#1a0a1a,#3d1a3d)',
  'linear-gradient(135deg,#0a1a14,#0f3d28)',
  'linear-gradient(135deg,#1a0a0a,#3d0f0f)',
  'linear-gradient(135deg,#0a100f,#103322)',
];

export default function Home() {
  const { api, isAuthed } = useAuth();
  const nav = useNavigate();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState('');
  const progressRef = useRef(null);

  useReveal([courses, categories, testimonials]);

  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data.courses || [])).catch(() => {});
    api.get('/categories').then((r) => setCategories(r.data.categories || [])).catch(() => {});
    api.get('/testimonials').then((r) => setTestimonials(r.data.testimonials || [])).catch(() => {});
    api.get('/settings/homePage').then((r) => setSettings(r.data.value || null)).catch(() => {});
    const t = setTimeout(() => {
      if (progressRef.current) progressRef.current.style.width = '35%';
    }, 800);
    return () => clearTimeout(t);
  }, [api]);

  const S = settings || {};

  const published = courses.filter((c) => c.isPublished !== false);
  const featured = published.slice(0, 6);

  const handleCta = (e) => { e.preventDefault(); nav('/register'); };

  return (
    <div style={{ background: '#F7F8FA', color: '#111827' }}>

      {/* ===== HERO ===== */}
      <section
        className="relative overflow-hidden"
        style={{ background: '#fff', padding: '6rem 0 4rem' }}
      >
        {/* Mesh bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute rounded-full animate-[mesh-drift_12s_ease-in-out_infinite_alternate]"
            style={{ top: '-30%', left: '-10%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(12,98,141,.08) 0%, transparent 60%)' }}
          />
          <div
            className="absolute rounded-full animate-[mesh-drift_10s_ease-in-out_infinite_alternate-reverse]"
            style={{ bottom: '-20%', right: '-5%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(243,146,27,.07) 0%, transparent 60%)' }}
          />
        </div>
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-60"
          style={{ backgroundImage: 'linear-gradient(#F3F4F6 1px, transparent 1px), linear-gradient(90deg, #F3F4F6 1px, transparent 1px)', backgroundSize: '48px 48px' }}
        />

        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <div
                className="inline-flex items-center gap-2 text-[0.78rem] font-semibold px-[0.9rem] py-[0.35rem] rounded-full mb-6"
                style={{ background: '#F0F8FD', border: '1px solid #E0F0FA', color: '#0C628D' }}
              >
                <span
                  className="w-[6px] h-[6px] rounded-full animate-[kicker-pulse_2s_ease-in-out_infinite] flex-shrink-0"
                  style={{ background: '#0C628D' }}
                />
                {S.heroBadgePrefix || 'Platform Belajar #1 Indonesia'} · {published.length > 0 ? `${published.length}+ Kursus` : '500+ Kursus'}
              </div>

              <h1
                className="mb-5 font-display"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', letterSpacing: '-0.03em', color: '#0A0E1A', fontWeight: 800, lineHeight: 1.1 }}
              >
                {(S.heroTitle || 'Kuasai Skill\nyang Dibutuhkan').split('\n').map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))}
                <br />
                <span style={{ background: 'linear-gradient(135deg, #F3921B, #D97C0D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {S.heroAccent || 'Industri Sekarang'}
                </span>
              </h1>

              <p className="mb-8 text-[1.05rem] leading-[1.75] max-w-[480px]" style={{ color: '#6B7280' }}>
                {S.heroDesc || 'Belajar dari praktisi terbaik. Kurikulum dirancang langsung dari kebutuhan industri — bukan teori kosong.'}
              </p>

              <div className="flex items-center gap-3 flex-wrap mb-10">
                <Link to="/courses">
                  <button
                    className="inline-flex items-center gap-2 font-semibold text-white rounded-[16px] px-8 py-[0.95rem] text-[1rem] transition-all hover:-translate-y-px"
                    style={{ background: '#0C628D', boxShadow: '0 1px 2px rgba(12,98,141,.3),inset 0 1px 0 rgba(255,255,255,.08)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#0A527A'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(12,98,141,.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#0C628D'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(12,98,141,.3),inset 0 1px 0 rgba(255,255,255,.08)'; }}
                  >
                    Mulai Belajar Gratis
                  </button>
                </Link>
                <Link to="/courses">
                  <button
                    className="inline-flex items-center gap-2 font-semibold rounded-[16px] px-8 py-[0.95rem] text-[1rem] transition-all hover:-translate-y-px"
                    style={{ background: '#fff', color: '#111827', boxShadow: '0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,.07),0 2px 4px rgba(0,0,0,.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06)'; }}
                  >
                    Lihat Kursus
                  </button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3">
                <div className="flex">
                  {['AR', 'DM', 'FN', 'RH'].map((initials, i) => (
                    <div
                      key={initials}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[0.65rem] font-bold text-white flex-shrink-0"
                      style={{ marginLeft: i === 0 ? 0 : '-8px', background: ['linear-gradient(135deg,#0C628D,#2E86B5)', 'linear-gradient(135deg,#F3921B,#D97C0D)', 'linear-gradient(135deg,#0FADA8,#0C628D)', 'linear-gradient(135deg,#6C5CE7,#0C628D)'][i] }}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <p className="text-[0.82rem]" style={{ color: '#6B7280' }}>
                  Bergabung bersama <strong style={{ color: '#111827' }}>50.000+ pelajar</strong> yang sudah naik level
                </p>
              </div>
            </div>

            {/* Right — course preview card */}
            <div className="relative hidden lg:block">
              {/* Floating badges */}
              <div
                className="absolute top-[-1.5rem] right-[-1.5rem] bg-white rounded-[16px] px-4 py-3 flex items-center gap-[0.65rem] whitespace-nowrap animate-[float_6s_ease-in-out_infinite] z-10"
                style={{ boxShadow: '0 20px 25px rgba(0,0,0,.1)', border: '1px solid #F3F4F6' }}
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#E0F5F5' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0FADA8" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
                <div>
                  <div className="text-[0.7rem] font-medium" style={{ color: '#9CA3AF' }}>{S.heroBadge1Title || 'Sertifikat Diterima'}</div>
                  <div className="text-[0.85rem] font-bold" style={{ color: '#111827' }}>{S.heroBadge1Sub || 'Gojek · Tokopedia'}</div>
                </div>
              </div>

              <div
                className="absolute bottom-12 left-[-2rem] bg-white rounded-[16px] px-4 py-3 flex items-center gap-[0.65rem] whitespace-nowrap animate-[float_6s_ease-in-out_infinite_1.5s] z-10"
                style={{ boxShadow: '0 20px 25px rgba(0,0,0,.1)', border: '1px solid #F3F4F6' }}
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#FEF9E7' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                </div>
                <div>
                  <div className="text-[0.7rem] font-medium" style={{ color: '#9CA3AF' }}>{S.heroBadge2Title || 'Baru bergabung'}</div>
                  <div className="text-[0.85rem] font-bold" style={{ color: '#111827' }}>{S.heroBadge2Sub || 'Budi S. · 2 menit lalu'}</div>
                </div>
              </div>

              {/* Main card */}
              <div
                className="bg-white rounded-[28px] overflow-hidden"
                style={{ boxShadow: '0 25px 50px rgba(0,0,0,.15)', border: '1px solid #E5E7EB' }}
              >
                {/* Header */}
                <div
                  className="px-6 py-5 flex items-center justify-between"
                  style={{ background: 'linear-gradient(135deg, #111827, #1F2937)' }}
                >
                  <div className="flex gap-[0.4rem]">
                    {['#FF5F56', '#FFBD2E', '#27C93F'].map((c) => (
                      <div key={c} className="w-[10px] h-[10px] rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[0.75rem] font-medium" style={{ color: 'rgba(255,255,255,.3)' }}>Python for Data Science</span>
                  <span className="text-[0.72rem]" style={{ color: 'rgba(255,255,255,.25)' }}>Lesson 3 / 24</span>
                </div>

                <div className="px-6 py-5">
                  {/* Video thumb */}
                  <div
                    className="rounded-[16px] h-[140px] flex items-center justify-center mb-4 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0f0f23, #1a1a3e)' }}
                  >
                    <button
                      className="w-[52px] h-[52px] rounded-full flex items-center justify-center relative z-10 transition-all hover:scale-105"
                      style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(10px)', border: '1.5px solid rgba(255,255,255,.2)' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M5 3.5L14 9L5 14.5V3.5Z" fill="white" />
                      </svg>
                    </button>
                    <div
                      className="absolute bottom-3 left-3 right-3 rounded-[6px] px-3 py-2"
                      style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', fontFamily: 'monospace', fontSize: '0.68rem', color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}
                    >
                      <span style={{ color: '#569CD6' }}>import</span> pandas <span style={{ color: '#569CD6' }}>as</span> pd<br />
                      df = pd.read_csv(<span style={{ color: '#CE9178' }}>&apos;data.csv&apos;</span>)
                    </div>
                  </div>

                  {/* Lesson list */}
                  {[
                    { num: 1, title: 'Intro Python & Setup', dur: '8:24', done: true },
                    { num: 2, title: 'Pandas Fundamentals', dur: '12:10', done: true },
                    { num: 3, title: 'Data Cleaning & EDA', dur: '18:45', active: true },
                    { num: 4, title: 'Visualization dengan Matplotlib', dur: '15:32' },
                  ].map((item) => (
                    <div
                      key={item.num}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors"
                      style={{ background: item.active ? '#F0F8FD' : 'transparent' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[0.68rem] font-bold flex-shrink-0"
                        style={{ background: item.active ? '#0C628D' : '#F3F4F6', color: item.active ? '#fff' : '#6B7280' }}
                      >
                        {item.num}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.82rem] font-semibold truncate" style={{ color: item.active ? '#0C628D' : '#1F2937' }}>{item.title}</div>
                        <div className="text-[0.7rem]" style={{ color: '#9CA3AF' }}>{item.dur}</div>
                      </div>
                      {item.done && <span className="text-[0.75rem]" style={{ color: '#0FADA8' }}>✓</span>}
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <div className="flex justify-between text-[0.75rem] mb-1.5" style={{ color: '#6B7280' }}>
                    <span>Progress kamu</span>
                    <span style={{ color: '#0C628D', fontWeight: 600 }}>35%</span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                    <div
                      ref={progressRef}
                      className="h-full rounded-full transition-all duration-500"
                      style={{ background: 'linear-gradient(90deg, #0C628D, #0FADA8)', width: '0%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <div style={{ background: '#fff', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', padding: '2.5rem 0' }}>
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {[
              ...(S.stats ? S.stats.map((s, i) => i === 0 ? { ...s, num: published.length > 0 ? `${published.length}+` : s.num } : s) : [
                { num: published.length > 0 ? `${published.length}+` : '500+', label: 'Premium Courses' },
                { num: '50K+', label: 'Pelajar Aktif' },
                { num: '120+', label: 'Instruktur Expert' },
                { num: '98%', label: 'Tingkat Kepuasan' },
              ]),
            ].map((s, i) => (
              <div
                key={s.label}
                className="text-center px-8 reveal"
                style={{ borderRight: i < 3 ? '1px solid #E5E7EB' : 'none', transitionDelay: `${i * 0.08}s` }}
              >
                <div
                  className="font-display font-extrabold text-[2.25rem] leading-none mb-1 tracking-[-0.04em]"
                  style={{ background: 'linear-gradient(135deg, #0C628D, #0FADA8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                >
                  {s.num}
                </div>
                <div className="text-[0.85rem] font-medium" style={{ color: '#6B7280' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== TICKER ===== */}
      <div className="overflow-hidden py-[0.9rem]" style={{ background: '#0A0E1A' }} aria-hidden="true">
        <div className="flex gap-10 animate-[ticker-scroll_30s_linear_infinite] w-max">
          {(() => { const src = (S.tickerItems && S.tickerItems.length > 0) ? S.tickerItems : categories.length > 0 ? categories.map(c => c.name) : TICKER_ITEMS; return [...src, ...src]; })().map((item, i) => (
            <span key={i} className="flex items-center gap-[0.65rem] text-[0.82rem] font-medium whitespace-nowrap" style={{ color: 'rgba(255,255,255,.55)' }}>
              {item}
              <span className="w-[4px] h-[4px] rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,.2)' }} />
            </span>
          ))}
        </div>
      </div>

      {/* ===== CATEGORIES — hanya tampil jika ada data dari DB ===== */}
      {categories.length > 0 && <section className="py-24" style={{ background: '#F7F8FA' }}>
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="mb-12">
            <div className="section-eyebrow">Kategori</div>
            <h2 className="font-display text-[clamp(1.75rem,3vw,2.6rem)] font-extrabold tracking-[-0.03em] mb-0" style={{ color: '#0A0E1A' }}>
              Pilih Bidang yang Ingin<br />Kamu Kuasai
            </h2>
            <p className="mt-3 text-[1rem] leading-[1.7] max-w-[520px]" style={{ color: '#6B7280' }}>
              Dari pemula hingga senior, tersedia jalur belajar yang terstruktur untuk setiap level.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <Link
                key={cat._id || cat.name}
                to="/courses"
                className="flex flex-col relative overflow-hidden rounded-[20px] cursor-pointer transition-all duration-[250ms] reveal bg-white"
                style={{
                  border: '1px solid #E5E7EB',
                  transitionDelay: `${(i % 4) * 0.08}s`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,.08),0 4px 6px rgba(0,0,0,.05)';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.querySelector('.cat-accent-bar').style.transform = 'scaleX(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.querySelector('.cat-accent-bar').style.transform = 'scaleX(0)';
                }}
              >
                {/* Cover image — top half */}
                <div
                  className="w-full h-[130px] flex-shrink-0 overflow-hidden"
                  style={{ background: cat.coverImageUrl ? undefined : cat.iconBg || '#E0F0FA' }}
                >
                  {cat.coverImageUrl && (
                    <img
                      src={cat.coverImageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col flex-1 relative">
                  <div className="font-display font-bold text-[0.95rem] mb-1 text-gray-900">{cat.name}</div>
                  {cat.subtitle && (
                    <div className="text-[0.76rem] font-medium" style={{ color: '#9CA3AF' }}>{cat.subtitle}</div>
                  )}
                  <div className="mt-3 text-[0.82rem] font-semibold" style={{ color: cat.accent || '#0C628D' }}>
                    Jelajahi
                  </div>
                </div>

                {/* Accent bottom bar */}
                <div
                  className="cat-accent-bar absolute bottom-0 left-0 right-0 h-[3px] transition-transform duration-300 origin-left"
                  style={{ background: cat.accent || '#0C628D', transform: 'scaleX(0)' }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>}

      {/* ===== FEATURED COURSES ===== */}
      <section className="py-24" style={{ background: '#fff' }}>
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="section-eyebrow">Top Courses</div>
              <h2 className="font-display text-[clamp(1.75rem,3vw,2.6rem)] font-extrabold tracking-[-0.03em]" style={{ color: '#0A0E1A' }}>
                Dipilih {published.length > 0 ? `${published.length}+` : '50.000+'} Pelajar
              </h2>
              <p className="mt-2 text-[1rem]" style={{ color: '#6B7280' }}>Top-rated courses proven to build real careers.</p>
            </div>
            <Link to="/courses" className="text-[0.88rem] font-semibold transition-colors" style={{ color: '#0C628D' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#0A527A'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#0C628D'; }}
            >
              See all courses
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((c, i) => {
                const isFree = !c.priceIdr || c.priceIdr === 0;
                const tags = Array.isArray(c.tags) ? c.tags.slice(0, 2) : [];
                return (
                  <Link
                    key={c._id}
                    to={`/courses/${c._id}`}
                    className="flex flex-col bg-white rounded-[20px] overflow-hidden transition-all duration-[250ms] cursor-pointer reveal"
                    style={{ border: '1px solid #E5E7EB', transitionDelay: `${(i % 3) * 0.08}s` }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 20px 25px rgba(0,0,0,.1),0 8px 10px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {/* Thumbnail */}
                    <div className="h-[176px] relative overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: c.coverImageUrl ? undefined : THUMB_GRADIENTS[i % THUMB_GRADIENTS.length] }}
                    >
                      {c.coverImageUrl ? (
                        <img src={c.coverImageUrl} alt={c.title} className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="absolute inset-0 opacity-50"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='20' cy='20' r='10'/%3E%3C/g%3E%3C/svg%3E")` }}
                        />
                      )}
                      {i === 0 && (
                        <span
                          className="absolute top-3 right-3 text-white text-[0.65rem] font-bold px-[0.55rem] py-[0.2rem] rounded-full z-10"
                          style={{ background: '#F3921B', boxShadow: '0 2px 6px rgba(243,146,27,.4)' }}
                        >
                          Terlaris
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col flex-1">
                      {tags.length > 0 && (
                        <div className="flex gap-1.5 mb-3 flex-wrap">
                          {tags.map((tag) => (
                            <span key={tag} className="text-[0.7rem] font-semibold px-[0.65rem] py-[0.25rem] rounded-full" style={{ background: '#E0F0FA', color: '#0C628D' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <h3 className="font-display font-bold text-[0.97rem] leading-snug mb-2 line-clamp-2" style={{ color: '#111827' }}>
                        {c.title}
                      </h3>
                      <p className="text-[0.82rem] leading-[1.6] line-clamp-2 flex-1" style={{ color: '#6B7280' }}>
                        {stripHtml(c.description) || 'Tingkatkan skill dan pengetahuan Anda dengan kursus ini.'}
                      </p>
                      <div className="flex items-center justify-between pt-4 mt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                        <div className="font-display font-extrabold text-[1.1rem]" style={{ color: '#111827' }}>
                          {isFree ? 'Gratis' : `Rp ${formatIdr(c.priceIdr)}`}
                        </div>
                        <div className="flex items-center gap-1 text-[0.78rem]" style={{ color: '#6B7280' }}>
                          <span style={{ color: '#F59E0B' }}>★</span>
                          <strong style={{ color: '#374151' }}>4.9</strong>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 rounded-[20px] bg-gray-50" style={{ border: '1px solid #E5E7EB' }}>
              <p className="font-display font-bold text-lg mb-2" style={{ color: '#111827' }}>No Courses Yet</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>New courses will be available soon.</p>
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/courses">
              <button
                className="inline-flex items-center gap-2 font-semibold rounded-[16px] px-8 py-[0.95rem] text-[1rem] transition-all hover:-translate-y-px"
                style={{ background: '#fff', color: '#111827', border: '1.5px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,.07)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.08)'; }}
              >
                See All {published.length > 0 ? published.length + '+' : '500+'} Courses
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== WHY US ===== */}
      <section className="py-24" style={{ background: '#fff' }}>
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Visual — certificate card */}
            <div className="reveal">
              <div className="rounded-[28px] p-8" style={{ background: '#0A0E1A', boxShadow: '0 25px 50px rgba(0,0,0,.15)' }}>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[0.85rem] font-semibold" style={{ color: 'rgba(255,255,255,.5)' }}>Sertifikat Kamu</span>
                  <span className="text-[0.68rem] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(15,173,168,.2)', color: '#0FADA8' }}>Verified</span>
                </div>
                {/* Real certificate design preview */}
                <div style={{
                  width: '100%', aspectRatio: '297/210',
                  background: '#fff', position: 'relative', overflow: 'hidden',
                  borderRadius: 4, fontSize: '9px',
                  fontFamily: '"Inter","Helvetica Neue",Arial,sans-serif',
                }}>
                  {/* Left accent bar */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2.5%', background: 'linear-gradient(180deg,#0C628D 0%,#0FADA8 50%,#F3921B 100%)' }} />
                  {/* Top strip */}
                  <div style={{ position: 'absolute', top: 0, left: '2.5%', right: 0, height: '2.5%', background: 'linear-gradient(90deg,#0C628D 0%,#0FADA8 60%,#F3921B 100%)' }} />
                  {/* Content */}
                  <div style={{ position: 'absolute', inset: 0, left: '2.5%', top: '2.5%', padding: '4.5% 5.5% 4.5% 5%', display: 'flex', flexDirection: 'column' }}>
                    {/* Header: logo + cert number */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3%' }}>
                      <img src="/logo-inspira.png" alt="InspiraLearn" style={{ height: '3.8em', width: 'auto', objectFit: 'contain' }} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.52em', fontWeight: 700, letterSpacing: '0.12em', color: '#9CA3AF', textTransform: 'uppercase' }}>No. Sertifikat</div>
                        <div style={{ fontSize: '0.56em', fontWeight: 600, color: '#374151', fontFamily: 'monospace', marginTop: 1 }}>CERT-M8P2R4-K7X9</div>
                      </div>
                    </div>
                    {/* Body */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      {/* Label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7em', marginBottom: '2%' }}>
                        <div style={{ height: 1.5, width: '1.8em', background: '#F3921B', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.52em', fontWeight: 700, letterSpacing: '0.16em', color: '#F3921B', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Certificate of Completion</span>
                        <div style={{ height: 1.5, flex: 1, background: 'linear-gradient(90deg,#F3921B,transparent)' }} />
                      </div>
                      <div style={{ fontSize: '0.65em', color: '#6B7280', marginBottom: '0.8%' }}>Dengan bangga diberikan kepada</div>
                      <div style={{ fontSize: '2.1em', fontWeight: 800, color: '#0A0E1A', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1.2%', fontFamily: '"Bricolage Grotesque","Inter",sans-serif' }}>
                        {S.certSampleName || 'Arya Ramadhan'}
                      </div>
                      <div style={{ fontSize: '0.65em', color: '#6B7280', marginBottom: '0.6%' }}>atas keberhasilan menyelesaikan kursus</div>
                      <div style={{ fontSize: '0.95em', fontWeight: 700, color: '#0C628D', lineHeight: 1.3, marginBottom: '3%', maxWidth: '70%' }}>
                        {S.certSampleCourse || 'Python untuk Data Science & ML'}
                      </div>
                      {/* Footer row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '2%', borderTop: '1px solid #F3F4F6' }}>
                        <div>
                          <div style={{ fontSize: '0.45em', fontWeight: 600, letterSpacing: '0.1em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>Tanggal Penyelesaian</div>
                          <div style={{ fontSize: '0.62em', fontWeight: 600, color: '#374151' }}>1 Januari 2025</div>
                          <div style={{ fontSize: '0.45em', color: '#9CA3AF', marginTop: 2 }}>Platform: InspiraLearn</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '8em', height: 0.5, background: '#D1D5DB', margin: '0 auto 3px' }} />
                          <div style={{ fontSize: '0.58em', fontWeight: 600, color: '#374151' }}>InspiraLearn</div>
                          <div style={{ fontSize: '0.43em', letterSpacing: '0.1em', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 1 }}>Instruktur / Authorized</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <svg width="38" height="38" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id="sgHome" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#0C628D"/><stop offset="100%" stopColor="#0FADA8"/>
                              </linearGradient>
                            </defs>
                            <circle cx="32" cy="32" r="31" fill="url(#sgHome)"/>
                            <polyline points="18,33 27,42 46,22" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            <text x="32" y="56" textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="6" fontWeight="700" letterSpacing="1" fontFamily="Arial,sans-serif">VERIFIED</text>
                          </svg>
                          {/* QR pattern placeholder */}
                          <div style={{ width: 28, height: 28, background: '#fff', border: '1px solid #e5e7eb', padding: 2, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1 }}>
                            {[1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,1,1,1,1].map((v,i) => (
                              <div key={i} style={{ background: v ? '#0C628D' : '#fff', borderRadius: 0.5 }} />
                            ))}
                          </div>
                          <div style={{ fontSize: '0.38em', color: '#9CA3AF' }}>InspiraLearn</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="text-[0.7rem] mb-2" style={{ color: 'rgba(255,255,255,.35)' }}>{S.partnerCountText || 'Diakui oleh 300+ perusahaan termasuk'}</div>
                  <div className="flex gap-2 flex-wrap">
                    {(S.partners || ['Tokopedia', 'Gojek', 'Traveloka', 'BCA Digital']).map((name) => (
                      <span key={name} className="text-[0.72rem] font-semibold px-2.5 py-1 rounded-[10px]" style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)' }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div>
              <div className="section-eyebrow">Mengapa Kami Berbeda</div>
              <h2 className="font-display text-[clamp(1.75rem,3vw,2.6rem)] font-extrabold tracking-[-0.03em] mb-8" style={{ color: '#0A0E1A' }}>
                Bukan Sekadar<br />Nonton Video
              </h2>
              <div className="flex flex-col gap-6">
                {WHY_ITEMS.map((item, i) => (
                  <div key={item.title} className={`flex gap-[1.1rem] reveal reveal-delay-${i}`}>
                    <div
                      className="w-11 h-11 rounded-[16px] flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: item.bg }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C628D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[1rem] font-bold mb-1" style={{ color: '#111827' }}>{item.title}</div>
                      <div className="text-[0.88rem] leading-[1.65]" style={{ color: '#6B7280' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-24" style={{ background: '#F7F8FA' }}>
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-12 items-start">
            {/* Sidebar */}
            <div className="reveal">
              <div
                className="font-display font-extrabold leading-none mb-1 tracking-[-0.05em]"
                style={{ fontSize: '5rem', background: 'linear-gradient(135deg, #F3921B, #D97C0D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {S.testimonialStat || '50K+'}
              </div>
              <div className="text-[0.88rem] font-medium mb-8" style={{ color: '#6B7280' }}>{S.testimonialStatLabel || 'Pelajar bergabung'}</div>
              <blockquote
                className="text-[1rem] leading-[1.7] italic p-5 rounded-[16px] mb-6"
                style={{ color: '#374151', background: '#fff', border: '1px solid #E5E7EB', borderLeft: '3px solid #F3921B' }}
              >
                "{S.testimonialQuote || 'Lulusan InspiraLearn 3× lebih cepat mendapat pekerjaan dibanding rata-rata fresh graduate Indonesia.'}"
              </blockquote>
              <div className="flex items-center gap-3">
                <span className="text-[1rem] tracking-[2px]" style={{ color: '#F59E0B' }}>★★★★★</span>
                <span className="font-display font-extrabold text-[1.4rem] tracking-[-0.04em]" style={{ color: '#111827' }}>{S.ratingNum || '4.9'}</span>
                <span className="text-[0.82rem]" style={{ color: '#9CA3AF' }}>{S.ratingLabel || 'dari 28.000+ ulasan'}</span>
              </div>
            </div>

            {/* Cards */}
            {testimonials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {testimonials.slice(0, 4).map((t, i) => (
                  <div
                    key={t._id}
                    className={`bg-white rounded-[20px] p-6 transition-all duration-200 reveal reveal-delay-${i}`}
                    style={{ border: '1px solid #E5E7EB' }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                  >
                    <div className="text-[0.85rem] mb-3 tracking-[2px]" style={{ color: '#F59E0B' }}>★★★★★</div>
                    <p className="text-[0.87rem] leading-[1.7] mb-4 italic" style={{ color: '#4B5563' }}>"{t.text}"</p>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[0.72rem] font-bold text-white flex-shrink-0"
                        style={{ background: t.grad || 'linear-gradient(135deg,#0C628D,#2E86B5)' }}
                      >
                        {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[0.85rem] font-bold" style={{ color: '#111827' }}>{t.name}</div>
                        {t.role && <div className="text-[0.72rem]" style={{ color: '#9CA3AF' }}>{t.role}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] rounded-[20px]" style={{ border: '1px dashed #E5E7EB' }}>
                <p className="text-sm text-center" style={{ color: '#9CA3AF' }}>Belum ada testimoni. Jadilah yang pertama berbagi pengalaman!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== PARTNERS ===== */}
      <div className="py-16" style={{ background: '#fff', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <p className="text-center text-[0.78rem] font-semibold uppercase tracking-[.06em] mb-8" style={{ color: '#9CA3AF' }}>
            {S.alumniSectionTitle || 'Alumni kami bekerja di lebih dari 300 perusahaan'}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3">
            {(S.alumniPartners || PARTNERS).map((p) => (
              <div
                key={p}
                className="flex items-center gap-2 rounded-full px-[1.1rem] py-[0.45rem] text-[0.85rem] font-semibold transition-all cursor-default"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#4B5563' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E0F0FA'; e.currentTarget.style.color = '#0C628D'; e.currentTarget.style.background = '#F0F8FD'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#4B5563'; e.currentTarget.style.background = '#F9FAFB'; }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CTA — only for guests ===== */}
      {!isAuthed && <section
        className="py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #1a1f3c 50%, #111827 100%)' }}
      >
        <div className="absolute pointer-events-none" style={{ top: '-50%', left: '-20%', width: 800, height: 800, background: 'radial-gradient(circle, rgba(12,98,141,.25) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div className="absolute pointer-events-none" style={{ bottom: '-30%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(243,146,27,.15) 0%, transparent 60%)', borderRadius: '50%' }} />
        <div className="w-full max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            {/* Left */}
            <div className="reveal">
              <div className="text-[0.78rem] font-semibold uppercase tracking-[.05em] mb-4" style={{ color: '#F59E0B' }}>
                Mulai perjalananmu
              </div>
              <h2 className="font-display font-extrabold text-white mb-4 tracking-[-0.03em]" style={{ fontSize: 'clamp(2rem,3.5vw,3rem)', lineHeight: 1.1 }}>
                Satu Keputusan yang<br />Mengubah <span style={{ color: '#F3921B' }}>Karir Kamu</span>
              </h2>
              <p className="text-[1rem] leading-[1.7] mb-8" style={{ color: 'rgba(255,255,255,.5)' }}>
                Bergabung sekarang dan akses kursus gratis — tanpa kartu kredit, tanpa komitmen.
              </p>
              <div className="flex flex-col gap-2.5">
                {['Gratis untuk kursus intro — selamanya', 'Tidak butuh kartu kredit', 'Mulai belajar dalam 2 menit', 'Batalkan kapan saja'].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-[0.85rem] font-medium" style={{ color: 'rgba(255,255,255,.55)' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] flex-shrink-0" style={{ background: 'rgba(15,173,168,.2)', color: '#0FADA8' }}>✓</div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="reveal reveal-delay-2">
              <div
                className="rounded-[28px] p-10"
                style={{ background: 'rgba(255,255,255,.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,.12)' }}
              >
                <div className="font-display font-extrabold text-[1.35rem] text-white mb-1 tracking-[-0.03em]">Buat Akun Gratis</div>
                <div className="text-[0.85rem] mb-7" style={{ color: 'rgba(255,255,255,.4)' }}>Bergabung bersama 50.000+ pelajar aktif</div>

                <form onSubmit={handleCta} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[0.78rem] font-semibold uppercase tracking-[.04em] mb-1.5" style={{ color: 'rgba(255,255,255,.5)' }}>Email aktif</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@gmail.com"
                      className="w-full rounded-[10px] px-4 py-3 text-[0.93rem] outline-none transition-all font-[inherit]"
                      style={{
                        background: 'rgba(255,255,255,.08)',
                        border: '1.5px solid rgba(255,255,255,.12)',
                        color: '#fff',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(12,98,141,.7)'; e.currentTarget.style.background = 'rgba(255,255,255,.1)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'; e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full font-bold text-[0.97rem] rounded-[10px] py-[0.95rem] transition-all"
                    style={{ background: 'linear-gradient(135deg, #F3921B, #D97C0D)', color: '#fff', boxShadow: '0 4px 15px rgba(243,146,27,.35)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(243,146,27,.45)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(243,146,27,.35)'; }}
                  >
                    Buat Akun Gratis — Mulai Sekarang
                  </button>
                </form>
                <p className="text-[0.73rem] text-center mt-3" style={{ color: 'rgba(255,255,255,.3)' }}>
                  Dengan mendaftar, kamu setuju dengan{' '}
                  <Link to="/tentang-kami" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'underline' }}>Syarat & Ketentuan</Link>{' '}dan{' '}
                  <Link to="/kebijakan-privasi" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'underline' }}>Kebijakan Privasi</Link> kami.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>}

    </div>
  );
}
