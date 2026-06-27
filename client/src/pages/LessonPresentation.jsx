import { PageSpinner } from '../components/PageSpinner';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const C = {
  blue: '#0C628D', blueM: '#1178AB', blueD: '#084E72', blueS: '#C8E6F5', blueXs: '#EBF6FC',
  orange: '#F3921B', orangeXs: '#FEF5E7',
  teal: '#0BA894', tealS: '#B2EFE9', tealXs: '#E8FAF8',
  violet: '#7C3AED', violetXs: '#F5F3FF',
  amber: '#D97706', amberXs: '#FFFBEB',
  n950: '#0F172A', n900: '#1E293B', n800: '#334155', n700: '#475569',
  n600: '#64748B', n500: '#94A3B8', n400: '#CBD5E1', n300: '#E2E8F0',
  n200: '#F1F5F9', n100: '#F8FAFC', white: '#FFFFFF',
};
const TB_H = 58;
const SB_W = 300;

function getLessonType(lesson) {
  if (!lesson) return 'read';
  if (lesson.quizId) return 'quiz';
  if (lesson.assignmentId) return 'project';
  if (lesson.videoEmbedUrl) return 'video';
  return 'read';
}

const TM = {
  video:   { bg: C.blueXs,   col: C.blue,   lbl: 'Video'   },
  read:    { bg: C.violetXs, col: C.violet, lbl: 'Bacaan'  },
  quiz:    { bg: C.amberXs,  col: C.amber,  lbl: 'Quiz'    },
  project: { bg: C.tealXs,   col: C.teal,   lbl: 'Project' },
};
const BS = {
  video:   { background: C.blueXs,   color: C.blue   },
  read:    { background: C.violetXs, color: C.violet },
  quiz:    { background: C.amberXs,  color: C.amber  },
  project: { background: C.tealXs,   color: C.teal   },
};

function cleanHtml(html) {
  let s = String(html || '');
  s = s.replace(/<li>\s*<p>\s*(?:<br\s*\/?\s*>)\s*<\/p>\s*<\/li>/gi, '');
  s = s.replace(/<li>\s*<p>\s*<\/p>\s*<\/li>/gi, '');
  s = s.replace(/<li>\s*(?:<br\s*\/?\s*>)\s*<\/li>/gi, '');
  return s;
}

function MarkdownText({ text }) {
  return (
    <div style={{ fontSize: '0.88rem', color: C.n700, lineHeight: 1.85 }}>
      {String(text || '').split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: '0.96rem', fontWeight: 800, color: C.n900, margin: '1rem 0 0.4rem' }}>{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: '1.1rem', fontWeight: 800, color: C.n900, margin: '1.2rem 0 0.5rem' }}>{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.n950, margin: '1.5rem 0 0.6rem' }}>{line.slice(2)}</h1>;
        if (!line.trim()) return <div key={i} style={{ height: '0.5rem' }} />;
        return <p key={i} style={{ marginBottom: '0.85rem' }}>{line}</p>;
      })}
    </div>
  );
}

