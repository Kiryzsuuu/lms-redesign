import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Container, Button, Input } from '../components/ui';
import { useAuth } from '../lib/auth';

function formatIdr(n) {
  try {
    return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
  } catch {
    return String(n || 0);
  }
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}d yang lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Markdown({ text }) {
  const lines = (text || '').split('\n');
  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        if (line.startsWith('### ')) return <h3 key={idx}>{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={idx}>{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={idx}>{line.slice(2)}</h1>;
        if (!line.trim()) return <div key={idx} className="h-2" />;
        return <p key={idx}>{line}</p>;
      })}
    </div>
  );
}

function cleanHtml(html) {
  let s = String(html || '');
  if (!s) return '';
  s = s.replace(/<li>\s*<p>\s*(?:<br\s*\/?\s*>)\s*<\/p>\s*<\/li>/gi, '');
  s = s.replace(/<li>\s*<p>\s*<\/p>\s*<\/li>/gi, '');
  s = s.replace(/<li>\s*(?:<br\s*\/?\s*>)\s*<\/li>/gi, '');
  return s;
}

function toPlainTextFromHtml(html) {
  try {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    return String(html || '').replace(/\s+/g, ' ').trim();
  }
}

function toPlainTextFromMarkdown(md) {
  return String(md || '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`{1,3}/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippet(text, max = 220) {
  const s = String(text || '').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '').trim() + '…';
}

function MateriTypeIcon({ lesson }) {
  if (lesson.videoEmbedUrl) return <span className="text-blue-500">▶</span>;
  if (lesson.quizId) return <span className="text-purple-500">?</span>;
  if (lesson.assignment?.instructionsHtml) return <span className="text-amber-500">✏</span>;
  return <span className="text-slate-400">≡</span>;
}

