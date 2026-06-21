import { useEffect, useState } from 'react';
import { Container, Card, Button } from '../components/ui';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AboutUs() {
  const { api, isAuthed, role } = useAuth();
  const [aboutText, setAboutText] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [textRes, teachersRes] = await Promise.all([
          api.get('/about/text'),
          api.get('/about/teachers'),
        ]);
        setAboutText(textRes.data.text);
        setTeachers(teachersRes.data.teachers || []);
      } catch (err) {
        console.error('Failed to load about page:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Memuat...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-20">
        <Container>
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
              {aboutText?.title || 'Tentang EduPoint'}
            </h1>
            <p className="text-xl text-slate-300">
              {aboutText?.tagline || 'Platform Pembelajaran Terpadu'}
            </p>
          </div>
        </Container>
      </section>

      {/* About Section */}
      <section className="py-16">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-slate-700 leading-relaxed mb-12">
              {aboutText?.description ||
                'Kami menyediakan platform pembelajaran online yang inovatif dengan fitur quiz interaktif untuk mendukung pengembangan skill Anda.'}
            </p>
          </div>

          {/* Mission & Vision Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Misi Kami</h3>
              <p className="text-slate-700 leading-relaxed">
                {aboutText?.mission ||
                  'Memberdayakan individu melalui pendidikan berkualitas tinggi yang dapat diakses oleh semua orang.'}
              </p>
            </Card>
            <Card className="p-8 bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Visi Kami</h3>
              <p className="text-slate-700 leading-relaxed">
                {aboutText?.vision ||
                  'Menjadi platform pembelajaran terdepan yang menginspirasi dan mengembangkan talenta Indonesia.'}
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-slate-50">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">
              Tim Pengajar Kami
            </h2>
            <p className="text-slate-600">Mentor berpengalaman yang siap membimbing Anda</p>
          </div>

          {teachers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {teachers.map((teacher) => (
                <Card key={teacher._id} className="p-6 text-center hover:shadow-lg transition-shadow">
                  {/* Avatar */}
                  <div className="mb-4 flex justify-center">
                    {teacher.imageUrl ? (
                      <img
                        src={teacher.imageUrl}
                        alt={teacher.name}
                        className="h-20 w-20 rounded-full object-cover bg-slate-200"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {getInitials(teacher.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <h3 className="text-lg font-bold text-slate-900">{teacher.name}</h3>
                  {teacher.role && (
                    <p className="text-sm font-semibold text-primary mt-1">{teacher.role}</p>
                  )}
                  {teacher.bio && (
                    <p className="text-sm text-slate-600 mt-3 line-clamp-3">{teacher.bio}</p>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <p className="text-slate-600">Belum ada pengajar yang ditampilkan</p>
            </Card>
          )}

          {/* Admin Button */}
          {isAuthed && role === 'admin' && (
            <div className="mt-8 text-center">
              <Link to="/dashboard/about">
                <Button className="bg-primary text-white">
                  Kelola Tentang Kami
                </Button>
              </Link>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
