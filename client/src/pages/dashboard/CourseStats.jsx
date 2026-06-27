import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Container } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export default function CourseStats() {
  const { courseId } = useParams();
  const { api, role } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (role !== 'admin' && role !== 'teacher') {
      nav('/dashboard');
      return;
    }

    async function load() {
      try {
        const res = await api.get(`/courses/${courseId}/stats`);
        setStats(res.data);
      } catch (e) {
        setError(e?.response?.data?.error?.message || 'Gagal memuat statistik');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [courseId, role]);

  if (loading) {
    return (
      <section className="py-10">
        <Container>
          <div className="text-center text-slate-600">Memuat data...</div>
        </Container>
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className="py-10">
        <Container>
          <div className="bg-rose-50 border border-rose-200 rounded p-6 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-rose-900 mb-2">⚠️ Error</h2>
            <p className="text-sm text-rose-700 mb-4">{error || 'Data tidak ditemukan'}</p>
            <Button variant="outline" onClick={() => nav(`/dashboard/courses?course=${courseId}`)}>
              Kembali
            </Button>
          </div>
        </Container>
      </section>
    );
  }

  const completionRate = stats.enrolledCount > 0 ? Math.round((stats.completedCount / stats.enrolledCount) * 100) : 0;

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}><section className="px-6 py-8" style={{ background: '#F7F8FA' }}>
      <Container className="space-y-6 !px-0" style={{ maxWidth: 'none' }}>
        <Card className="overflow-hidden">
          <div className="px-6 py-8 text-white sm:px-8" style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #111827 60%, #0C628D 100%)' }}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">Course analytics</div>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Statistik Course</h1>
                <p className="mt-2 text-sm text-slate-100/90">{stats.courseTitle}</p>
              </div>
              <Button variant="outline" className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => nav(`/dashboard/courses?course=${courseId}`)}>
                Kembali
              </Button>
            </div>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-4">
            <Card className="rounded-2xl border-l-4 border-l-blue-500 p-5 shadow-none">
              <div className="text-sm text-slate-600">Total Pendaftar</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{stats.enrolledCount}</div>
            </Card>
            <Card className="rounded-2xl border-l-4 border-l-green-500 p-5 shadow-none">
              <div className="text-sm text-slate-600">Sedang Aktif</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{stats.activeCount}</div>
            </Card>
            <Card className="rounded-2xl border-l-4 border-l-purple-500 p-5 shadow-none">
              <div className="text-sm text-slate-600">Selesai</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{stats.completedCount}</div>
            </Card>
            <Card className="rounded-2xl border-l-4 border-l-orange-500 p-5 shadow-none">
              <div className="text-sm text-slate-600">Completion Rate</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{completionRate}%</div>
            </Card>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Rekap pendaftar course</h2>
              <p className="mt-1 text-sm text-slate-600">Daftar peserta yang sudah terdaftar, aktif, atau selesai pada course ini.</p>
            </div>
          </div>
          
          {stats.students && stats.students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Nama</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Terdaftar</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.students.map((student) => (
                    <tr key={student._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{student.fullName || student.name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{student.email}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(student.enrolledAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        {student.isCompleted ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                            Selesai
                          </span>
                        ) : student.isActive ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                            Terdaftar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600">Belum ada siswa yang terdaftar</div>
          )}
        </Card>
      </Container>
    </section></div>
  );
}