function ModuleAccordion({ module, lessons, selectedLesson, onSelectLesson, isPaywalled, isStudent, lessonProgress, canOpenLessonByIndex, lessonIndexOffset, forceOpen }) {
  const [localOpen, setLocalOpen] = useState(true);
  const open = forceOpen !== undefined ? forceOpen : localOpen;
  const completedCount = lessons.filter((l) => lessonProgress[String(l._id)]?.isCompleted).length;

  return (
    <div className="overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: 14 }}>
      <button
        type="button"
        onClick={() => { if (forceOpen === undefined) setLocalOpen((v) => !v); }}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: '#F7F8FA' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F8FD'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#F7F8FA'; }}
      >
        <div className="min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate">{module.title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{lessons.length} materi · {completedCount} selesai</div>
        </div>
        <svg
          className="h-4 w-4 shrink-0 transition-transform"
          style={{ color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #F3F4F6' }}>
          {lessons.map((l, i) => {
            const globalIdx = lessonIndexOffset + i;
            const allowed = !isPaywalled && canOpenLessonByIndex(globalIdx);
            const completed = lessonProgress[String(l._id)]?.isCompleted;
            const isSelected = selectedLesson?._id === l._id;
            return (
              <button
                key={l._id}
                onClick={() => { if (!isPaywalled && allowed) onSelectLesson(l, globalIdx); }}
                disabled={isPaywalled || !allowed}
                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors"
                style={{
                  background: isSelected ? '#F0F8FD' : 'transparent',
                  color: isPaywalled || !allowed ? '#9CA3AF' : isSelected ? '#0C628D' : '#374151',
                  cursor: isPaywalled || !allowed ? 'not-allowed' : 'pointer',
                  fontWeight: isSelected ? 600 : 400,
                  borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                }}
                onMouseEnter={(e) => { if (!isPaywalled && allowed && !isSelected) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                  {isPaywalled ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : completed ? (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#0FADA8' }}>
                      <svg className="h-3 w-3" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  ) : !allowed ? (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[0.68rem] font-bold"
                      style={{ background: isSelected ? '#0C628D' : '#F3F4F6', color: isSelected ? '#fff' : '#6B7280' }}
                    >
                      {(lessonIndexOffset + i + 1)}
                    </div>
                  )}
                </div>
                <span className="flex-1 truncate">{l.title}</span>
                <MateriTypeIcon lesson={l} />
              </button>
            );
          })}
          {lessons.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-400 italic">Belum ada materi di modul ini.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const { api, role, user, isAuthed, refreshUser } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [progress, setProgress] = useState({ activeCourseId: null, completedCourseIds: [], role: 'guest' });
  const [lessonProgress, setLessonProgress] = useState({});
  const [cert, setCert] = useState({ eligible: false, completed: 0, total: 0, quizzesEligible: true, quizzesSubmitted: 0, quizzesTotal: 0 });
  const [assignmentState, setAssignmentState] = useState({ loading: false, attempt: null, error: '' });
  const [assignmentAnswer, setAssignmentAnswer] = useState('');
  const [lockError, setLockError] = useState('');
  const [openAttachmentUrl, setOpenAttachmentUrl] = useState('');
  const [quizAttempts, setQuizAttempts] = useState({});

  // New state for default view
  const [activeTab, setActiveTab] = useState('ikhtisar');
  const [testimonials, setTestimonials] = useState([]);
  const [editForm, setEditForm] = useState({ previewVideoUrl: '', coverImageUrl: '', title: '', priceIdr: 0, tags: [], whatYouLearn: [], requirements: [], targetAudience: [] });
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [expandDesc, setExpandDesc] = useState(false);
  const [allModulesOpen, setAllModulesOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [wylInput, setWylInput] = useState('');
  const [reqInput, setReqInput] = useState('');
  const [audInput, setAudInput] = useState('');

  const isPreview = searchParams.get('preview') === '1';

  useEffect(() => {
    const endpoint = isPreview && (role === 'teacher' || role === 'admin')
      ? `/courses/${id}/preview`
      : `/courses/${id}`;

    api
      .get(endpoint)
      .then((res) => {
        setCourse(res.data.course);
        setModules(res.data.modules || []);
        setLessons(res.data.lessons || []);
        setQuizzes(res.data.quizzes || []);
        const list = res.data.lessons || [];
        const lessonId = searchParams.get('lesson');
        const picked = lessonId ? list.find((l) => String(l._id) === String(lessonId)) : null;
        setSelectedLesson(picked || list[0] || null);
      })
      .catch(() => {
        setCourse(null);
        setModules([]);
        setLessons([]);
        setQuizzes([]);
        setSelectedLesson(null);
      });
  }, [id, isPreview, role]);

  useEffect(() => {
    if (role !== 'student') return;
    api
      .get('/progress/me')
      .then((res) => setProgress(res.data))
      .catch(() => setProgress({ activeCourseId: null, completedCourseIds: [], role: 'student' }));
  }, [role]);

  useEffect(() => {
    if (role !== 'student') return;
    api
      .get(`/progress/course/${id}`)
      .then((res) => {
        const map = {};
        for (const row of res.data.lessons || []) map[String(row.lessonId)] = row;
        setLessonProgress(map);
      })
      .catch(() => setLessonProgress({}));

    api
      .get(`/progress/course/${id}/certificate`)
      .then((res) => setCert(res.data))
      .catch(() => setCert({ eligible: false, completed: 0, total: 0, quizzesEligible: true, quizzesSubmitted: 0, quizzesTotal: 0 }));
  }, [role, id]);

  useEffect(() => {
    if (selectedLesson?.quizId && isStudent) {
      loadQuizAttempts(selectedLesson.quizId);
    }
  }, [selectedLesson?._id]);

  // Load testimonials
  useEffect(() => {
    api.get('/testimonials').then(r => setTestimonials(r.data.testimonials || [])).catch(() => {});
  }, [api]);

  // Init editForm when course loads
  useEffect(() => {
    if (!course) return;
    setEditForm({
      previewVideoUrl: course.previewVideoUrl || '',
      coverImageUrl: course.coverImageUrl || '',
      title: course.title || '',
      priceIdr: course.priceIdr || 0,
      tags: course.tags || [],
      whatYouLearn:   course.whatYouLearn   || [],
      requirements:   course.requirements   || [],
      targetAudience: course.targetAudience || [],
    });
  }, [course]);

  const isStudent = role === 'student';
  const priceIdr = course?.priceIdr || 0;
  const hasPurchased = isStudent && (user?.purchasedCourseIds || []).some((x) => String(x) === String(id));
  const hasCompleted = isStudent && (user?.completedCourseIds || []).some((x) => String(x) === String(id));
  const isPaywalled = isStudent && priceIdr > 0 && !hasPurchased;
  const isActive = isStudent && progress?.activeCourseId && String(progress.activeCourseId) === String(id);
  const hasOtherActive = isStudent && progress?.activeCourseId && String(progress.activeCourseId) !== String(id);
  const isEnrolled = isStudent && (hasPurchased || isActive || hasCompleted || priceIdr === 0);

  function isLessonCompleted(lessonId) {
    return Boolean(lessonProgress[String(lessonId)]?.isCompleted);
  }

  function canOpenLessonByIndex(idx) {
    if (!isStudent) return true;
    if (idx === 0) return true;
    const prev = lessons[idx - 1];
    if (!prev) return true;
    return isLessonCompleted(prev._id);
  }

  function isPdfUrl(url) {
    const u = String(url || '').toLowerCase();
    if (!u) return false;
    if (u.endsWith('.pdf')) return true;
    if (u.includes('.pdf?')) return true;
    if (u.includes('application/pdf')) return true;
    return false;
  }

  function getLessonBlocks(lesson) {
    const blocks = Array.isArray(lesson?.contentBlocks) ? lesson.contentBlocks : [];
    const hasVideo = Boolean(lesson?.videoEmbedUrl);
    const hasAttachments = Boolean((lesson?.attachments || []).length);

    if (blocks.length > 0) {
      const seen = new Set();
      const cleaned = blocks
        .filter((b) => b && b.type)
        .map((b) => ({ type: b.type, title: b.title || '' }))
        .filter((b) => {
          if (seen.has(b.type)) return false;
          seen.add(b.type);
          return true;
        });

      if (!seen.has('content')) cleaned.unshift({ type: 'content', title: 'Materi' });
      if (!hasVideo) return cleaned.filter((b) => b.type !== 'video');
      return cleaned;
    }

    return [
      ...(hasVideo ? [{ type: 'video', title: 'Video' }] : []),
      { type: 'content', title: 'Materi' },
      ...(hasAttachments ? [{ type: 'attachments', title: 'Lampiran' }] : []),
    ];
  }

  async function completeLesson() {
    if (!selectedLesson) return;
    setLockError('');
    try {
      await api.post(`/progress/lessons/${selectedLesson._id}/complete`);
      const pRes = await api.get(`/progress/course/${id}`);
      const map = {};
      for (const row of pRes.data.lessons || []) map[String(row.lessonId)] = row;
      setLessonProgress(map);
      const cRes = await api.get(`/progress/course/${id}/certificate`);
      setCert(cRes.data);
    } catch (e) {
      setLockError(e?.response?.data?.error?.message || 'Gagal menyimpan progress lesson');
    }
  }

  function selectedQuiz() {
    if (!selectedLesson?.quizId) return null;
    return quizzes.find((q) => String(q._id) === String(selectedLesson.quizId)) || { _id: selectedLesson.quizId };
  }

  async function loadAssignment(lessonId) {
    if (!lessonId) return;
    setAssignmentState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await api.get(`/assignments/lessons/${lessonId}/me`);
      setAssignmentState({ loading: false, attempt: res.data.attempt, error: '' });
      setAssignmentAnswer(res.data.attempt?.textAnswer || '');
    } catch (e) {
      setAssignmentState({ loading: false, attempt: null, error: e?.response?.data?.error?.message || 'Gagal memuat assignment' });
    }
  }

  async function loadQuizAttempts(quizId) {
    if (!quizId || !isStudent) return;
    try {
      const res = await api.get(`/quizzes/${quizId}/my-attempts`);
      setQuizAttempts((prev) => ({ ...prev, [String(quizId)]: res.data.attempts || [] }));
    } catch (e) {
      setQuizAttempts((prev) => ({ ...prev, [String(quizId)]: [] }));
    }
  }

  async function startAssignment() {
    if (!selectedLesson) return;
    setAssignmentState((s) => ({ ...s, error: '' }));
    try {
      const res = await api.post(`/assignments/lessons/${selectedLesson._id}/start`, {});
      setAssignmentState((s) => ({ ...s, attempt: res.data.attempt }));
    } catch (e) {
      setAssignmentState((s) => ({ ...s, error: e?.response?.data?.error?.message || 'Gagal start assignment' }));
    }
  }

  async function submitAssignment() {
    if (!selectedLesson) return;
    setAssignmentState((s) => ({ ...s, error: '' }));
    try {
      const res = await api.post(`/assignments/lessons/${selectedLesson._id}/submit`, { textAnswer: assignmentAnswer });
      setAssignmentState((s) => ({ ...s, attempt: { ...(s.attempt || {}), submittedAt: res.data.attempt.submittedAt, dueAt: res.data.attempt.dueAt } }));
    } catch (e) {
      setAssignmentState((s) => ({ ...s, error: e?.response?.data?.error?.message || 'Gagal submit assignment' }));
    }
  }

  async function shareCertificateLink() {
    const url = `${window.location.origin}/courses/${id}?certificate=1`;
    const data = { title: `Sertifikat: ${course?.title || 'Course'}`, text: 'Lihat sertifikat saya', url };
    try {
      if (navigator.share) return await navigator.share(data);
    } catch {
      // ignore
    }
    try {
      await navigator.clipboard.writeText(url);
      setLockError('Link sertifikat disalin ke clipboard.');
    } catch {
      setLockError(url);
    }
  }

  async function startCourse() {
    setLockError('');
    try {
      await api.post(`/courses/${id}/start`);
      if (lessons.length > 0) {
        nav(`/courses/${id}/lessons/${lessons[0]._id}`);
      } else {
        const res = await api.get('/progress/me');
        setProgress(res.data);
      }
    } catch (e) {
      setLockError(e?.response?.data?.error?.message || 'Gagal memulai course');
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  async function addToCart() {
    setLockError('');
    try {
      const cartRes = await api.get('/cart');
      const already = (cartRes.data.items || []).some((i) => String(i.course?._id || i.courseId) === String(id));
      if (already) {
        nav('/cart');
        return;
      }
      await api.post('/cart/items', { courseId: id });
      window.dispatchEvent(new Event('cart:changed'));
      nav('/cart');
    } catch (e) {
      setLockError(e?.response?.data?.error?.message || 'Gagal tambah ke cart');
    }
  }

  async function downloadProgressPdf() {
    setLockError('');
    try {
      const res = await api.get(`/reports/courses/${id}/progress.pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-${(course?.title || 'course').replace(/[^a-z0-9\- _]/gi, '').slice(0, 60) || 'course'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setLockError(e?.response?.data?.error?.message || 'Gagal export PDF');
    }
  }

  async function completeCourse() {
    setLockError('');
    try {
      const res = await api.post(`/courses/${id}/complete`);
      setProgress((cur) => ({
        ...cur,
        activeCourseId: res.data?.activeCourseId || null,
        completedCourseIds: res.data?.completedCourseIds || cur.completedCourseIds || [],
        role: cur.role || 'student',
      }));
      await refreshUser();
      window.dispatchEvent(new Event('progress:changed'));
    } catch (e) {
      setLockError(e?.response?.data?.error?.message || 'Gagal menyelesaikan course');
    }
  }

  function handleSelectLesson(lesson, globalIdx) {
    setLockError('');
    if (isStudent) {
      api
        .post(`/courses/${id}/start`)
        .then(() => {
          nav(`/courses/${id}/lessons/${lesson._id}`);
        })
        .catch((e) => {
          setLockError(e?.response?.data?.error?.message || 'Gagal membuka materi');
        });
      return;
    }
    setSelectedLesson(lesson);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('lesson', lesson._id);
      return next;
    });
  }

  async function saveMedia() {
    setMediaLoading(true);
    try {
      await api.put(`/courses/${id}`, {
        title: course.title,
        description: course.description || '',
        coverImageUrl: editForm.coverImageUrl,
        previewVideoUrl: editForm.previewVideoUrl,
        priceIdr: course.priceIdr || 0,
        isPublished: course.isPublished || false,
        tags: course.tags || [],
        whatYouLearn:   course.whatYouLearn   || [],
        requirements:   course.requirements   || [],
        targetAudience: course.targetAudience || [],
      });
      api.get(`/courses/${id}`).then(r => setCourse(r.data.course)).catch(() => {});
      const endpoint = isPreview && (role === 'teacher' || role === 'admin')
        ? `/courses/${id}/preview`
        : `/courses/${id}`;
      const res = await api.get(endpoint);
      setCourse(res.data.course);
      setModules(res.data.modules || []);
      setLessons(res.data.lessons || []);
      setQuizzes(res.data.quizzes || []);
    } catch (e) {
      setLockError(e?.response?.data?.error?.message || 'Gagal menyimpan media');
    } finally {
      setMediaLoading(false);
    }
  }

  async function saveDetails() {
    setLockError('');
    try {
      await api.put(`/courses/${id}`, {
        title: editForm.title,
        description: course.description || '',
        coverImageUrl: editForm.coverImageUrl,
        previewVideoUrl: editForm.previewVideoUrl,
        priceIdr: editForm.priceIdr,
        isPublished: course.isPublished || false,
        tags: editForm.tags,
        whatYouLearn:   editForm.whatYouLearn   || [],
        requirements:   editForm.requirements   || [],
        targetAudience: editForm.targetAudience || [],
      });
      const endpoint = isPreview && (role === 'teacher' || role === 'admin')
        ? `/courses/${id}/preview`
        : `/courses/${id}`;
      const res = await api.get(endpoint);
      setCourse(res.data.course);
      setModules(res.data.modules || []);
      setLessons(res.data.lessons || []);
      setQuizzes(res.data.quizzes || []);
      setEditPanelOpen(false);
    } catch (e) {
      setLockError(e?.response?.data?.error?.message || 'Gagal menyimpan perubahan');
    }
  }

  // Build module groups for sidebar
  const moduleGroups = (() => {
    const groups = [];
    let lessonOffset = 0;

    if (modules.length > 0) {
      for (const mod of modules) {
        const modLessons = lessons.filter((l) => String(l.moduleId) === String(mod._id));
        groups.push({ module: mod, lessons: modLessons, offset: lessonOffset });
        lessonOffset += modLessons.length;
      }
      // Uncategorized
      const uncat = lessons.filter((l) => !l.moduleId || !modules.find((m) => String(m._id) === String(l.moduleId)));
      if (uncat.length > 0) {
        groups.push({ module: { _id: '__uncat', title: 'Materi Lainnya' }, lessons: uncat, offset: lessonOffset });
      }
    } else {
      // Flat list — no modules defined; sidebars handle this case directly
      groups.push({ module: { _id: '__all', title: '' }, lessons, offset: 0 });
    }
    return groups;
  })();

  if (!course) {
    return (
      <section className="py-10">
        <Container>
          <Card className="p-8">
            <div className="text-sm text-slate-600">Course tidak ditemukan / belum dipublish.</div>
            <div className="mt-4">
              <Link to="/courses">
                <Button variant="outline">Kembali</Button>
              </Link>
            </div>
          </Card>
        </Container>
      </section>
    );
  }

  // Default view: course overview (not enrolled / teacher / admin / preview)
  const instructorName = course.ownerId?.name || '';
  const instructorInitials = instructorName
    ? instructorName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'IN';
  const instructorSkills      = course.ownerId?.skills      || [];
  const instructorInstitution = course.ownerId?.institution || '';
  const descriptionPlain = toPlainTextFromHtml(course.description);

  return (
    <div style={{ background: '#F7F8FA' }} className="min-h-screen">
      {/* Teacher preview banner */}
      {isPreview && (role === 'teacher' || role === 'admin') && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <Container>
            <div className="flex items-center justify-between gap-3 text-sm text-amber-800">
              <span>Mode Preview — tampilan seperti yang dilihat siswa</span>
              <button onClick={() => setSearchParams({})} className="text-xs font-semibold hover:underline">Kembali ke Edit</button>
            </div>
          </Container>
        </div>
      )}

      {/* ── HERO SECTION ── */}
      <div className="bg-white relative">
        {/* Decorative blobs — clipped in their own layer so overflow-hidden doesn't affect sticky children */}
        <div className="overflow-hidden absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full" style={{ background: 'rgba(12,98,141,0.05)', filter: 'blur(80px)' }} />
          <div className="absolute top-10 right-0 w-80 h-80 rounded-full" style={{ background: 'rgba(15,173,168,0.05)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 rounded-full" style={{ background: 'rgba(243,146,27,0.06)', filter: 'blur(80px)' }} />
        </div>

        <Container className="py-12 relative">
          <div className="grid md:grid-cols-[1fr_340px] gap-8 lg:gap-12 items-start">
            {/* LEFT column */}
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 min-w-0 overflow-hidden">
                <Link to="/courses" className="hover:text-[#0C628D] transition-colors shrink-0">Courses</Link>
                <span className="shrink-0">/</span>
                <span className="text-gray-700 truncate">{course.title}</span>
              </div>

              {/* Teacher/admin quick actions */}
              {isAuthed && (role === 'teacher' || role === 'admin') && !isPreview && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => window.open(`/courses/${id}?preview=1`, '_blank')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#0C628D] text-[#0C628D] hover:bg-[#EBF6FC] transition-colors"
                  >
                    Preview sebagai Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open('/dashboard/courses', '_blank')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Buka CourseManager
                  </button>
                </div>
              )}

              {/* Tag pills */}
              {(course.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {course.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: '#EBF6FC', color: '#0C628D' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Course title */}
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight" style={{ color: '#0A0E1A' }}>
                {course.title}
              </h1>

              {/* Description */}
              {descriptionPlain && (
                <p className="mt-4 text-base text-gray-600 leading-relaxed">
                  {descriptionPlain}
                </p>
              )}

              {/* Rating row */}
              {testimonials.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ color: '#F3921B', fontSize: '0.9rem', lineHeight: 1 }}>&#9733;</span>
                    ))}
                  </div>
                  <span className="font-bold" style={{ color: '#F3921B' }}>5.0</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">({testimonials.length} ulasan)</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">
                    Diperbarui {new Date(course.updatedAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}

              {/* Stats row */}
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <span>{lessons.length} materi</span>
                {modules.length > 0 && <span>{modules.length} modul</span>}
              </div>

              {/* Instructor block */}
              {instructorName && (
                <div className="mt-5 flex items-start gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg,#0C628D,#0FADA8)', fontSize: '0.9rem' }}>
                    {instructorInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Instruktur</div>
                    <div className="text-sm font-semibold text-gray-900">{instructorName}</div>
                    {instructorInstitution && (
                      <div className="text-xs text-gray-500 mt-0.5">{instructorInstitution}</div>
                    )}
                  </div>
                  {instructorSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {instructorSkills.slice(0, 3).map((sk) => (
                        <span key={sk} className="text-xs px-2.5 py-0.5 rounded-full"
                          style={{ background: '#F3F4F6', color: '#374151' }}>{sk}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Feature badges */}
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                {['Akses seumur hidup', 'Sertifikat terverifikasi', 'Mobile & desktop'].map((feat) => (
                  <div key={feat} className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: '#0FADA8' }}
                    >
                      <span className="text-white font-bold" style={{ fontSize: '0.6rem', lineHeight: 1 }}>✓</span>
                    </div>
                    <span className="text-sm text-gray-700">{feat}</span>
                  </div>
                ))}
              </div>

              {/* Curriculum accordion */}
              {lessons.length > 0 && (
                <div className="mt-6 pt-6" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <div className="mb-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {modules.length > 0
                        ? `${modules.length} Modules · ${lessons.length} Lessons`
                        : `${lessons.length} Lessons`}
                    </span>
                  </div>
                  {modules.length > 0 ? (
                    <div className="space-y-2">
                      {moduleGroups.map(({ module: mod, lessons: mLessons, offset }) => (
                        <ModuleAccordion
                          key={mod._id}
                          module={mod}
                          lessons={mLessons}
                          selectedLesson={null}
                          onSelectLesson={isEnrolled ? handleSelectLesson : () => {}}
                          isPaywalled={isPaywalled}
                          isStudent={isStudent}
                          lessonProgress={isEnrolled ? lessonProgress : {}}
                          canOpenLessonByIndex={isEnrolled ? canOpenLessonByIndex : () => false}
                          lessonIndexOffset={offset}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden">
                      {lessons.map((l, i) => (
                        <div
                          key={l._id}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700"
                          style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : 'none' }}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[0.68rem] font-bold shrink-0"
                            style={{ background: '#F3F4F6', color: '#6B7280' }}
                          >
                            {i + 1}
                          </div>
                          <span className="flex-1 truncate">{l.title}</span>
                          <MateriTypeIcon lesson={l} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT column — sticky enrollment card */}
            <div className="md:sticky md:top-6 space-y-4">
              <div
                className="bg-white rounded-[20px] border border-gray-200 overflow-hidden"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)' }}
              >
                {/* Preview media */}
                <div className="relative aspect-video" style={{ background: '#0A0E1A' }}>
                  {course.previewVideoUrl ? (
                    <iframe
                      src={course.previewVideoUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title="Preview video"
                    />
                  ) : course.coverImageUrl ? (
                    <img src={course.coverImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-500">
                      Belum ada preview
                    </div>
                  )}
                  {course.previewVideoUrl && (
                    <div className="absolute bottom-3 left-3 text-xs font-semibold text-white px-2.5 py-1 rounded-[8px]" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      Preview gratis
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5">
                  {/* Price */}
                  <div className="mb-4">
                    {priceIdr === 0 ? (
                      <span className="font-extrabold text-2xl" style={{ color: '#0FADA8' }}>Gratis</span>
                    ) : (
                      <span className="font-extrabold text-2xl" style={{ color: '#0A0E1A' }}>Rp {formatIdr(priceIdr)}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    {isStudent && isPaywalled ? (
                      <>
                        <Button className="w-full" onClick={addToCart}>Tambah ke Cart</Button>
                        <Link to="/cart" className="block">
                          <Button variant="outline" className="w-full">Lihat Keranjang</Button>
                        </Link>
                      </>
                    ) : isStudent && !isPaywalled && isActive ? (
                      <Button
                        className="w-full"
                        onClick={() => {
                          if (lessons.length > 0) nav(`/courses/${id}/lessons/${lessons[0]._id}`);
                        }}
                      >
                        Lanjutkan Belajar
                      </Button>
                    ) : isStudent && !isPaywalled ? (
                      <Button className="w-full" onClick={startCourse}>
                        {priceIdr === 0 ? 'Mulai Belajar Gratis' : 'Mulai Course'}
                      </Button>
                    ) : !isAuthed ? (
                      <Button className="w-full" onClick={() => nav('/login')}>
                        Login untuk Mulai
                      </Button>
                    ) : null}
                  </div>

                  {/* lockError */}
                  {lockError && (
                    <div className="mt-3 bg-rose-50 border border-rose-200 rounded-[10px] px-3 py-2 text-sm text-rose-700">{lockError}</div>
                  )}

                  {/* Course includes */}
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Course ini mencakup:</div>
                    <div className="space-y-1.5">
                      {modules.length > 0 && (
                        <div className="flex items-center gap-2.5 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0C628D' }} />
                          <span>{modules.length} modul</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0C628D' }} />
                        <span>{lessons.length} materi</span>
                      </div>
                      {quizzes.length > 0 && (
                        <div className="flex items-center gap-2.5 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0C628D' }} />
                          <span>{quizzes.length} quiz</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0C628D' }} />
                        <span>Sertifikat digital terverifikasi</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#0C628D' }} />
                        <span>Akses seumur hidup</span>
                      </div>
                    </div>
                  </div>

                  {/* Guarantee */}
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: '#0FADA8' }}>
                      <span className="text-white font-bold" style={{ fontSize: '0.55rem', lineHeight: 1 }}>&#10003;</span>
                    </div>
                    <span className="text-xs text-gray-500">Garansi uang kembali 30 hari · Tanpa syarat</span>
                  </div>

                  {/* Share buttons */}
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <div className="text-xs text-center text-gray-500 mb-2">Bagikan kursus:</div>
                    <div className="flex gap-2">
                      <button
                        onClick={copyLink}
                        className="flex-1 text-xs font-semibold py-2 px-3 rounded-[8px] transition-colors"
                        style={{ border: '1px solid #E5E7EB', background: linkCopied ? '#F0FDF4' : 'white', color: linkCopied ? '#16A34A' : '#374151' }}
                      >
                        {linkCopied ? 'Tersalin!' : 'Salin Link'}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                        target="_blank" rel="noreferrer"
                        className="flex-1 text-xs font-semibold py-2 px-3 rounded-[8px] text-center transition-colors"
                        style={{ border: '1px solid #E5E7EB', background: 'white', color: '#374151' }}
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Media Preview — teacher/admin only, hidden in preview mode */}
              {isAuthed && (role === 'teacher' || role === 'admin') && !isPreview && (
                <div className="bg-white rounded-[16px] border border-gray-200 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Edit Media Preview</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">URL Video Preview (YouTube embed)</label>
                      <Input
                        placeholder="https://www.youtube.com/embed/..."
                        value={editForm.previewVideoUrl}
                        onChange={(e) => setEditForm((f) => ({ ...f, previewVideoUrl: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">URL Cover Image</label>
                      <Input
                        placeholder="https://..."
                        value={editForm.coverImageUrl}
                        onChange={(e) => setEditForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={saveMedia}
                      disabled={mediaLoading}
                    >
                      {mediaLoading ? 'Menyimpan...' : 'Simpan Media'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* ── QUICK STATS BAR ── */}
      <div className="bg-white border-b border-gray-200 py-5">
        <Container>
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {[
              { value: lessons.length, label: 'Materi' },
              { value: modules.length > 0 ? modules.length : '-', label: 'Modul' },
              { value: quizzes.length, label: 'Quiz' },
              { value: 'Semua', label: 'Level' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-start">
                <span className="font-display font-bold text-2xl" style={{ color: '#0C628D' }}>{stat.value}</span>
                <span className="text-xs text-gray-500 mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── REVIEWS & EDIT SECTION ── */}
      <div className="py-10" style={{ background: '#F7F8FA' }}>
        <Container>
          <div className="grid md:grid-cols-[1fr_280px] gap-8 items-start">
            {/* MAIN */}
            <div>

              {/* Reviews */}
              <div>
                {testimonials.length > 0 && (
                  <h2 className="font-display font-bold text-lg text-gray-900 mb-4">Reviews</h2>
                )}
                {testimonials.length === 0 ? null : (
                  <div className="space-y-4">
                    {testimonials.map((t) => {
                      const nameInitial = (t.name || 'U').charAt(0).toUpperCase();
                      return (
                        <div key={t._id} className="bg-white rounded-[14px] border border-gray-200 p-5">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                              style={{ background: 'linear-gradient(135deg, #0C628D, #0FADA8)' }}
                            >
                              {nameInitial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-900">{t.name}</span>
                                {t.role && <span className="text-xs text-gray-500">{t.role}</span>}
                              </div>
                              <p className="mt-1 text-sm text-gray-700 leading-relaxed">{t.text || t.content || t.message || ''}</p>
                              {t.createdAt && (
                                <div className="mt-1.5 text-xs text-gray-400">{timeAgo(t.createdAt)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Teacher/admin edit detail section */}
              {isAuthed && (role === 'teacher' || role === 'admin') && !isPreview && (
                <div className="mt-10">
                  <button
                    onClick={() => setEditPanelOpen((v) => !v)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg
                      className="h-4 w-4 transition-transform"
                      style={{ transform: editPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Edit Course Details
                  </button>

                  {editPanelOpen && (
                    <div className="mt-4 bg-white rounded-[16px] border border-gray-200 p-6 space-y-5">
                      {/* Title */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Judul</label>
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                        />
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Tag</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {editForm.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#EBF6FC', color: '#0C628D' }}>
                              {tag}
                              <button
                                type="button"
                                onClick={() => setEditForm((f) => ({ ...f, tags: f.tags.filter((_, ti) => ti !== i) }))}
                                className="hover:text-red-500 transition-colors font-bold leading-none"
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                        <Input
                          placeholder="Ketik tag, tekan Enter atau koma untuk menambah"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const val = tagInput.replace(',', '').trim();
                              if (val && !editForm.tags.includes(val)) {
                                setEditForm((f) => ({ ...f, tags: [...f.tags, val] }));
                              }
                              setTagInput('');
                            }
                          }}
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Harga (IDR)</label>
                        <Input
                          type="number"
                          min="0"
                          value={editForm.priceIdr}
                          onChange={(e) => setEditForm((f) => ({ ...f, priceIdr: Number(e.target.value) }))}
                        />
                      </div>

                      {/* Yang Akan Kamu Pelajari */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Yang Akan Kamu Pelajari</label>
                        <div className="space-y-1.5 mb-2">
                          {(editForm.whatYouLearn || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-[8px] px-3 py-1.5 border border-gray-200">{item}</span>
                              <button type="button" onClick={() => setEditForm((f) => ({ ...f, whatYouLearn: f.whatYouLearn.filter((_, idx) => idx !== i) }))}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2">x</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input placeholder="Tambah poin belajar..." value={wylInput} onChange={(e) => setWylInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && wylInput.trim()) { e.preventDefault(); setEditForm((f) => ({ ...f, whatYouLearn: [...(f.whatYouLearn || []), wylInput.trim()] })); setWylInput(''); }}} />
                          <Button type="button" variant="outline" size="sm" onClick={() => { if (wylInput.trim()) { setEditForm((f) => ({ ...f, whatYouLearn: [...(f.whatYouLearn || []), wylInput.trim()] })); setWylInput(''); }}}>Tambah</Button>
                        </div>
                      </div>

                      {/* Prasyarat */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Prasyarat</label>
                        <div className="space-y-1.5 mb-2">
                          {(editForm.requirements || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-[8px] px-3 py-1.5 border border-gray-200">{item}</span>
                              <button type="button" onClick={() => setEditForm((f) => ({ ...f, requirements: f.requirements.filter((_, idx) => idx !== i) }))}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2">x</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input placeholder="Tambah prasyarat..." value={reqInput} onChange={(e) => setReqInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && reqInput.trim()) { e.preventDefault(); setEditForm((f) => ({ ...f, requirements: [...(f.requirements || []), reqInput.trim()] })); setReqInput(''); }}} />
                          <Button type="button" variant="outline" size="sm" onClick={() => { if (reqInput.trim()) { setEditForm((f) => ({ ...f, requirements: [...(f.requirements || []), reqInput.trim()] })); setReqInput(''); }}}>Tambah</Button>
                        </div>
                      </div>

                      {/* Untuk Siapa */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Who Is This Course For</label>
                        <div className="space-y-1.5 mb-2">
                          {(editForm.targetAudience || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-[8px] px-3 py-1.5 border border-gray-200">{item}</span>
                              <button type="button" onClick={() => setEditForm((f) => ({ ...f, targetAudience: f.targetAudience.filter((_, idx) => idx !== i) }))}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2">x</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input placeholder="Tambah target audiens..." value={audInput} onChange={(e) => setAudInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && audInput.trim()) { e.preventDefault(); setEditForm((f) => ({ ...f, targetAudience: [...(f.targetAudience || []), audInput.trim()] })); setAudInput(''); }}} />
                          <Button type="button" variant="outline" size="sm" onClick={() => { if (audInput.trim()) { setEditForm((f) => ({ ...f, targetAudience: [...(f.targetAudience || []), audInput.trim()] })); setAudInput(''); }}}>Tambah</Button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button onClick={saveDetails}>Simpan Perubahan</Button>
                        <button
                          type="button"
                          onClick={() => window.open(`/courses/${id}?preview=1`, '_blank')}
                          className="text-sm font-semibold text-[#0C628D] hover:underline"
                        >
                          Preview sebagai Siswa
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open('/dashboard/courses', '_blank')}
                          className="text-sm font-semibold text-[#0C628D] hover:underline"
                        >
                          Buka CourseManager
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ASIDE: right column */}
            <aside className="hidden lg:block space-y-4">
              {/* Untuk Siapa */}
              {(course.targetAudience || []).length > 0 && (
                <div className="bg-white rounded-[16px] p-5" style={{ border: '1px solid #E5E7EB' }}>
                  <h3 className="font-display font-bold text-base text-gray-900 mb-3">Who Is This Course For</h3>
                  <div className="space-y-2">
                    {course.targetAudience.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: '#EBF6FC' }}>
                          <span className="font-bold" style={{ color: '#0C628D', fontSize: '0.55rem', lineHeight: 1 }}>&#10003;</span>
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </Container>
      </div>
    </div>
  );
}
