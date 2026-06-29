import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DsPage, DsCourseCard, DsEmpty } from '../components/ds';
import { PageSpinner } from '../components/PageSpinner';

function priceLabel(c) {
  if (!c.priceIdr || c.priceIdr === 0) return { text: 'Gratis', kind: 'free' };
  return { text: `Rp ${Number(c.priceIdr).toLocaleString('id-ID')}`, kind: 'paid' };
}

export default function StudentCatalog() {
  const { api } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('Semua');
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');

  // Sinkronkan dengan pencarian dari topbar (?q=)
  useEffect(() => {
    setQ(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    if (!api) return;
    api.get('/courses')
      .then(r => setCourses(r.data.courses || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [api]);

  const categories = useMemo(() => {
    const set = new Set();
    courses.forEach(c => { if (c.categoryId?.name) set.add(c.categoryId.name); });
    return ['Semua', ...[...set].sort()];
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter(c => {
      const matchCat = cat === 'Semua' || c.categoryId?.name === cat;
      const matchQ = !q || (c.title || '').toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [courses, cat, q]);

  if (loading) return <PageSpinner fullPage />;

  return (
    <DsPage title="Katalog Kursus" subtitle={`${courses.length} kursus dari instruktur terbaik`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', height: 38, maxWidth: 360, marginBottom: 16 }}>
        <i className="ti ti-search" style={{ fontSize: 15, color: '#9CA3AF' }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Cari kursus…"
          style={{ border: 'none', background: 'none', fontSize: 13, color: '#111827', outline: 'none', width: '100%' }}
        />
      </div>

      <div className="ds-filter-chips">
        {categories.map(c => (
          <div key={c} className={`ds-chip${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="ds-card"><DsEmpty icon="ti-search-off">Tidak ada kursus yang cocok dengan pencarianmu.</DsEmpty></div>
      ) : (
        <div className="ds-c-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {filtered.map(c => (
            <DsCourseCard
              key={c._id}
              to={`/courses/${c._id}`}
              image={c.coverImageUrl}
              icon="ti-book"
              pill={priceLabel(c)}
              title={c.title}
              metaLeft={c.categoryId?.name || 'Kursus'}
              metaRight={`${c.lessonCount ?? 0} materi`}
            />
          ))}
        </div>
      )}
    </DsPage>
  );
}
