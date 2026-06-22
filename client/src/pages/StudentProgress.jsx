import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DsPage, DsCard, DsEmpty } from '../components/ds';
import { PageSpinner } from '../components/PageSpinner';

function stats(c) {
  const total = (c.modules || []).reduce((s, m) => s + (m.lessons || []).length, 0);
  const done = (c.modules || []).reduce((s, m) => s + (m.lessons || []).filter(l => l.completed).length, 0);
  const pct = c.progressPercent != null ? Math.round(c.progressPercent) : (total ? Math.round((done / total) * 100) : 0);
  return { total, done, pct };
}

export default function StudentProgress() {
  const { api } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    api.get('/courses/my-courses')
      .then(r => setCourses(r.data.courses || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <PageSpinner fullPage />;

  const avg = courses.length ? Math.round(courses.reduce((s, c) => s + stats(c).pct, 0) / courses.length) : 0;
  const completed = courses.filter(c => stats(c).pct >= 100).length;

  return (
    <DsPage title="Nilai & Progress" subtitle="Pantau kemajuan belajarmu di setiap kursus">
      {courses.length === 0 ? (
        <DsCard>
          <DsEmpty icon="ti-chart-bar">
            Belum ada progress. <Link to="/dashboard/catalog" style={{ color: '#0C628D', fontWeight: 600 }}>Mulai belajar</Link> dari katalog.
          </DsEmpty>
        </DsCard>
      ) : (
        <div className="ds-two-col">
          <div>
            {courses.map(c => {
              const s = stats(c);
              return (
                <DsCard key={c._id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', minWidth: 0 }}>{c.title}</div>
                    <Link to={`/courses/${c._id}`} className="ds-sec-link" style={{ flexShrink: 0 }}>
                      Buka <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
                    </Link>
                  </div>
                  <div className="ds-prog-row">
                    <div className="ds-prog-bar"><div className="ds-prog-fill" style={{ width: `${s.pct}%`, background: s.pct >= 100 ? '#0FADA8' : '#0C628D' }} /></div>
                    <div className="ds-prog-pct" style={{ color: s.pct >= 100 ? '#0FADA8' : '#0C628D' }}>{s.pct}%</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                    {s.done} dari {s.total} materi selesai
                  </div>
                </DsCard>
              );
            })}
          </div>
          <div>
            <DsCard>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Ringkasan</div>
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 44, fontWeight: 700, color: '#0C628D', lineHeight: 1 }}>{avg}%</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>progres rata-rata</div>
              </div>
              <div className="ds-pbar" style={{ height: 8, borderRadius: 4, marginBottom: 14 }}>
                <div className="ds-pfill" style={{ width: `${avg}%`, height: 8, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#4B5563' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kursus Diikuti</span><span style={{ fontWeight: 700, color: '#111827' }}>{courses.length}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kursus Selesai</span><span style={{ fontWeight: 700, color: '#0FADA8' }}>{completed}</span></div>
              </div>
            </DsCard>
          </div>
        </div>
      )}
    </DsPage>
  );
}
