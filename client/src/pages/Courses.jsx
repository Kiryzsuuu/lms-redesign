import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Input } from '../components/ui';
import { useAuth } from '../lib/auth';

const THUMB_GRADIENTS = [
  'linear-gradient(135deg, #0C628D 0%, #2E86B5 100%)',
  'linear-gradient(135deg, #F3921B 0%, #F5C97A 100%)',
  'linear-gradient(135deg, #0FADA8 0%, #84CC16 100%)',
  'linear-gradient(135deg, #6C5CE7 0%, #2E86B5 100%)',
  'linear-gradient(135deg, #E84393 0%, #F3921B 100%)',
  'linear-gradient(135deg, #374151 0%, #0C628D 100%)',
];

function formatIdr(n) {
  try {
    return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
  } catch {
    return String(n || 0);
  }
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export default function Courses() {
  const { api, role, isAuthed } = useAuth();
  const nav = useNavigate();
  const [courses, setCourses] = useState([]);
  const [purchasedCourseIds, setPurchasedCourseIds] = useState(new Set());
  const [completedCourseIds, setCompletedCourseIds] = useState(new Set());
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [q, setQ] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api.get('/courses').then((res) => setCourses(res.data.courses || [])).catch(() => setCourses([]));

    function onProgressChanged() {
      loadStudentState();
    }

    async function loadStudentState() {
      if (!isAuthed) {
        if (!cancelled) {
          setPurchasedCourseIds(new Set());
          setCompletedCourseIds(new Set());
          setActiveCourseId(null);
        }
        return;
      }

      try {
        const [myRes, progRes] = await Promise.all([api.get('/courses/my-courses'), api.get('/progress/me')]);
        const purchasedIds = new Set((myRes.data.courses || []).map((c) => c._id));
        const completedIds = new Set((progRes.data.completedCourseIds || []).map((x) => String(x)));
        const activeId = progRes.data.activeCourseId ? String(progRes.data.activeCourseId) : null;
        if (!cancelled) {
          setPurchasedCourseIds(purchasedIds);
          setCompletedCourseIds(completedIds);
          setActiveCourseId(activeId);
        }
      } catch {
        if (!cancelled) {
          setPurchasedCourseIds(new Set());
          setCompletedCourseIds(new Set());
          setActiveCourseId(null);
        }
      }
    }

    window.addEventListener('progress:changed', onProgressChanged);
    loadStudentState();

    return () => {
      cancelled = true;
      window.removeEventListener('progress:changed', onProgressChanged);
    };
  }, [isAuthed, api]);

  async function addToCart(courseId) {
    setError('');
    try {
      await api.post('/cart/items', { courseId });
      window.dispatchEvent(new Event('cart:changed'));
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal tambah ke cart');
    }
  }

  const filtered = courses.filter((c) => {
    const isFree = !c.priceIdr || c.priceIdr === 0;

    const matchesSearch = !q.trim() ||
      (c.title || '').toLowerCase().includes(q.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(q.toLowerCase());

    const matchesPrice =
      priceFilter === 'all' ||
      (priceFilter === 'free' && isFree) ||
      (priceFilter === 'paid' && !isFree);

    return matchesSearch && matchesPrice;
  });

  return (
    <div className="min-h-screen" style={{ background: '#F7F8FA' }}>
      <section className="py-14">
        <Container>
          <div className="mb-10">
            <div className="section-eyebrow">Course Catalog</div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold mb-3" style={{ color: '#111827', letterSpacing: '-0.03em' }}>
              Explore Courses
            </h1>
            <p className="text-lg text-gray-500">Choose a course that fits your needs and start learning today</p>
          </div>

          {/* Search and Filter */}
          <div className="space-y-4">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search courses by name or description..."
                className="pl-11 py-3 text-base"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: `Semua (${courses.length})` },
                { key: 'free', label: `Gratis (${courses.filter(c => !c.priceIdr || c.priceIdr === 0).length})` },
                { key: 'paid', label: `Berbayar (${courses.filter(c => c.priceIdr && c.priceIdr > 0).length})` },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPriceFilter(f.key)}
                  className={`filter-chip${priceFilter === f.key ? ' active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-rose-50 border border-rose-200 rounded-[10px] p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Course Grid */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => {
              const isFree = !c.priceIdr || c.priceIdr === 0;
              const isPurchased = purchasedCourseIds.has(c._id);
              const isCompleted = completedCourseIds.has(String(c._id));
              const isOngoing = isAuthed && activeCourseId && String(c._id) === String(activeCourseId) && !isCompleted;

              return (
                <div
                  key={c._id}
                  className="overflow-hidden flex flex-col rounded-[20px] bg-white border border-gray-200 transition-all duration-[250ms]"
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 25px rgba(0,0,0,.10),0 8px 10px rgba(0,0,0,.06)'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                >
                  {/* Thumbnail */}
                  <div
                    className="h-[176px] relative flex-shrink-0 overflow-hidden"
                    style={{ background: c.coverImageUrl ? undefined : THUMB_GRADIENTS[i % THUMB_GRADIENTS.length] }}
                  >
                    {c.coverImageUrl ? (
                      <img src={c.coverImageUrl} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/svg%3E")`,
                        }}
                      />
                    )}

                    {/* Badge */}
                    <div className="absolute top-3 right-3">
                      {isCompleted ? (
                        <span className="text-[0.7rem] font-bold uppercase px-2 py-1 rounded-[6px] bg-teal-500 text-white">
                          Selesai
                        </span>
                      ) : isOngoing ? (
                        <span className="text-[0.7rem] font-bold uppercase px-2 py-1 rounded-[6px] bg-amber-400 text-gray-900">
                          Berlangsung
                        </span>
                      ) : isFree ? (
                        <span className="text-[0.7rem] font-bold uppercase px-2 py-1 rounded-[6px] bg-white text-gray-800">
                          Gratis
                        </span>
                      ) : (
                        <span
                          className="text-[0.7rem] font-bold uppercase px-2 py-1 rounded-[6px] text-white"
                          style={{ background: '#F3921B' }}
                        >
                          Premium
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 p-5 flex flex-col">
                    <h3 className="font-display font-extrabold text-[0.97rem] line-clamp-2 mb-2 text-gray-900">
                      {c.title}
                    </h3>
                    <p className="text-sm line-clamp-2 flex-1 text-gray-500">
                      {stripHtml(c.description) || 'Kursus berkualitas untuk pengembangan skill Anda'}
                    </p>

                    <div className="mt-4 pt-3 flex justify-between items-center border-t border-gray-100">
                      <span className="font-extrabold text-[1.05rem]" style={{ color: '#0C628D' }}>
                        {isFree ? 'Gratis' : `Rp ${formatIdr(c.priceIdr)}`}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {!isAuthed ? (
                        <button
                          className="flex-1 font-semibold rounded-[10px] py-[0.6rem] text-sm text-white transition-all duration-200"
                          style={{ background: '#0C628D', boxShadow: '0 1px 2px rgba(12,98,141,.3)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#0A527A'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#0C628D'; e.currentTarget.style.transform = 'none'; }}
                          onClick={() => nav('/login')}
                        >
                          Login untuk Lihat
                        </button>
                      ) : purchasedCourseIds.has(c._id) ? (
                        <Link to={`/courses/${c._id}`} className="flex-1">
                          <button
                            className="w-full font-semibold rounded-[10px] py-[0.6rem] text-sm text-white transition-all duration-200"
                            style={{ background: '#0C628D', boxShadow: '0 1px 2px rgba(12,98,141,.3)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#0A527A'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#0C628D'; e.currentTarget.style.transform = 'none'; }}
                          >
                            Open Course
                          </button>
                        </Link>
                      ) : (
                        <>
                          <Link to={`/courses/${c._id}`} className="flex-1">
                            <button
                              className="w-full font-semibold rounded-[10px] py-[0.6rem] text-sm text-gray-700 border border-gray-200 transition-all duration-200 bg-white"
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = '#F9FAFB'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#FFFFFF'; }}
                            >
                              Detail
                            </button>
                          </Link>
                          {role === 'student' && (
                            <button
                              className="flex-1 font-semibold rounded-[10px] py-[0.6rem] text-sm text-white transition-all duration-200"
                              style={{ background: '#F3921B', boxShadow: '0 1px 2px rgba(243,146,27,.3)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#D97C0D'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#F3921B'; e.currentTarget.style.transform = 'none'; }}
                              onClick={() => addToCart(c._id)}
                            >
                              Tambah ke Keranjang
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="p-14 text-center rounded-[20px] bg-white border border-gray-200">
                  <p className="font-display font-extrabold text-xl mb-2 text-gray-700">No Courses Found</p>
                  <p className="text-sm text-gray-500">Coba ubah filter atau cari dengan kata kunci lain</p>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}
