import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DsPage, DsCourseCard, DsEmpty } from '../components/ds';
import { PageSpinner } from '../components/PageSpinner';

function progressOf(c) {
  if (c.progressPercent != null) return Math.round(c.progressPercent);
  const total = (c.modules || []).reduce((s, m) => s + (m.lessons || []).length, 0);
  const done = (c.modules || []).reduce((s, m) => s + (m.lessons || []).filter(l => l.completed).length, 0);
  return total ? Math.round((done / total) * 100) : 0;
}

export default function StudentCourses() {
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

  return (
    <DsPage title="Kursus Saya" subtitle={`${courses.length} kursus yang kamu ikuti`}>
      {courses.length === 0 ? (
        <div className="ds-card">
          <DsEmpty icon="ti-book-off">
            Belum ada kursus. <Link to="/dashboard/catalog" style={{ color: '#0C628D', fontWeight: 600 }}>Jelajahi katalog</Link> untuk mulai belajar.
          </DsEmpty>
        </div>
      ) : (
        <div className="ds-c-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {courses.map(c => (
            <DsCourseCard
              key={c._id}
              to={`/courses/${c._id}`}
              image={c.coverImageUrl}
              icon="ti-book"
              pill={{ text: 'Aktif', kind: 'active' }}
              title={c.title}
              progress={progressOf(c)}
              metaLeft={c.categoryId?.name || 'Kursus'}
              metaRight={`${(c.modules || []).reduce((s, m) => s + (m.lessons || []).length, 0)} materi`}
            />
          ))}
          <Link to="/dashboard/catalog" className="ds-add-card">
            <i className="ti ti-plus" />
            <span>Jelajahi katalog</span>
          </Link>
        </div>
      )}
    </DsPage>
  );
}