export default function LessonPresentation() {
  const { id, lessonId } = useParams();
  const nav = useNavigate();
  const { api, role, user } = useAuth();
  const [sp] = useSearchParams();
  const isPreview = sp.get('preview') === '1' && (role === 'admin' || role === 'teacher');
  const previewQs = isPreview ? '?preview=1' : '';

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonProgress, setLessonProgress] = useState({});
  const [progress, setProgress] = useState({ activeCourseId: null });
  const [cert, setCert] = useState({ eligible: false, completed: 0, total: 0 });

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [openMods, setOpenMods] = useState(new Set());
  const [view, setView] = useState('materi');
  const [viewModId, setViewModId] = useState(null);
  const [activeTab, setActiveTab] = useState('materi');
  const [note, setNote] = useState('');
  const [lockError, setLockError] = useState('');
  const [markingDone, setMarkingDone] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentPosting, setCommentPosting] = useState(false);
  const [courseError, setCourseError] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState([]);

  useEffect(() => {
    setCourseError('');
    setCourse(null);
    setModules([]);
    setLessons([]);
    setLessonProgress({});
    setCert({ eligible: false, completed: 0, total: 0 });
    api.get(isPreview ? `/courses/${id}/preview` : `/courses/${id}`)
      .then(res => {
        setCourse(res.data.course);
        const mods = res.data.modules || [];
        const lsns = res.data.lessons || [];
        setModules(mods);
        setLessons(lsns);
        const active = lsns.find(l => String(l._id) === String(lessonId));
        if (active?.moduleId) setOpenMods(new Set([String(active.moduleId)]));
        else if (mods.length > 0) setOpenMods(new Set([String(mods[0]._id)]));
      })
      .catch((err) => {
        if (err?.response?.status === 404) setCourseError('Course tidak ditemukan.');
        else setCourseError('Gagal memuat course. Silakan coba lagi.');
      });
  }, [id, api, isPreview]);

  useEffect(() => {
    if (role !== 'student') return;
    api.get('/progress/me').then(r => setProgress(r.data)).catch(() => {});
  }, [role, api]);

  useEffect(() => {
    if (role !== 'student') return;
    api.get(`/progress/course/${id}`)
      .then(res => {
        const map = {};
        for (const row of res.data.lessons || []) map[String(row.lessonId)] = row;
        setLessonProgress(map);
      }).catch(() => {});
    api.get(`/progress/course/${id}/certificate`)
      .then(res => setCert(res.data)).catch(() => {});
  }, [role, id, api]);

  useEffect(() => {
    setActiveTab('materi');
    setLockError('');
    setView('materi');
    setNote(localStorage.getItem(`note-${lessonId}`) || '');
    setComments([]);
    setCommentText('');
  }, [lessonId]);

  useEffect(() => {
    if (activeTab !== 'diskusi' || !lessonId) return;
    api.get(`/discussions/lesson/${lessonId}`)
      .then(r => setComments(r.data.comments || []))
      .catch(() => setComments([]));
  }, [activeTab, lessonId, api]);

  useEffect(() => {
    const active = lessons.find(l => String(l._id) === String(lessonId));
    if (active?.moduleId) {
      setOpenMods(prev => { const n = new Set(prev); n.add(String(active.moduleId)); return n; });
    }
  }, [lessonId, lessons]);

  // Preview mode (admin/teacher): load quiz questions with correct answers for read-only review.
  useEffect(() => {
    setPreviewQuestions([]);
    if (!isPreview) return;
    const active = lessons.find(l => String(l._id) === String(lessonId));
    if (!active?.quizId) return;
    api.get(`/quizzes/${active.quizId}/questions`)
      .then(r => setPreviewQuestions(r.data.questions || []))
      .catch(() => setPreviewQuestions([]));
  }, [isPreview, lessonId, lessons, api]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 768) setSidebarOpen(true);
      else setSidebarOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isStudent = role === 'student';
  const hasPurchased = isStudent && (user?.purchasedCourseIds || []).some(x => String(x) === String(id));
  const isPaywalled = isStudent && (course?.priceIdr || 0) > 0 && !hasPurchased;
  const isActiveCourse = !isStudent || (progress?.activeCourseId && String(progress.activeCourseId) === String(id));

  // Navigation order: follow module order, then lesson order within each module,
  // so "Berikutnya" advances within the current module before moving to the next.
  const orderedLessons = useMemo(() => {
    if (!modules.length) return lessons;
    const out = [];
    for (const mod of modules) {
      out.push(...lessons.filter(l => String(l.moduleId) === String(mod._id)));
    }
    // Lessons without a matching module go last (preserve their existing order).
    out.push(...lessons.filter(l => !modules.some(m => String(m._id) === String(l.moduleId))));
    return out;
  }, [modules, lessons]);

  const activeLesson = useMemo(() => lessons.find(l => String(l._id) === String(lessonId)) || null, [lessons, lessonId]);
  const activeIdx = useMemo(() => activeLesson ? orderedLessons.findIndex(l => String(l._id) === String(activeLesson._id)) : -1, [orderedLessons, activeLesson]);

  const isDone = (lId) => Boolean(lessonProgress[String(lId)]?.isCompleted);
  const canOpen = (idx) => {
    if (!isStudent || idx <= 0) return true;
    return isDone(orderedLessons[idx - 1]?._id);
  };

  const prevLessonId = activeIdx > 0 ? orderedLessons[activeIdx - 1]?._id : null;
  const nextLessonId = activeIdx >= 0 && activeIdx < orderedLessons.length - 1 ? orderedLessons[activeIdx + 1]?._id : null;
  const allowed = isPreview ? activeIdx >= 0 : (isActiveCourse && !isPaywalled && activeIdx >= 0 && canOpen(activeIdx));

  const completedCount = Object.values(lessonProgress).filter(r => r.isCompleted).length;
  const totalCount = lessons.length;
  const pct = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;

  async function markComplete(lId) {
    if (!isStudent || !lId || isDone(lId)) return true;
    setMarkingDone(true);
    try {
      await api.post(`/progress/lessons/${lId}/complete`);
      setLessonProgress(cur => ({ ...cur, [String(lId)]: { lessonId: lId, isCompleted: true, completedAt: new Date().toISOString() } }));
      try { const r = await api.get(`/progress/course/${id}/certificate`); setCert(r.data); } catch {}
      window.dispatchEvent(new Event('progress:changed'));
      return true;
    } catch (e) {
      setLockError(e?.response?.data?.error?.message || 'Gagal menyimpan progress');
      return false;
    } finally { setMarkingDone(false); }
  }

  function saveNote(val) { setNote(val); localStorage.setItem(`note-${lessonId}`, val); }

  function toggleMod(modId) {
    setOpenMods(prev => { const n = new Set(prev); n.has(modId) ? n.delete(modId) : n.add(modId); return n; });
  }

  async function postComment() {
    if (!commentText.trim() || commentPosting) return;
    setCommentPosting(true);
    try {
      const r = await api.post(`/discussions/lesson/${lessonId}`, { content: commentText.trim() });
      setComments(prev => [r.data.comment, ...prev]);
      setCommentText('');
    } catch { /* silent */ } finally {
      setCommentPosting(false);
    }
  }

  async function deleteComment(commentId) {
    try {
      await api.delete(`/discussions/${commentId}`);
      setComments(prev => prev.filter(c => String(c._id) !== String(commentId)));
    } catch { /* silent */ }
  }

  const activeModule = useMemo(() => {
    if (!activeLesson?.moduleId) return null;
    return modules.find(m => String(m._id) === String(activeLesson.moduleId)) || null;
  }, [activeLesson, modules]);

  const viewingModule = useMemo(() => {
    if (view !== 'module-overview' || !viewModId) return null;
    return modules.find(m => String(m._id) === String(viewModId)) || null;
  }, [view, viewModId, modules]);

  const vmIdx = viewingModule ? modules.indexOf(viewingModule) : -1;

  if (!course) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.n200 }}>
        {courseError ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#B91C1C', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{courseError}</div>
            <a href="/courses" style={{ color: C.blue, fontSize: '0.85rem', fontWeight: 600 }}>Kembali ke Daftar Course</a>
          </div>
        ) : (
          <PageSpinner />
        )}
      </div>
    );
  }

  const prevDisabled = !prevLessonId && view === 'materi';
  const nextDisabled = !nextLessonId && view === 'materi';

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        .pl-sidebar{transition:width .22s cubic-bezier(.4,0,.2,1),opacity .22s}
        .pl-overlay{display:none;position:fixed;inset:0;top:${TB_H}px;background:rgba(15,23,42,.4);z-index:90;cursor:pointer}
        @media(max-width:768px){
          .pl-sidebar{
            position:fixed!important;left:0;top:${TB_H}px;
            height:calc(100vh - ${TB_H}px)!important;
            z-index:100;width:min(${SB_W}px, 88vw)!important;
            opacity:1!important;
            transform:translateX(-100%);
            transition:transform .28s cubic-bezier(.4,0,.2,1)!important;
            box-shadow:4px 0 24px rgba(15,23,42,.15);
          }
          .pl-sidebar.open{transform:translateX(0)!important}
          .pl-overlay.show{display:block!important}
          .pl-tb-mid{display:none!important}
          .pl-content{padding:1rem 1rem 5rem!important}
          .pl-bnav{padding:.65rem 1rem!important;flex-wrap:nowrap!important;gap:.5rem!important}
          .pl-crumb{padding:.5rem 1rem!important;font-size:.68rem!important}
          .pl-bnav-label{display:none!important}
          .pl-lesson-hdr{padding:.75rem 1rem 0!important}
          .pl-lesson-tabs{padding:0 1rem!important}
          .pl-lesson-body{padding:1rem 1rem 5rem!important}
        }
        @media(max-width:480px){
          .pl-bnav button{font-size:.75rem!important;padding:.45rem .7rem!important}
          .pl-bnav-done{font-size:.7rem!important;padding:.3rem .6rem!important}
        }
        .pl-mi:hover{background:${C.blueXs}!important}
        .pl-mov-item:hover{border-color:${C.blueS}!important;background:${C.blueXs}!important;color:${C.blue}!important}
        .prose h1,.prose h2,.prose h3{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;color:${C.n950};letter-spacing:-.02em}
        .prose h1{font-size:1.3rem;margin:1.5rem 0 .6rem}
        .prose h2{font-size:1.1rem;margin:1.2rem 0 .5rem}
        .prose h3{font-size:.96rem;margin:1rem 0 .4rem}
        .prose p{font-size:.88rem;color:${C.n700};line-height:1.85;margin-bottom:.85rem}
        .prose ul,.prose ol{margin:.2rem 0 .85rem 1.2rem;font-size:.88rem;color:${C.n700}}
        .prose li{margin-bottom:.38rem;line-height:1.7}
        .prose code{background:${C.n200};color:${C.blueD};font-family:monospace;font-size:.82em;padding:.07rem .3rem;border-radius:4px}
        .prose pre{background:${C.n950};color:#e2e8f0;padding:.9rem 1.1rem;border-radius:10px;font-family:monospace;font-size:.79rem;line-height:1.7;overflow-x:auto;margin:.2rem 0 .95rem}
        .prose strong{font-weight:700;color:${C.n800}}
        .prose a{color:${C.blue};text-decoration:underline}
        .prose img{max-width:100%;border-radius:8px}
        .prose blockquote{border-left:3px solid ${C.blueS};padding:.5rem 1rem;background:${C.blueXs};border-radius:0 8px 8px 0;margin:.5rem 0 1rem;color:${C.n700};font-size:.86rem}
        .prose table{width:100%;border-collapse:collapse;font-size:.84rem;margin-bottom:.85rem}
        .prose th{background:${C.n100};padding:.5rem .75rem;text-align:left;font-weight:600;border:1px solid ${C.n300}}
        .prose td{padding:.5rem .75rem;border:1px solid ${C.n300}}
      `}</style>

      {/* Mobile overlay */}
      <div className={`pl-overlay${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Topbar */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: TB_H, background: C.white, borderBottom: `1px solid ${C.n300}`, display: 'flex', alignItems: 'center', padding: '0 1.2rem', gap: '0.8rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo-color.png" alt="Edulyfe" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
        </Link>
        <div style={{ width: 1, height: 22, background: C.n300, flexShrink: 0 }} />
        <div className="pl-tb-mid" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{course.title}</div>
          <div style={{ flex: 1, maxWidth: 280, display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ flex: 1, height: 5, background: C.n300, borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: `linear-gradient(90deg,${C.blue},${C.teal})`, borderRadius: 9999, width: `${pct}%`, transition: 'width .6s ease' }} />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: C.n500, whiteSpace: 'nowrap' }}>{completedCount}/{totalCount} selesai</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: 'auto' }}>
          {cert.eligible && (
            <Link to={`/certificate/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.77rem', fontWeight: 600, padding: '0.37rem 0.8rem', borderRadius: 7, background: `linear-gradient(135deg,${C.teal},#0a7a76)`, color: '#fff', textDecoration: 'none' }}>
              Sertifikat
            </Link>
          )}
          <Link to={`/courses/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.77rem', fontWeight: 600, padding: '0.37rem 0.8rem', borderRadius: 7, background: 'transparent', color: C.n600, border: `1px solid ${C.n300}`, textDecoration: 'none' }}>
            Detail Kursus
          </Link>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.n100, border: `1px solid ${C.n300}`, color: C.n600, fontSize: '0.85rem', cursor: 'pointer' }}>☰</button>
        </div>
      </header>

      {/* Shell */}
      <div style={{ display: 'flex', height: '100vh', paddingTop: TB_H, fontFamily: "'Inter',system-ui,sans-serif", overflow: 'hidden', background: C.n200 }}>

        {/* Sidebar */}
        <aside className={`pl-sidebar${sidebarOpen ? ' open' : ''}`}
          style={{ width: sidebarOpen ? SB_W : 0, flexShrink: 0, background: C.white, borderRight: `1px solid ${C.n300}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', opacity: sidebarOpen ? 1 : 0, pointerEvents: sidebarOpen ? 'auto' : 'none' }}>
          <div style={{ padding: '0.85rem 1rem 0.75rem', borderBottom: `1px solid ${C.n200}`, flexShrink: 0 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: '0.87rem', fontWeight: 700, color: C.n950, lineHeight: 1.35, marginBottom: '0.5rem' }}>{course.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ flex: 1, height: 4, background: C.n200, borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg,${C.blue},${C.teal})`, borderRadius: 9999, width: `${pct}%`, transition: 'width .5s ease' }} />
              </div>
              <div style={{ fontSize: '0.69rem', fontWeight: 600, color: C.n500, whiteSpace: 'nowrap' }}>{completedCount} / {totalCount} materi</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {modules.map((mod, mi) => {
              const modLessons = lessons.filter(l => String(l.moduleId) === String(mod._id));
              const modDone = modLessons.filter(l => isDone(l._id)).length;
              const isOpen = openMods.has(String(mod._id));
              return (
                <div key={mod._id}>
                  <div onClick={() => { toggleMod(String(mod._id)); setViewModId(mod._id); setView('module-overview'); }}
                    style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', padding: '0.7rem 1rem', background: isOpen ? C.blueXs : C.n100, cursor: 'pointer', userSelect: 'none', borderBottom: `1px solid ${C.n200}`, borderLeft: isOpen ? `3px solid ${C.blue}` : '3px solid transparent', position: 'sticky', top: 0, zIndex: 2 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: isOpen ? C.blue : C.n400, marginBottom: '0.1rem' }}>Modul {mi + 1}</div>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: isOpen ? C.blueD : C.n800, lineHeight: 1.3 }}>{mod.title}</div>
                      <div style={{ fontSize: '0.67rem', color: C.n400, marginTop: '0.18rem' }}>{modLessons.length} materi · {modDone} selesai</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginTop: 2 }}>
                      {modDone === modLessons.length && modLessons.length > 0 && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.11rem 0.42rem', borderRadius: 9999, background: C.tealXs, color: C.teal, border: `1px solid ${C.tealS}` }}>✓ Selesai</span>
                      )}
                      <span style={{ fontSize: '0.67rem', color: isOpen ? C.blue : C.n400, display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>▾</span>
                    </div>
                  </div>
                  {isOpen && modLessons.map(lesson => {
                    const isActive = String(lesson._id) === String(lessonId) && view === 'materi';
                    const done = isDone(lesson._id);
                    const lType = getLessonType(lesson);
                    return (
                      <div key={lesson._id} className="pl-mi"
                        onClick={() => { setView('materi'); nav(`/courses/${id}/lessons/${lesson._id}${previewQs}`); }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', padding: '0.58rem 1rem', borderBottom: `1px solid ${C.n100}`, cursor: 'pointer', background: isActive ? C.blueXs : 'transparent', borderLeft: isActive ? `3px solid ${C.blue}` : '3px solid transparent' }}>
                        <div style={{ width: 21, height: 21, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, flexShrink: 0, marginTop: 2, background: done ? C.teal : isActive ? C.blue : C.white, color: done || isActive ? '#fff' : C.n400, border: done || isActive ? 'none' : `1.5px solid ${C.n300}` }}>
                          {done ? '✓' : isActive ? '▶' : '—'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.79rem', fontWeight: isActive ? 600 : 500, color: isActive ? C.blue : C.n700, lineHeight: 1.4, marginBottom: '0.15rem' }}>{lesson.title}</div>
                          <span style={{ ...BS[lType], fontSize: '0.61rem', fontWeight: 700, padding: '0.09rem 0.36rem', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{TM[lType].lbl}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Certificate card */}
          <div style={{ flexShrink: 0, padding: '0.7rem', borderTop: `1px solid ${C.n200}` }}>
            <div style={{ background: `linear-gradient(135deg,${C.tealXs},${C.blueXs})`, border: `1px solid ${C.tealS}`, borderRadius: 10, padding: '0.8rem 1rem', textAlign: 'center' }}>
              {cert.eligible ? (
                <>
                  <div style={{ fontSize: '0.77rem', fontWeight: 700, color: C.teal, marginBottom: '0.2rem' }}>Course Selesai!</div>
                  <div style={{ fontSize: '0.68rem', color: C.n600, marginBottom: '0.55rem' }}>Sertifikat siap untuk diunduh</div>
                  <Link to={`/certificate/${id}`} style={{ display: 'block', padding: '0.46rem', background: `linear-gradient(135deg,${C.teal},#0a7a76)`, color: '#fff', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>Unduh Sertifikat</Link>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '0.77rem', fontWeight: 700, color: C.n700, marginBottom: '0.2rem' }}>Sertifikat Kursus</div>
                  <div style={{ fontSize: '0.68rem', color: C.n600, marginBottom: '0.3rem' }}>{completedCount}/{totalCount} materi selesai</div>
                  <div style={{ height: 5, background: C.n200, borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: `linear-gradient(90deg,${C.blue},${C.teal})`, borderRadius: 9999, width: `${pct}%` }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.white }}>
          {/* Breadcrumb */}
          <div className="pl-crumb" style={{ display: 'flex', alignItems: 'center', gap: '0.32rem', padding: '0.6rem 2rem', borderBottom: `1px solid ${C.n200}`, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link to={`/courses/${id}`} style={{ fontSize: '0.73rem', color: C.blue, fontWeight: 500, textDecoration: 'none' }}>{course.title}</Link>
            {view === 'module-overview' && viewingModule ? (
              <>
                <span style={{ fontSize: '0.61rem', color: C.n400 }}>›</span>
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: C.n800 }}>Modul {vmIdx + 1}: {viewingModule.title}</span>
              </>
            ) : activeModule ? (
              <>
                <span style={{ fontSize: '0.61rem', color: C.n400 }}>›</span>
                <button onClick={() => { setViewModId(activeModule._id); setView('module-overview'); }} style={{ fontSize: '0.73rem', color: C.blue, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Modul {modules.indexOf(activeModule) + 1}: {activeModule.title}
                </button>
                <span style={{ fontSize: '0.61rem', color: C.n400 }}>›</span>
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: C.n800 }}>{activeLesson?.title}</span>
              </>
            ) : activeLesson ? (
              <>
                <span style={{ fontSize: '0.61rem', color: C.n400 }}>›</span>
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: C.n800 }}>{activeLesson.title}</span>
              </>
            ) : null}
          </div>

          {/* Content area */}
          {view === 'module-overview' && viewingModule ? (
            /* Module overview — simple scrollable */
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="pl-content" style={{ padding: '1.75rem 2.25rem 2.5rem' }}>
                <div style={{ background: `linear-gradient(135deg,${C.blueXs},${C.white})`, border: `1px solid ${C.blueS}`, borderRadius: 14, padding: '1.4rem', marginBottom: '1.4rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Modul {vmIdx + 1} dari {modules.length}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: '1.35rem', fontWeight: 800, color: C.n950, marginBottom: '0.55rem', letterSpacing: '-0.03em' }}>{viewingModule.title}</div>
                  {viewingModule.description && <div style={{ fontSize: '0.87rem', color: C.n600, lineHeight: 1.75, marginBottom: '1rem' }}>{viewingModule.description}</div>}
                  <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {(() => {
                      const ml = lessons.filter(l => String(l.moduleId) === String(viewingModule._id));
                      return (
                        <>
                          <span style={{ fontSize: '0.79rem', color: C.n600 }}><strong style={{ color: C.n800 }}>{ml.length}</strong> materi</span>
                          <span style={{ fontSize: '0.79rem', color: C.n600 }}><strong style={{ color: C.teal }}>{ml.filter(l => isDone(l._id)).length}</strong> selesai</span>
                          <span style={{ fontSize: '0.79rem', color: C.n600 }}><strong style={{ color: C.n800 }}>{ml.filter(l => l.videoEmbedUrl).length}</strong> video</span>
                        </>
                      );
                    })()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {lessons.filter(l => String(l.moduleId) === String(viewingModule._id)).map(lesson => {
                      const done = isDone(lesson._id);
                      const lType = getLessonType(lesson);
                      return (
                        <div key={lesson._id} className="pl-mov-item"
                          onClick={() => { setView('materi'); nav(`/courses/${id}/lessons/${lesson._id}${previewQs}`); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.58rem 0.82rem', borderRadius: 9, background: C.white, border: `1px solid ${C.n300}`, cursor: 'pointer', fontSize: '0.83rem', color: C.n700 }}>
                          <span style={{ ...BS[lType], fontSize: '0.61rem', fontWeight: 700, padding: '0.09rem 0.36rem', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{TM[lType].lbl}</span>
                          {lesson.title}
                          <span style={{ fontSize: '0.71rem', fontWeight: 700, marginLeft: 'auto', color: done ? C.teal : C.n400 }}>{done ? '✓ Selesai' : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {(() => {
                  const first = lessons.find(l => String(l.moduleId) === String(viewingModule._id));
                  return first ? (
                    <button onClick={() => { setView('materi'); nav(`/courses/${id}/lessons/${first._id}${previewQs}`); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: C.blue, color: '#fff', padding: '0.68rem 1.4rem', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.87rem', fontWeight: 700, cursor: 'pointer', border: 'none', boxShadow: `0 2px 8px rgba(12,98,141,.25)` }}>
                      Mulai Materi Pertama
                    </button>
                  ) : null;
                })()}
              </div>
            </div>
            ) : !allowed ? (
            /* Access denied — simple scrollable */
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              <div className="pl-content" style={{ padding: '1.75rem 2.25rem' }}>
                {!isActiveCourse && (
                  <div style={{ padding: '1rem', background: C.amberXs, border: '1px solid #fde68a', borderRadius: 9, color: '#92400e', fontSize: '0.86rem' }}>
                    Silakan mulai kursus ini terlebih dahulu.{' '}
                    <Link to={`/courses/${id}`} style={{ color: C.blue, fontWeight: 600 }}>Ke halaman kursus</Link>
                  </div>
                )}
                {isPaywalled && (
                  <div style={{ padding: '1rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 9, color: '#9f1239', fontSize: '0.86rem' }}>
                    Kursus berbayar. Beli kursus untuk akses semua materi.
                  </div>
                )}
                {isActiveCourse && !isPaywalled && (
                  <div style={{ padding: '1rem', background: C.amberXs, border: '1px solid #fde68a', borderRadius: 9, color: '#92400e', fontSize: '0.86rem' }}>
                    Selesaikan materi sebelumnya terlebih dahulu.
                  </div>
                )}
              </div>
            </div>
            ) : !activeLesson ? (
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1.75rem 2.25rem' }}>
              <div style={{ color: C.n500, fontSize: '0.88rem' }}>Materi tidak ditemukan.</div>
            </div>
            ) : (
              /* Lesson view — sticky header+tabs, scrollable content body */
              (() => {
                const lType = getLessonType(activeLesson);
                const tm = TM[lType];
                const tabs = ['materi', 'catatan', ...(activeLesson.attachments?.length ? ['lampiran'] : []), 'diskusi'];
                const tabLabel = { materi: 'Materi', catatan: 'Catatan Saya', lampiran: `Lampiran (${activeLesson.attachments?.length || 0})`, diskusi: 'Diskusi' };
                return (
                  <>
                    {/* Sticky lesson header + tabs */}
                    <div style={{ flexShrink: 0, background: C.white, zIndex: 5, boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
                      <div className="pl-lesson-hdr" style={{ padding: '1.25rem 2rem 0' }}>
                        <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: tm.col, marginBottom: '0.3rem' }}>{tm.lbl}</div>
                        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: '1.25rem', fontWeight: 800, color: C.n950, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{activeLesson.title}</div>
                      </div>
                      {/* Tabs */}
                      <div className="pl-lesson-tabs" style={{ display: 'flex', flexWrap: 'wrap', borderBottom: `1.5px solid ${C.n200}`, padding: '0 2rem', marginTop: '0.85rem', overflow: 'hidden' }}>
                        {tabs.map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontSize: '0.81rem', fontWeight: 600, padding: '0.55rem 1rem', whiteSpace: 'nowrap', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: `2.5px solid ${activeTab === tab ? C.blue : 'transparent'}`, marginBottom: '-1.5px', color: activeTab === tab ? C.blue : C.n500 }}>{tabLabel[tab]}</button>
                        ))}
                      </div>
                    </div>
                    {/* Scrollable content body */}
                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                      <div className="pl-lesson-body" style={{ padding: '1.5rem 2rem 2.5rem' }}>
                    {/* Materi */}
                    {activeTab === 'materi' && (
                      <div>
                        {lType === 'video' && (
                          <div style={{ borderRadius: 14, marginBottom: '1.5rem', overflow: 'hidden', background: '#0A1929', aspectRatio: '16/9', maxHeight: 440, boxShadow: '0 8px 30px rgba(15,23,42,.2)' }}>
                            <iframe title="video" src={activeLesson.videoEmbedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                          </div>
                        )}
                        {lType === 'quiz' && isPreview && (
                          <div>
                            <div style={{ display: 'flex', gap: '0.62rem', padding: '0.82rem 1rem', borderRadius: 9, borderLeft: `3px solid ${C.amber}`, background: C.amberXs, color: '#92400e', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '1.2rem' }}>
                              <span>👁️</span><div><strong>Mode Preview.</strong> Jawaban benar ditandai hijau. Quiz tidak bisa dikerjakan/submit dalam mode ini.</div>
                            </div>
                            {previewQuestions.length === 0 ? (
                              <div style={{ color: C.n500, fontSize: '0.86rem' }}>Quiz belum memiliki pertanyaan.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                                {previewQuestions.map((q, qi) => (
                                  <div key={q._id} style={{ border: `1px solid ${C.n300}`, borderRadius: 12, padding: '1rem 1.1rem' }}>
                                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: C.n900, marginBottom: '0.65rem' }}>
                                      {qi + 1}. {q.promptHtml ? <span dangerouslySetInnerHTML={{ __html: q.promptHtml }} /> : q.prompt}
                                    </div>
                                    {q.imageUrl && <img src={q.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: '0.65rem' }} />}
                                    {q.type === 'matching' ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {(q.pairs || []).map((p, pi) => (
                                          <div key={pi} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem', color: C.n700 }}>
                                            <span style={{ fontWeight: 600 }}>{p.left}</span>
                                            <span style={{ color: C.n400 }}>→</span>
                                            <span style={{ color: C.teal, fontWeight: 600 }}>{p.right}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : q.type === 'essay' ? (
                                      <div style={{ fontSize: '0.82rem', color: C.n500, fontStyle: 'italic' }}>Pertanyaan esai (dinilai manual).</div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {(q.choices || []).map((c) => {
                                          const correct = String(q.correctChoiceId) === String(c.id);
                                          return (
                                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.7rem', borderRadius: 8, fontSize: '0.83rem', background: correct ? C.tealXs : C.n100, border: `1px solid ${correct ? C.tealS : C.n300}`, color: correct ? '#0a6060' : C.n700, fontWeight: correct ? 700 : 500 }}>
                                              <span>{correct ? '✓' : '○'}</span>
                                              <span>{c.text}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {lType === 'quiz' && !isPreview && (
                          <div>
                            <div style={{ display: 'flex', gap: '0.62rem', padding: '0.82rem 1rem', borderRadius: 9, borderLeft: `3px solid ${C.blue}`, background: C.blueXs, color: C.blueD, fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '1.2rem' }}>
                              <span>ℹ️</span><div>Kerjakan quiz untuk menyelesaikan materi ini dan lanjut ke materi berikutnya.</div>
                            </div>
                            <Link to={`/quiz/${activeLesson.quizId}${previewQs}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: C.amber, color: '#fff', padding: '0.68rem 1.4rem', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.87rem', fontWeight: 700, textDecoration: 'none', boxShadow: `0 2px 8px rgba(217,119,6,.3)` }}>Mulai Quiz</Link>
                          </div>
                        )}
                        {lType === 'project' && (
                          <div>
                            <div style={{ display: 'flex', gap: '0.62rem', padding: '0.82rem 1rem', borderRadius: 9, borderLeft: `3px solid ${C.teal}`, background: C.tealXs, color: '#0a6060', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '1.2rem' }}>
                              <span>🏆</span><div><strong>Project portfolio-ready!</strong> Cantumkan di LinkedIn, GitHub, atau resume kamu.</div>
                            </div>
                            {activeLesson.assignment?.instructionsHtml && (
                              <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: '0.96rem', fontWeight: 800, color: C.n950, marginBottom: '0.82rem' }}>Instruksi Project</div>
                                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: cleanHtml(activeLesson.assignment.instructionsHtml) }} />
                              </div>
                            )}
                            {activeLesson.assignmentId && (
                              <Link to={`/assignment/${activeLesson.assignmentId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: C.teal, color: '#fff', padding: '0.68rem 1.4rem', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.87rem', fontWeight: 700, textDecoration: 'none', boxShadow: `0 2px 8px rgba(11,168,148,.3)` }}>Kerjakan Project</Link>
                            )}
                          </div>
                        )}
                        {(lType === 'read' || lType === 'video') && activeLesson.contentHtml ? (
                          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: cleanHtml(activeLesson.contentHtml) }} />
                        ) : (lType === 'read' || lType === 'video') && activeLesson.contentMarkdown ? (
                          <MarkdownText text={activeLesson.contentMarkdown} />
                        ) : lType === 'read' ? (
                          <div style={{ color: C.n500, fontSize: '0.86rem' }}>Konten materi belum tersedia.</div>
                        ) : null}
                      </div>
                    )}
                    {/* Catatan */}
                    {activeTab === 'catatan' && (
                      <div>
                        <div style={{ fontSize: '0.83rem', color: C.n600, marginBottom: '0.75rem' }}>Catatan pribadi untuk materi ini. Tersimpan otomatis di browser.</div>
                        <textarea value={note} onChange={e => saveNote(e.target.value)} placeholder="Tulis catatan kamu di sini..."
                          style={{ width: '100%', minHeight: 200, border: `1.5px solid ${C.n300}`, borderRadius: 9, padding: '0.82rem', fontFamily: 'inherit', fontSize: '0.84rem', color: C.n800, resize: 'vertical', outline: 'none', background: C.white, lineHeight: 1.6 }} />
                      </div>
                    )}
                    {/* Lampiran */}
                    {activeTab === 'lampiran' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem' }}>
                        {(activeLesson.attachments || []).map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.62rem 0.88rem', background: C.n100, border: `1px solid ${C.n300}`, borderRadius: 9, textDecoration: 'none' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blueXs, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.92rem', flexShrink: 0 }}>{a.type === 'file' ? '📄' : '🔗'}</div>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: C.n800 }}>{a.name || a.url}</div>
                              <div style={{ fontSize: '0.69rem', color: C.n400 }}>{a.type === 'file' ? 'File' : 'Link'}</div>
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: C.blue, marginLeft: 'auto' }}>⬇ Buka</div>
                          </a>
                        ))}
                      </div>
                    )}
                    {/* Diskusi */}
                    {activeTab === 'diskusi' && (
                      <div>
                        <div style={{ marginBottom: '1.25rem' }}>
                          <textarea
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) postComment(); }}
                            placeholder="Tulis pertanyaan atau komentar... (Ctrl+Enter untuk kirim)"
                            rows={3}
                            style={{ width: '100%', border: `1.5px solid ${C.n300}`, borderRadius: 9, padding: '0.75rem', fontFamily: 'inherit', fontSize: '0.84rem', color: C.n800, resize: 'vertical', outline: 'none', background: C.white, lineHeight: 1.6 }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button
                              onClick={postComment}
                              disabled={!commentText.trim() || commentPosting}
                              style={{ padding: '0.5rem 1.2rem', borderRadius: 8, background: C.blue, color: '#fff', border: 'none', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, cursor: !commentText.trim() || commentPosting ? 'not-allowed' : 'pointer', opacity: !commentText.trim() || commentPosting ? 0.55 : 1 }}
                            >
                              {commentPosting ? 'Mengirim...' : 'Kirim'}
                            </button>
                          </div>
                        </div>
                        {comments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem', color: C.n500, fontSize: '0.84rem', background: C.n100, borderRadius: 10, border: `1px solid ${C.n300}` }}>
                            Belum ada diskusi. Jadilah yang pertama bertanya!
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {comments.map(c => {
                              const isOwn = String(c.userId?._id) === String(user?.id || user?._id);
                              const isAdmin = role === 'admin';
                              return (
                                <div key={c._id} style={{ padding: '0.82rem', background: C.n100, borderRadius: 10, border: `1px solid ${C.n300}` }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    {c.userId?.avatarUrl ? (
                                      <img src={c.userId.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0C628D,#2E86B5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                        {(c.userId?.fullName || c.userId?.name || 'U').charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: C.n800 }}>{c.userId?.fullName || c.userId?.name || 'User'}</div>
                                      <div style={{ fontSize: '0.67rem', color: C.n400 }}>
                                        {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                    {(isOwn || isAdmin) && (
                                      <button
                                        onClick={() => deleteComment(c._id)}
                                        style={{ fontSize: '0.7rem', color: C.n400, background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: 5 }}
                                        title="Hapus"
                                      >
                                        Hapus
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.84rem', color: C.n700, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{c.content}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {lockError && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 9, fontSize: '0.84rem', color: '#9f1239' }}>{lockError}</div>
                    )}
                      </div>
                  </div>
                </>
                );
              })()
            )}

          {/* Bottom nav */}
          <div className="pl-bnav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.82rem 2.25rem', borderTop: `1px solid ${C.n200}`, background: C.white, flexShrink: 0, gap: '0.75rem' }}>
            <button disabled={prevDisabled}
              onClick={() => {
                if (view === 'module-overview') { setView('materi'); return; }
                if (!prevLessonId) return;
                nav(`/courses/${id}/lessons/${prevLessonId}${previewQs}`);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.42rem', fontSize: '0.82rem', fontWeight: 600, padding: '0.55rem 1.05rem', borderRadius: 8, background: 'transparent', color: prevDisabled ? C.n400 : C.n500, border: `1px solid ${C.n300}`, cursor: prevDisabled ? 'not-allowed' : 'pointer', opacity: prevDisabled ? 0.4 : 1, flexShrink: 0 }}>
              Sebelumnya
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.28rem', flex: 1, minWidth: 0 }}>
              <div className="pl-bnav-label" style={{ fontSize: '0.7rem', color: C.n400 }}>
                {view === 'module-overview' ? `Modul ${vmIdx + 1} dari ${modules.length}` : `Materi ${activeIdx + 1} dari ${totalCount}`}
              </div>
              {view === 'materi' && isStudent && isActiveCourse && !isPaywalled && activeLesson && (
                <button className="pl-bnav-done"
                  onClick={async () => { if (!isDone(activeLesson._id)) { setLockError(''); await markComplete(activeLesson._id); } }}
                  disabled={markingDone || isDone(activeLesson._id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.32rem', fontSize: '0.74rem', fontWeight: 600, padding: '0.36rem 0.82rem', borderRadius: 7, cursor: isDone(activeLesson._id) ? 'default' : markingDone ? 'wait' : 'pointer', background: isDone(activeLesson._id) ? C.teal : C.n100, color: isDone(activeLesson._id) ? '#fff' : C.n600, border: `1.5px solid ${isDone(activeLesson._id) ? C.teal : C.n300}`, whiteSpace: 'nowrap' }}>
                  ✓ {isDone(activeLesson._id) ? 'Selesai' : markingDone ? 'Menyimpan...' : 'Tandai Selesai'}
                </button>
              )}
            </div>
            {nextDisabled && cert.eligible ? (
              <Link
                to={`/certificate/${id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.42rem', fontSize: '0.82rem', fontWeight: 700, padding: '0.55rem 1.2rem', borderRadius: 8, background: `linear-gradient(135deg,${C.teal},#0a7a76)`, color: '#fff', textDecoration: 'none', boxShadow: '0 2px 8px rgba(11,168,148,.35)', flexShrink: 0 }}
              >
                Unduh Sertifikat
              </Link>
            ) : (
              <button disabled={nextDisabled}
                onClick={async () => {
                  if (view === 'module-overview') {
                    const first = lessons.find(l => String(l.moduleId) === String(viewModId));
                    if (first) { setView('materi'); nav(`/courses/${id}/lessons/${first._id}${previewQs}`); }
                    return;
                  }
                  if (!nextLessonId) return;
                  setLockError('');
                  const ok = await markComplete(activeLesson?._id);
                  if (!ok) return;
                  nav(`/courses/${id}/lessons/${nextLessonId}${previewQs}`);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.42rem', fontSize: '0.82rem', fontWeight: 600, padding: '0.55rem 1.05rem', borderRadius: 8, background: nextDisabled ? C.n300 : C.blue, color: '#fff', border: 'none', cursor: nextDisabled ? 'not-allowed' : 'pointer', opacity: nextDisabled ? 0.5 : 1, boxShadow: !nextDisabled ? `0 2px 6px rgba(12,98,141,.25)` : 'none', flexShrink: 0 }}>
                Berikutnya
              </button>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
