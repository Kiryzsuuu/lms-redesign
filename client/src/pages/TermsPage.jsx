import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: 'Definisi',
    items: [
      '"Platform" merujuk pada layanan Edulyfe, baik melalui web maupun aplikasi.',
      '"Pengguna" adalah setiap orang yang mendaftar dan menggunakan Platform.',
      '"Konten" mencakup seluruh materi, video, teks, kuis, dan sertifikat yang tersedia di Platform.',
    ],
  },
  {
    title: 'Akun Pengguna',
    items: [
      'Pengguna wajib memberikan data yang benar, akurat, dan terkini saat registrasi.',
      'Pengguna bertanggung jawab menjaga kerahasiaan akun dan kata sandi.',
      'Satu akun hanya diperuntukkan bagi satu orang dan tidak boleh dipindahtangankan atau dibagikan.',
      'Segala aktivitas yang terjadi melalui akun Anda menjadi tanggung jawab Anda.',
    ],
  },
  {
    title: 'Pembelian & Pembayaran',
    items: [
      'Harga kursus tertera jelas sebelum proses pembayaran.',
      'Pembayaran dilakukan melalui metode yang tersedia di Platform.',
      'Akses kursus diberikan setelah pembayaran berhasil dikonfirmasi.',
      'Voucher atau kode diskon berlaku sesuai ketentuan dan masa berlaku yang ditetapkan.',
    ],
  },
  {
    title: 'Akses Kursus',
    items: [
      'Setelah pembelian, Pengguna memperoleh akses untuk mempelajari kursus sesuai ketentuan masing-masing kursus.',
      'Akses bersifat pribadi dan hanya untuk kebutuhan belajar Pengguna.',
      'Edulyfe berhak memperbarui, mengubah, atau menghentikan konten kursus tertentu demi peningkatan kualitas.',
    ],
  },
  {
    title: 'Kebijakan Pengembalian Dana (Refund)',
    items: [
      'Pengembalian dana hanya dapat diajukan sesuai kebijakan refund yang berlaku (dalam jangka waktu tertentu setelah pembelian dan sebelum menyelesaikan sebagian besar materi).',
      'Pengembalian dana tidak berlaku apabila kursus telah diselesaikan atau sertifikat telah diterbitkan.',
    ],
  },
  {
    title: 'Sertifikat',
    items: [
      'Sertifikat penyelesaian diberikan setelah Pengguna menyelesaikan seluruh syarat kursus.',
      'Sertifikat menunjukkan penyelesaian materi dan bukan merupakan akreditasi formal kecuali dinyatakan lain.',
    ],
  },
  {
    title: 'Hak Kekayaan Intelektual',
    items: [
      'Seluruh konten di Platform dilindungi hak cipta dan merupakan milik Edulyfe atau pihak yang bekerja sama dengannya.',
      'Pengguna dilarang menyalin, menyebarkan, menjual, atau memperbanyak konten tanpa izin tertulis.',
    ],
  },
  {
    title: 'Larangan Penggunaan',
    items: [
      'Pengguna dilarang menyalahgunakan Platform untuk tujuan melanggar hukum.',
      'Pengguna dilarang membagikan akun, merekam, atau mendistribusikan ulang materi kursus.',
      'Pelanggaran dapat mengakibatkan penangguhan atau penghapusan akun tanpa pengembalian dana.',
    ],
  },
  {
    title: 'Batasan Tanggung Jawab',
    items: [
      'Edulyfe berupaya menyediakan layanan terbaik, namun tidak menjamin Platform bebas dari gangguan teknis.',
      'Edulyfe tidak bertanggung jawab atas kerugian akibat gangguan jaringan, kesalahan pengguna, atau hal di luar kendali kami.',
    ],
  },
  {
    title: 'Perubahan Syarat & Ketentuan',
    items: [
      'Edulyfe berhak mengubah syarat dan ketentuan ini sewaktu-waktu.',
      'Perubahan akan diberitahukan melalui Platform, dan penggunaan berkelanjutan dianggap sebagai persetujuan atas perubahan tersebut.',
    ],
  },
  {
    title: 'Kebijakan Privasi',
    items: [
      'Data pribadi Pengguna dikelola sesuai Kebijakan Privasi Edulyfe dan tidak akan disalahgunakan.',
    ],
  },
  {
    title: 'Kontak',
    items: [
      'Untuk pertanyaan terkait syarat dan ketentuan, Pengguna dapat menghubungi tim dukungan Edulyfe melalui kanal resmi yang tersedia.',
    ],
  },
];

export default function TermsPage() {
  return (
    <>
        {/* Hero */}
        <div style={{ background: '#1B3A5C', padding: '56px 24px 48px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Legal
            </div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 12 }}>
              Syarat &amp; Ketentuan
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,.55)', lineHeight: 1.65 }}>
              Dengan mendaftar, membeli, atau menggunakan layanan Edulyfe, Anda dianggap telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan berikut.
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
          {SECTIONS.map((sec, i) => (
            <section key={sec.title} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0C628D', background: '#EBF6FC', borderRadius: 99, padding: '2px 10px', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>{sec.title}</h2>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc' }}>
                {sec.items.map((item, j) => (
                  <li key={j} style={{ fontSize: '0.93rem', color: '#374151', lineHeight: 1.7, marginBottom: 6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 24, marginTop: 12 }}>
            <Link
              to="/contact-us"
              style={{ color: '#0C628D', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}
            >
              Hubungi Kami →
            </Link>
          </div>
        </div>
    </>
  );
}
