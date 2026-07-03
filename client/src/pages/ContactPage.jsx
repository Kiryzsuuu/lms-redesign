import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

function ContactCard({ icon, title, value, href }) {
  return (
    <a
      href={href || '#'}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
        padding: '20px 22px', textDecoration: 'none', transition: 'box-shadow .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(12,98,141,.1)'; e.currentTarget.style.borderColor = '#0C628D'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EBF6FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 20, color: '#0C628D' }} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>{value}</div>
      </div>
    </a>
  );
}

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F7F8FA' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        {/* Hero */}
        <div style={{ background: '#1B3A5C', padding: '56px 24px 48px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Hubungi Kami
            </div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 12 }}>
              Ada pertanyaan? Kami siap membantu.
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,.55)', lineHeight: 1.65, maxWidth: 480 }}>
              Tim Edulyfe akan merespons pesan Anda secepatnya pada hari kerja.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 48 }}>
            <ContactCard
              icon="ti-mail"
              title="Email"
              value="support@edulyfe.id"
              href="mailto:support@edulyfe.id"
            />
            <ContactCard
              icon="ti-brand-whatsapp"
              title="WhatsApp"
              value="+62 857-3082-3682"
              href="https://wa.me/6285730823682"
            />
            <ContactCard
              icon="ti-brand-instagram"
              title="Instagram"
              value="@edulyfe.id"
              href="https://instagram.com/edulyfe.id"
            />
            <ContactCard
              icon="ti-clock"
              title="Jam Operasional"
              value="Senin – Jumat, 08.00 – 17.00 WIB"
            />
          </div>

          {/* Info box */}
          <div style={{ background: '#EBF6FC', border: '1px solid #BFE0F0', borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0C628D', marginBottom: 6 }}>
              Tentang Respons Kami
            </div>
            <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>
              Kami berupaya membalas setiap pertanyaan dalam waktu 1×24 jam pada hari kerja. Untuk pertanyaan umum, silakan cek halaman <a href="/faq" style={{ color: '#0C628D', fontWeight: 600 }}>FAQ</a> terlebih dahulu — mungkin jawaban Anda sudah ada di sana.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
