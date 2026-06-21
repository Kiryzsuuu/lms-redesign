import { Container, Card } from '../components/ui';

const infoPages = {
  features: {
    title: 'Fitur Pembelajaran',
    content: [
      {
        heading: 'Pembelajaran Interaktif',
        description: 'Materi pembelajaran dirancang dengan video, teks, dan visualisasi yang menarik untuk pengalaman belajar yang optimal.'
      },
      {
        heading: 'Quiz & Kuis Interaktif',
        description: 'Uji pemahaman Anda dengan quiz interaktif yang mendukung multiple choice, essay, dan matching questions.'
      },
      {
        heading: 'Progress Tracking',
        description: 'Pantau progress belajar Anda secara real-time dengan dashboard yang komprehensif.'
      }
    ]
  },
  quiz: {
    title: 'Quiz & Sertifikat',
    content: [
      {
        heading: 'Quiz Fleksibel',
        description: 'Ikuti quiz kapan saja dengan berbagai tipe soal yang disesuaikan dengan materi pembelajaran.'
      },
      {
        heading: 'Sertifikat Resmi',
        description: 'Dapatkan sertifikat resmi setelah menyelesaikan course untuk ditampilkan di profil profesional Anda.'
      },
      {
        heading: 'Hasil Terperinci',
        description: 'Lihat analisis mendalam tentang performa Anda dengan rekomendasi untuk peningkatan.'
      }
    ]
  },
  analytics: {
    title: 'Analitik Pengguna',
    content: [
      {
        heading: 'Dashboard Analitik',
        description: 'Pantau statistik pembelajaran Anda termasuk waktu belajar, nilai quiz, dan progress kursus.'
      },
      {
        heading: 'Insights Pembelajaran',
        description: 'Dapatkan insights tentang area mana yang perlu ditingkatkan berdasarkan data pembelajaran Anda.'
      },
      {
        heading: 'Export Data',
        description: 'Export data pembelajaran Anda dalam berbagai format untuk analisis lebih lanjut.'
      }
    ]
  },
  faq: {
    title: 'Pertanyaan Umum (FAQ)',
    content: [
      {
        heading: 'Bagaimana cara mendaftar?',
        description: 'Klik tombol "Daftar" di halaman utama, isi email dan password Anda, kemudian verifikasi email untuk menyelesaikan pendaftaran.'
      },
      {
        heading: 'Bagaimana cara membeli course?',
        description: 'Pilih course yang ingin dibeli, masukkan ke keranjang, dan lakukan pembayaran melalui metode yang tersedia.'
      },
      {
        heading: 'Bagaimana cara mendapatkan sertifikat?',
        description: 'Selesaikan semua materi course dan lulus quiz dengan skor minimum yang ditentukan untuk mendapatkan sertifikat.'
      },
      {
        heading: 'Apakah saya bisa mengakses course selamanya?',
        description: 'Ya, setelah membeli course, Anda memiliki akses selamanya untuk belajar kapan saja.'
      }
    ]
  },
  privacy: {
    title: 'Kebijakan Privasi',
    content: [
      {
        heading: 'Pengumpulan Data',
        description: 'Kami mengumpulkan informasi pribadi Anda seperti nama, email, dan aktivitas pembelajaran untuk memberikan layanan terbaik.'
      },
      {
        heading: 'Penggunaan Data',
        description: 'Data Anda digunakan untuk meningkatkan pengalaman pembelajaran, memberikan rekomendasi, dan komunikasi penting.'
      },
      {
        heading: 'Keamanan Data',
        description: 'Kami menggunakan enkripsi dan protokol keamanan terbaru untuk melindungi data pribadi Anda.'
      },
      {
        heading: 'Privasi Pengguna',
        description: 'Kami menghormati privasi Anda dan tidak akan membagikan informasi pribadi Anda kepada pihak ketiga tanpa persetujuan.'
      }
    ]
  }
};

export function InfoPage({ type = 'features' }) {
  const pageData = infoPages[type] || infoPages.features;

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <Container>
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">{pageData.title}</h1>
          <div className="h-1 w-24 bg-primary rounded-full"></div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-1">
          {pageData.content.map((item, idx) => (
            <Card key={idx} className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">{item.heading}</h2>
              <p className="text-slate-600 leading-relaxed">{item.description}</p>
            </Card>
          ))}
        </div>
      </Container>
    </div>
  );
}
