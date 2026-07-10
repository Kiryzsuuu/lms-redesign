import { Toggle } from '../../components/Toggle';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Container, Button, Input, Label, Textarea } from '../../components/ui';
import { SidebarShell } from '../../components/SidebarShell';
import { useAuth } from '../../lib/auth';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { RichTextEditor } from '../../components/RichTextEditor';

function LessonCard({ l, onEdit, onToggle, onDelete, dragProps, isDragging, isDragOver }) {
  return (
    <Card
      className="p-4 mb-2"
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderTop: isDragOver ? '2px solid #0C628D' : undefined,
        transition: 'opacity .12s',
      }}
      {...(dragProps?.containerProps || {})}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {dragProps && (
            <span
              {...dragProps.handleProps}
              title="Geser untuk mengubah urutan"
              style={{ cursor: 'grab', color: '#9CA3AF', flexShrink: 0, marginTop: 1, touchAction: 'none' }}
            >
              <i className="ti ti-grip-vertical" style={{ fontSize: 16 }} />
            </span>
          )}
          <div className="min-w-0">
            <div className="font-semibold leading-snug line-clamp-2 break-words">{l.title}</div>
            <div className="mt-1 text-xs">
              <span className={l.isPublished ? 'text-emerald-600' : 'text-rose-500'}>{l.isPublished ? 'Published' : 'Draft'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Toggle checked={l.isPublished} onChange={() => onToggle(l)} />
          <Button variant="outline" className="px-3 text-xs" onClick={() => onEdit(l)}>Edit</Button>
          <Button variant="danger" className="px-3 text-xs" onClick={() => onDelete(l)}>Hapus</Button>
        </div>
      </div>
    </Card>
  );
}

/** Generic drag-to-reorder helper. onReorder(fromIdx, toIdx). */
function useDndReorder(onReorder) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const containerProps = (idx) => ({
    onDragOver: (e) => { e.preventDefault(); if (overIdx !== idx) setOverIdx(idx); },
    onDrop: (e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) onReorder(dragIdx, idx); setDragIdx(null); setOverIdx(null); },
    style: { borderTop: overIdx === idx && dragIdx !== null && dragIdx !== idx ? '2px solid #0C628D' : undefined, opacity: dragIdx === idx ? 0.4 : 1 },
  });
  const handleProps = (idx) => ({
    draggable: true,
    onDragStart: (e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; },
    onDragEnd: () => { setDragIdx(null); setOverIdx(null); },
    title: 'Geser untuk mengubah urutan',
    style: { cursor: 'grab', color: '#9CA3AF', flexShrink: 0, touchAction: 'none' },
  });
  return { containerProps, handleProps };
}

/** Renders a drag-and-drop reorderable list of lessons within one group. */
function LessonDndList({ lessons, onEdit, onToggle, onDelete, onReorder }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  return (
    <>
      {lessons.map((l, idx) => (
        <LessonCard
          key={l._id}
          l={l}
          onEdit={onEdit}
          onToggle={onToggle}
          onDelete={onDelete}
          isDragging={dragIdx === idx}
          isDragOver={overIdx === idx && dragIdx !== null && dragIdx !== idx}
          dragProps={{
            containerProps: {
              onDragOver: (e) => { e.preventDefault(); if (overIdx !== idx) setOverIdx(idx); },
              onDrop: (e) => {
                e.preventDefault();
                if (dragIdx !== null && dragIdx !== idx) onReorder(lessons, dragIdx, idx);
                setDragIdx(null); setOverIdx(null);
              },
            },
            handleProps: {
              draggable: true,
              onDragStart: (e) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; },
              onDragEnd: () => { setDragIdx(null); setOverIdx(null); },
            },
          }}
        />
      ))}
    </>
  );
}

export default function CourseManager() {
  const { api, role } = useAuth();

  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const selected = useMemo(() => courses.find((c) => c._id === selectedId) || null, [courses, selectedId]);
  const [activeTab, setActiveTab] = useState('settings');

  const [courseForm, setCourseForm] = useState({ title: '', description: '', coverImageUrl: '', priceIdr: 0, isPublished: false, tags: [], categoryId: '', templateId: '' });
  const [categories, setCategories] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [templates, setTemplates] = useState([]);
  const [applyTemplateId, setApplyTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [applyTemplateMsg, setApplyTemplateMsg] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadingForSelected, setCoverUploadingForSelected] = useState(false);
  const [selectedCoverDraft, setSelectedCoverDraft] = useState('');

  const confirmActionRef = useRef(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Konfirmasi',
    message: '',
    confirmText: 'OK',
    confirmVariant: 'primary',
  });

  function askConfirm({ title, message, confirmText, confirmVariant, onConfirm }) {
    confirmActionRef.current = onConfirm;
    setConfirmState({
      open: true,
      title: title || 'Konfirmasi',
      message: message || '',
      confirmText: confirmText || 'OK',
      confirmVariant: confirmVariant || 'primary',
    });
  }

  const [modules, setModules] = useState([]);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', order: 0, isPublished: true });
  const [editingModuleId, setEditingModuleId] = useState('');

  const [lessons, setLessons] = useState([]);
  const defaultLessonHtml =
    '<h2>Tujuan Pembelajaran</h2><ul><li>Tulis tujuan 1</li><li>Tulis tujuan 2</li></ul><h2>Materi</h2><p>Tulis materi di sini...</p><h2>Ringkasan</h2><ul><li>Point penting 1</li><li>Point penting 2</li></ul><h2>Latihan</h2><ol><li>Pertanyaan latihan 1</li><li>Pertanyaan latihan 2</li></ol>';

  function getDefaultLessonForm(nextOrder = 1) {
    return {
      title: '',
      moduleId: '',
      contentMarkdown: '',
      contentHtml: defaultLessonHtml,
      videoEmbedUrl: '',
      attachments: [],
      contentBlocks: [
        { type: 'content', title: 'Materi' },
        { type: 'attachments', title: 'Lampiran' },
      ],
      order: nextOrder,
      isPublished: false,
    };
  }

  const [editingLessonId, setEditingLessonId] = useState('');
  const isEditingLesson = Boolean(editingLessonId);

  const [lessonForm, setLessonForm] = useState(() => getDefaultLessonForm(1));
  const [dragBlockIdx, setDragBlockIdx] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [attachLink, setAttachLink] = useState({ name: '', url: '' });

  const [quizzes, setQuizzes] = useState([]);
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    timeLimitSec: 0,
    randomizeQuestions: false,
    allowClearAnswers: false,
    isPublished: false,
    lessonId: '',
  });

  const [activePanel, setActivePanel] = useState('course');

  const [activeQuizId, setActiveQuizId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [bankCollections, setBankCollections] = useState([]);
  const [bankCollectionId, setBankCollectionId] = useState('');
  const [bankCount, setBankCount] = useState(10);
  const [bankQuestionTypes, setBankQuestionTypes] = useState(['mcq', 'essay', 'matching']);
  const [editingQuestionId, setEditingQuestionId] = useState('');
  const [questionForm, setQuestionForm] = useState({
    type: 'mcq',
    promptHtml: '<p>Tulis pertanyaan di sini...</p>',
    imageUrl: '',
    rubric: '',
    order: 1,
    choices: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correctChoiceId: 'a',
    pairs: [
      { left: '', right: '' },
      { left: '', right: '' },
    ],
  });


  async function loadCourses() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/courses/_manage/mine');
      setCourses(res.data.courses || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat course');
    } finally {
      setLoading(false);
    }
  }

  async function loadCourseDetails(courseId) {
    if (!courseId) {
      setModules([]);
      setLessons([]);
      setQuizzes([]);
      setActiveQuizId('');
      setQuestions([]);
      return;
    }
    try {
      const [mRes, lRes, qRes] = await Promise.all([
        api.get(`/courses/${courseId}/modules`),
        api.get(`/courses/${courseId}/lessons`),
        api.get(`/quizzes/course/${courseId}`),
      ]);
      setModules(mRes.data.modules || []);
      setLessons(lRes.data.lessons || []);
      setQuizzes(qRes.data.quizzes || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat detail course');
    }
  }

  async function loadQuestions(quizId) {
    if (!quizId) {
      setQuestions([]);
      return;
    }
    try {
      const res = await api.get(`/quizzes/${quizId}/questions`);
      setQuestions(res.data.questions || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat soal');
    }
  }

  useEffect(() => {
    loadCourses();
    api.get('/course-templates').then((r) => setTemplates(r.data.templates || [])).catch(() => {});
    api.get('/categories').then((r) => setCategories(r.data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadCourseDetails(selectedId);
  }, [selectedId]);

  useEffect(() => {
    // When switching course, exit edit mode and reset form
    setEditingLessonId('');
    setEditingModuleId('');
    setModuleForm({ title: '', description: '', order: 0, isPublished: true });
    setLessonForm((f) => getDefaultLessonForm(f?.order || 1));
    setAttachLink({ name: '', url: '' });
  }, [selectedId]);

  useEffect(() => {
    setSelectedCoverDraft(selected?.coverImageUrl || '');
  }, [selectedId, selected?.coverImageUrl]);

  useEffect(() => {
    // Populate course form when a course is selected
    if (!selected) {
      setCourseForm({ title: '', description: '', coverImageUrl: '', priceIdr: 0, isPublished: false, tags: [], categoryId: '', templateId: '' });
      return;
    }
    setCourseForm({
      title: selected.title || '',
      description: selected.description || '',
      coverImageUrl: selected.coverImageUrl || '',
      priceIdr: selected.priceIdr || 0,
      isPublished: selected.isPublished || false,
      tags: selected.tags || [],
      categoryId: selected.categoryId?._id || selected.categoryId || '',
      templateId: selected.templateId || '',
    });
  }, [selected]);

  useEffect(() => {
    if (!activeQuizId) return;
    loadQuestions(activeQuizId);
  }, [activeQuizId]);

  useEffect(() => {
    if (activePanel !== 'quiz') return;
    loadBankCollections();
  }, [activePanel]);

  async function loadBankCollections() {
    try {
      const res = await api.get('/question-bank/collections');
      setBankCollections(res.data.collections || []);
    } catch (_) {
      // ignore; Bank Soal may be unused on this screen
    }
  }

  async function createOrUpdateModule(e) {
    e.preventDefault();
    if (!selected) return;
    if (!moduleForm.title.trim()) { setError('Nama modul wajib diisi'); return; }
    setError('');
    try {
      if (editingModuleId) {
        await api.put(`/courses/${selected._id}/modules/${editingModuleId}`, moduleForm);
      } else {
        await api.post(`/courses/${selected._id}/modules`, moduleForm);
      }
      setEditingModuleId('');
      setModuleForm({ title: '', description: '', order: modules.length, isPublished: true });
      await loadCourseDetails(selected._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal simpan modul');
    }
  }

  function beginEditModule(mod) {
    setEditingModuleId(mod._id);
    setModuleForm({ title: mod.title || '', description: mod.description || '', order: mod.order || 0, isPublished: mod.isPublished !== false });
  }

  async function deleteModule(mod) {
    if (!selected) return;
    askConfirm({
      title: 'Hapus modul?',
      message: 'Modul dihapus. Materi yang ada di modul ini akan menjadi tidak termodul.',
      confirmText: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setError('');
        try {
          await api.delete(`/courses/${selected._id}/modules/${mod._id}`);
          await loadCourseDetails(selected._id);
        } catch (e) {
          setError(e?.response?.data?.error?.message || 'Gagal hapus modul');
        }
      },
    });
  }

  async function importQuestionsFromBank(e) {
    e.preventDefault();
    if (!activeQuizId) return;
    setError('');
    if (bankQuestionTypes.length === 0) {
      setError('Pilih minimal satu tipe soal');
      return;
    }
    try {
      const res = await api.post(`/quizzes/${activeQuizId}/import-from-bank`, {
        collectionId: bankCollectionId,
        count: bankCount,
        shuffle: true,
        questionTypes: bankQuestionTypes,
      });
      await loadQuestions(activeQuizId);
      const imported = Number(res.data?.imported || 0);
      if (!imported) setError('Tidak ada soal yang diimpor');
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.response?.data?.error?.message || 'Gagal impor soal dari Bank Soal');
    }
  }

  async function uploadCoverImage(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/uploads/image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  }

  async function applyTemplate() {
    if (!selected?._id || !applyTemplateId) return;
    const tplName = templates.find((t) => String(t._id) === String(applyTemplateId))?.name || 'template';
    if (!window.confirm(`Terapkan outline "${tplName}" ke course ini? Modul & materi baru akan ditambahkan (draft).`)) return;
    setApplyingTemplate(true);
    setError('');
    try {
      const res = await api.post(`/courses/${selected._id}/apply-template`, { templateId: applyTemplateId });
      await loadCourseDetails(selected._id);
      setApplyTemplateId('');
      setApplyTemplateMsg(`Berhasil menambahkan ${res.data.modulesCreated || 0} modul & ${res.data.lessonsCreated || 0} materi dari template.`);
      setTimeout(() => setApplyTemplateMsg(''), 5000);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal menerapkan template');
    } finally {
      setApplyingTemplate(false);
    }
  }

  async function uploadLessonPdf(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/uploads/pdf', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  }

  async function createCourse(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...courseForm };
      if (!payload.templateId) delete payload.templateId;
      if (!payload.categoryId) delete payload.categoryId;
      const res = await api.post('/courses', payload);
      await loadCourses();
      setSelectedId(res.data.course._id);
      setCourseForm({ title: '', description: '', coverImageUrl: '', priceIdr: 0, isPublished: false, tags: [], categoryId: '', templateId: '' });
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal membuat course');
    }
  }

  // Toggle publish langsung dari daftar course (admin only).
  async function toggleCoursePublish(c) {
    setError('');
    try {
      await api.put(`/courses/${c._id}`, {
        title: c.title,
        description: c.description,
        coverImageUrl: c.coverImageUrl,
        priceIdr: c.priceIdr,
        isPublished: !c.isPublished,
        tags: c.tags ?? [],
      });
      await loadCourses();
      if (String(selected?._id) === String(c._id)) await loadCourseDetails(c._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal update status publish');
    }
  }

  async function updateSelectedCourse(patch = {}) {
    if (!selected) return;
    // Guard: if called directly from onClick, patch is a MouseEvent — ignore it
    if (patch && typeof patch.preventDefault === 'function') patch = {};
    setError('');
    try {
      const payload = {
        title: patch.title ?? selected.title,
        description: patch.description ?? selected.description,
        coverImageUrl: patch.coverImageUrl ?? selected.coverImageUrl,
        priceIdr: patch.priceIdr ?? selected.priceIdr,
        isPublished: patch.isPublished ?? selected.isPublished,
        tags: patch.tags ?? selected.tags ?? [],
        categoryId: (patch.categoryId !== undefined ? patch.categoryId : (selected.categoryId?._id || selected.categoryId)) || null,
      };
      await api.put(`/courses/${selected._id}`, payload);
      await loadCourses();
      await loadCourseDetails(selected._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal update course');
    }
  }

  async function deleteSelectedCourse() {
    if (!selected) return;
    askConfirm({
      title: 'Hapus course?',
      message: 'Semua materi & quiz ikut terhapus.',
      confirmText: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setError('');
        try {
          await api.delete(`/courses/${selected._id}`);
          setSelectedId('');
          await loadCourses();
        } catch (e) {
          const status = e?.response?.status;
          const msg = e?.response?.data?.error?.message || e?.message || 'Gagal hapus course';
          setError(status ? `(${status}) ${msg}` : msg);
        }
      },
    });
  }

  async function createLesson(e) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    try {
      const payload = {
        ...lessonForm,
        attachments: lessonForm.attachments || [],
        contentBlocks: normalizeBlocks(lessonForm.contentBlocks, lessonForm.videoEmbedUrl, lessonForm.attachments || []),
      };
      await api.post(`/courses/${selected._id}/lessons`, payload);

      setEditingLessonId('');
      setLessonForm((f) => getDefaultLessonForm((f?.order || 1) + 1));
      setAttachLink({ name: '', url: '' });
      await loadCourseDetails(selected._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal tambah materi');
    }
  }

  async function updateLesson(e) {
    e.preventDefault();
    if (!selected) return;
    if (!editingLessonId) return;
    setError('');
    try {
      const payload = {
        ...lessonForm,
        attachments: lessonForm.attachments || [],
        contentBlocks: normalizeBlocks(lessonForm.contentBlocks, lessonForm.videoEmbedUrl, lessonForm.attachments || []),
      };
      await api.put(`/courses/${selected._id}/lessons/${editingLessonId}`, payload);
      setEditingLessonId('');
      setLessonForm((f) => getDefaultLessonForm(f?.order || 1));
      setAttachLink({ name: '', url: '' });
      await loadCourseDetails(selected._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal update materi');
    }
  }

  function beginEditLesson(lesson) {
    if (!lesson) return;
    const attachments = lesson.attachments || [];
    const videoEmbedUrl = lesson.videoEmbedUrl || '';
    const blocks = normalizeBlocks(lesson.contentBlocks || [], videoEmbedUrl, attachments);
    setEditingLessonId(lesson._id);
    setLessonForm({
      title: lesson.title || '',
      moduleId: lesson.moduleId ? String(lesson.moduleId) : '',
      contentMarkdown: lesson.contentMarkdown || '',
      contentHtml: lesson.contentHtml || defaultLessonHtml,
      videoEmbedUrl,
      attachments,
      contentBlocks: blocks,
      order: typeof lesson.order === 'number' ? lesson.order : Number(lesson.order || 0),
      isPublished: Boolean(lesson.isPublished),
    });
    setAttachLink({ name: '', url: '' });
  }

  function cancelEditLesson() {
    setEditingLessonId('');
    setLessonForm((f) => getDefaultLessonForm(f?.order || 1));
    setAttachLink({ name: '', url: '' });
  }

  function normalizeBlocks(blocks, videoEmbedUrl, attachments) {
    const seen = new Set();
    const cleaned = (blocks || [])
      .filter((b) => b && b.type)
      .map((b) => ({ type: b.type, title: b.title || '' }))
      .filter((b) => {
        if (seen.has(b.type)) return false;
        seen.add(b.type);
        return true;
      });

    // content is mandatory
    if (!seen.has('content')) cleaned.unshift({ type: 'content', title: 'Materi' });

    // If no video url, remove video block
    if (!videoEmbedUrl) {
      return cleaned.filter((b) => b.type !== 'video');
    }

    // If video url exists but block missing, add it to top by default
    if (videoEmbedUrl && !cleaned.some((b) => b.type === 'video')) {
      cleaned.unshift({ type: 'video', title: 'Video' });
    }

    // If no attachments, keep block but it will render empty in student view; allow teachers to reorder regardless.
    // (No-op)
    void attachments;
    return cleaned;
  }

  async function toggleLessonPublish(lesson) {
    if (!selected) return;
    setError('');
    try {
      await api.put(`/courses/${selected._id}/lessons/${lesson._id}`, { ...lesson, isPublished: !lesson.isPublished });
      await loadCourseDetails(selected._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal update materi');
    }
  }

  async function reorderLessons(groupLessons, fromIdx, toIdx) {
    if (!selected || fromIdx === toIdx) return;
    const reordered = [...groupLessons];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const reorderedIds = reordered.map((l) => String(l._id));
    try {
      await api.put(`/courses/${selected._id}/lessons/reorder`, { orderedIds: reorderedIds });
      await loadCourseDetails(selected._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal mengubah urutan materi');
    }
  }

  async function reorderModules(fromIdx, toIdx) {
    if (!selected || fromIdx === toIdx) return;
    const reordered = [...modules];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setModules(reordered); // optimistic
    try {
      await api.put(`/courses/${selected._id}/modules/reorder`, { orderedIds: reordered.map((m) => String(m._id)) });
      await loadCourseDetails(selected._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal mengubah urutan modul');
      await loadCourseDetails(selected._id);
    }
  }

  async function reorderCourses(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const reordered = [...courses];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setCourses(reordered); // optimistic
    try {
      await api.put('/courses/reorder', { orderedIds: reordered.map((c) => String(c._id)) });
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal mengubah urutan course');
      await loadCourses();
    }
  }

  async function deleteLesson(lesson) {
    if (!selected) return;
    askConfirm({
      title: 'Hapus materi?',
      message: 'Materi ini akan dihapus permanen.',
      confirmText: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setError('');
        try {
          await api.delete(`/courses/${selected._id}/lessons/${lesson._id}`);
          await loadCourseDetails(selected._id);
        } catch (e) {
          setError(e?.response?.data?.error?.message || 'Gagal hapus materi');
        }
      },
    });
  }

  async function createQuiz(e) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    try {
      const res = await api.post(`/quizzes/course/${selected._id}`, quizForm);
      setQuizForm({ title: '', description: '', timeLimitSec: 0, randomizeQuestions: false, allowClearAnswers: false, isPublished: false, lessonId: '' });
      await loadCourseDetails(selected._id);
      setActiveQuizId(res.data.quiz._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal tambah quiz');
    }
  }

  async function toggleQuizPublish(quiz) {
    setError('');
    try {
      await api.put(`/quizzes/${quiz._id}`, { ...quiz, isPublished: !quiz.isPublished });
      await loadCourseDetails(selected._id);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal update quiz');
    }
  }

  async function deleteQuiz(quiz) {
    askConfirm({
      title: 'Hapus quiz?',
      message: 'Quiz ini beserta semua soalnya akan terhapus.',
      confirmText: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setError('');
        try {
          await api.delete(`/quizzes/${quiz._id}`);
          setActiveQuizId('');
          setQuestions([]);
          await loadCourseDetails(selected._id);
        } catch (e) {
          setError(e?.response?.data?.error?.message || 'Gagal hapus quiz');
        }
      },
    });
  }

  function editQuestion(q) {
    setEditingQuestionId(q._id);
    setQuestionForm({
      type: q.type || 'mcq',
      promptHtml: q.promptHtml || '',
      imageUrl: q.imageUrl || '',
      rubric: q.rubric || '',
      order: q.order || 1,
      choices: Array.isArray(q.choices) ? q.choices : [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }],
      correctChoiceId: q.correctChoiceId || 'a',
      pairs: Array.isArray(q.pairs) ? q.pairs : [{ left: '', right: '' }, { left: '', right: '' }],
    });
  }

  function cancelEditQuestion() {
    setEditingQuestionId('');
    setQuestionForm((q) => ({
      ...q,
      type: 'mcq',
      promptHtml: '<p>Tulis pertanyaan di sini...</p>',
      imageUrl: '',
      rubric: '',
      choices: q.choices.map((c) => ({ ...c, text: '' })),
      correctChoiceId: 'a',
      pairs: q.pairs?.map(() => ({ left: '', right: '' })) || [
        { left: '', right: '' },
        { left: '', right: '' },
      ],
    }));
  }

  async function createQuestion(e) {
    e.preventDefault();
    if (!activeQuizId) return;
    setError('');
    try {
      const payload = {};
      if (questionForm.type === 'essay') {
        payload.type = 'essay';
        payload.promptHtml = questionForm.promptHtml;
        payload.imageUrl = questionForm.imageUrl || '';
        payload.rubric = questionForm.rubric;
        if (!editingQuestionId) payload.order = questions.length;
      } else if (questionForm.type === 'matching') {
        const cleanedPairs = (questionForm.pairs || []).filter((p) => (p.left || '').trim() && (p.right || '').trim());
        payload.type = 'matching';
        payload.promptHtml = questionForm.promptHtml;
        payload.imageUrl = questionForm.imageUrl || '';
        payload.pairs = cleanedPairs;
        if (!editingQuestionId) payload.order = questions.length;
      } else {
        const cleanedChoices = questionForm.choices.filter((c) => c.text.trim());
        payload.type = 'mcq';
        payload.promptHtml = questionForm.promptHtml;
        payload.imageUrl = questionForm.imageUrl || '';
        payload.choices = cleanedChoices;
        payload.correctChoiceId = questionForm.correctChoiceId;
        if (!editingQuestionId) payload.order = questions.length;
      }

      if (editingQuestionId) {
        await api.put(`/quizzes/${activeQuizId}/questions/${editingQuestionId}`, payload);
      } else {
        await api.post(`/quizzes/${activeQuizId}/questions`, payload);
      }

      setEditingQuestionId('');
      setQuestionForm((q) => ({
        ...q,
        type: 'mcq',
        promptHtml: '<p>Tulis pertanyaan di sini...</p>',
        imageUrl: '',
        rubric: '',
        order: q.order + 1,
        choices: q.choices.map((c) => ({ ...c, text: '' })),
        correctChoiceId: 'a',
        pairs: q.pairs?.map(() => ({ left: '', right: '' })) || [
          { left: '', right: '' },
          { left: '', right: '' },
        ],
      }));
      await loadQuestions(activeQuizId);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal ' + (editingQuestionId ? 'update' : 'tambah') + ' soal');
    }
  }

  async function deleteQuestion(q) {
    if (!activeQuizId) return;
    askConfirm({
      title: 'Hapus soal?',
      message: 'Soal ini akan dihapus permanen.',
      confirmText: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setError('');
        try {
          await api.delete(`/quizzes/${activeQuizId}/questions/${q._id}`);
          await loadQuestions(activeQuizId);
        } catch (e) {
          setError(e?.response?.data?.error?.message || 'Gagal hapus soal');
        }
      },
    });
  }

  async function moveQuestion(q, direction) {
    if (!activeQuizId || !questions.length) return;
    setError('');
    try {
      const currentIdx = questions.findIndex((qi) => qi._id === q._id);
      const newIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
      if (newIdx < 0 || newIdx >= questions.length) return;

      const orderedByOrder = [...questions].sort((a, b) => a.order - b.order);
      const currentQuestion = orderedByOrder[currentIdx];
      const swapQuestion = orderedByOrder[newIdx];

      const tmp = currentQuestion.order;
      currentQuestion.order = swapQuestion.order;
      swapQuestion.order = tmp;

      await api.put(`/quizzes/${activeQuizId}/questions/${currentQuestion._id}`, { order: currentQuestion.order });
      await api.put(`/quizzes/${activeQuizId}/questions/${swapQuestion._id}`, { order: swapQuestion.order });
      await loadQuestions(activeQuizId);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal pindah soal');
    }
  }

  async function randomizeQuestionOrder() {
    if (!activeQuizId || !questions.length) return;
    setError('');
    try {
      const types = ['mcq', 'essay', 'matching'];
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const updates = shuffled.map((q, idx) => ({
        ...q,
        order: idx + 1,
        type: types[Math.floor(Math.random() * types.length)]
      }));

      // Update each question's order and type
      await Promise.all(
        updates.map((q) => api.put(`/quizzes/${activeQuizId}/questions/${q._id}`, { order: q.order, type: q.type }))
      );
      await loadQuestions(activeQuizId);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal acak urutan soal');
    }
  }

  function handleTypeChange(newType) {
    setQuestionForm((f) => {
      let updated = { ...f, type: newType };
      
      if (newType === 'essay') {
        // Reset untuk essay: clear choices & pairs, set rubric
        updated.choices = [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }];
        updated.correctChoiceId = '';
        updated.pairs = [{ left: '', right: '' }, { left: '', right: '' }];
        updated.rubric = f.rubric || '<p>Rubrik penilaian...</p>';
      } else if (newType === 'matching') {
        // Reset untuk matching: clear choices, keep pairs
        updated.choices = [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }];
        updated.correctChoiceId = '';
        updated.rubric = '';
        if (!f.pairs || f.pairs.length === 0) {
          updated.pairs = [{ left: '', right: '' }, { left: '', right: '' }];
        }
      } else {
        // Reset untuk MCQ: reset choices to 4 empty, clear pairs
        updated.choices = [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }];
        updated.correctChoiceId = 'a';
        updated.pairs = [{ left: '', right: '' }, { left: '', right: '' }];
        updated.rubric = '';
      }
      
      return updated;
    });
  }

  const [searchParams] = useSearchParams();
  const courseQuery = (searchParams.get('q') || '').trim().toLowerCase();
  const visibleCourses = courseQuery
    ? courses.filter((c) => (c.title || '').toLowerCase().includes(courseQuery))
    : courses;

  // Auto-pilih course dari ?course=<id> (mis. saat keluar dari mode preview).
  const courseParam = searchParams.get('course');
  useEffect(() => {
    if (!courseParam || !courses.length) return;
    if (String(selectedId) === String(courseParam)) return;
    if (courses.some((c) => String(c._id) === String(courseParam))) {
      setSelectedId(courseParam);
      setActiveTab('settings');
    }
  }, [courseParam, courses]); // eslint-disable-line react-hooks/exhaustive-deps

  const courseDnd = useDndReorder(reorderCourses);
  const canReorderCourses = role === 'admin' && !courseQuery; // nonaktifkan reorder saat mencari
  const moduleDnd = useDndReorder(reorderModules);

  const renderSidebar = () => (
    <div className="grid gap-2">
      {courseQuery && (
        <div className="text-xs text-slate-500 px-1 pb-1">Hasil pencarian "{courseQuery}": {visibleCourses.length} course</div>
      )}
      {visibleCourses.map((c, idx) => {
        const dnd = canReorderCourses ? courseDnd.containerProps(idx) : {};
        return (
        <div
          key={c._id}
          {...dnd}
          onClick={() => {
            setSelectedId(c._id);
            setActiveTab('settings');
          }}
          className={
            'px-3 py-2 text-left text-sm font-medium rounded-lg transition break-words cursor-pointer ' +
            (selectedId === c._id ? 'bg-[#0C628D] text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200')
          }
          style={dnd.style}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              {canReorderCourses && (
                <span {...courseDnd.handleProps(idx)} onClick={(e) => e.stopPropagation()} style={{ ...courseDnd.handleProps(idx).style, color: selectedId === c._id ? 'rgba(255,255,255,.7)' : '#9CA3AF', marginTop: 1 }}>
                  <i className="ti ti-grip-vertical" style={{ fontSize: 14 }} />
                </span>
              )}
              <div className="min-w-0 font-semibold leading-snug line-clamp-2 break-words">{c.title}</div>
            </div>
            {role === 'admin' ? (
              <span
                onClick={(e) => { e.stopPropagation(); toggleCoursePublish(c); }}
                title={c.isPublished ? 'Klik untuk jadikan draft' : 'Klik untuk publish'}
                className="mt-0.5 shrink-0 flex items-center gap-1.5"
              >
                <Toggle checked={!!c.isPublished} onChange={() => toggleCoursePublish(c)} />
                <span className={'text-[10px] font-extrabold ' + (selectedId === c._id ? 'text-white' : c.isPublished ? 'text-emerald-700' : 'text-rose-700')}>
                  {c.isPublished ? 'PUBLISHED' : 'DRAFT'}
                </span>
              </span>
            ) : (
              <span
                className={
                  'mt-0.5 shrink-0 rounded border px-2 py-0.5 text-[10px] font-extrabold ' +
                  (c.isPublished
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900')
                }
              >
                {c.isPublished ? 'PUBLISHED' : 'DRAFT'}
              </span>
            )}
          </div>
        </div>
        );
      })}
      {!loading && courses.length === 0 ? <div className="text-sm text-slate-600">{role === 'teacher' ? 'Belum ada course kontrak. Course akan muncul setelah Anda menerima kontrak kerjasama.' : 'Belum ada course.'}</div> : null}
      {loading ? <div className="text-sm text-slate-600">Loading...</div> : null}
      {role === 'admin' && (
        <Button onClick={() => { setSelectedId(''); setActiveTab('new'); }} className="w-full mt-4">
          Tambah Course Baru
        </Button>
      )}
    </div>
  );

  return (
    <>
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmVariant={confirmState.confirmVariant}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={async () => {
          const action = confirmActionRef.current;
          setConfirmState((s) => ({ ...s, open: false }));
          if (typeof action === 'function') await action();
        }}
      />
      <SidebarShell
        title="Kelola Course"
        description="Buat course, tambah materi (markdown), buat quiz dan soal."
        actions={<Button variant="outline" onClick={loadCourses} disabled={loading} className="rounded-lg">Refresh</Button>}
        sidebarTitle="Course Saya"
        renderSidebar={renderSidebar}
        sidebarWidth="w-80"
        resizable
        resizeKey="course-sidebar-width"
      >
        {error ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <div className="flex flex-1 min-h-0 flex-col overflow-auto">
              {!selected && activeTab !== 'new' ? (
                <div className="text-sm text-slate-600">Pilih course di kiri untuk kelola materi & quiz.</div>
              ) : activeTab === 'new' ? (
                <div>
                  <div className="font-bold text-lg mb-6">Buat Course Baru</div>
                  <form className="grid gap-4" onSubmit={createCourse}>
                    <div>
                      <Label>Title</Label>
                      <div className="mt-1">
                        <Input value={courseForm.title} onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))} placeholder="Nama course" />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <div className="mt-1">
                        <RichTextEditor
                          label=""
                          valueHtml={courseForm.description || ''}
                          onChangeHtml={(html) => setCourseForm((f) => ({ ...f, description: html }))}
                          editorClassName="min-h-[200px]"
                          onUploadImage={async (file) => {
                            const fd = new FormData();
                            fd.append('file', file);
                            const res = await api.post('/uploads/image', fd, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            return res.data.url;
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Cover (opsional)</Label>
                      {courseForm.coverImageUrl ? (
                        <div className="mt-2 aspect-video overflow-hidden border border-slate-200 bg-slate-100 rounded-lg">
                          <img src={courseForm.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : null}
                      <div className="mt-2 grid gap-2">
                        <Input
                          value={courseForm.coverImageUrl}
                          onChange={(e) => setCourseForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                          placeholder="Tempel URL gambar (atau upload file di bawah)"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          disabled={coverUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setError('');
                            setCoverUploading(true);
                            try {
                              const url = await uploadCoverImage(file);
                              setCourseForm((f) => ({ ...f, coverImageUrl: url }));
                            } catch (err) {
                              setError(err?.response?.data?.error?.message || err?.message || 'Gagal upload cover');
                            } finally {
                              setCoverUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        {coverUploading ? <div className="text-xs text-slate-600">Uploading...</div> : null}
                      </div>
                    </div>
                    <div>
                      <Label>Harga (Rp)</Label>
                      <div className="mt-1">
                        <Input
                          type="number"
                          min="0"
                          value={courseForm.priceIdr}
                          onChange={(e) => setCourseForm((f) => ({ ...f, priceIdr: Number(e.target.value) || 0 }))}
                          placeholder="0 untuk gratis"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Tags / Keahlian</Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                              e.preventDefault();
                              const t = tagInput.trim().toLowerCase();
                              if (!courseForm.tags.includes(t)) setCourseForm((f) => ({ ...f, tags: [...f.tags, t] }));
                              setTagInput('');
                            }
                          }}
                          placeholder="Ketik tag lalu Enter (mis: javascript, desain grafis)"
                        />
                      </div>
                      {courseForm.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {courseForm.tags.map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              {t}
                              <button type="button" onClick={() => setCourseForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))} className="hover:text-orange-600">&times;</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Template Outline <span className="text-slate-400 font-normal">(opsional)</span></Label>
                      <div className="mt-1">
                        <select
                          value={courseForm.templateId}
                          onChange={(e) => setCourseForm((f) => ({ ...f, templateId: e.target.value }))}
                          disabled={templates.length === 0}
                          className="w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-[#0C628D] disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="">{templates.length === 0 ? 'Belum ada template tersedia' : 'Tanpa template'}</option>
                          {templates.map((t) => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                          ))}
                        </select>
                        {templates.length === 0 && (
                          <p className="text-xs text-slate-400 mt-1">Buat template di menu <span className="font-semibold">Template Outline</span> terlebih dahulu.</p>
                        )}
                      </div>
                    </div>
                    <Toggle
                      checked={courseForm.isPublished}
                      onChange={(e) => setCourseForm((f) => ({ ...f, isPublished: e.target.checked }))}
                      label="Publish"
                    />
                    <div className="flex gap-2">
                      <Button type="submit">Tambah Course</Button>
                      <Button type="button" variant="outline" onClick={() => setActiveTab('settings')}>Batal</Button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-lg font-bold">{selected.title}</div>
                    <div className="mt-2">
                      <Toggle
                        checked={selected.isPublished}
                        onChange={() => updateSelectedCourse({ isPublished: !selected.isPublished })}
                        label={selected.isPublished ? 'Published' : 'Draft'}
                        disabled={role === 'teacher'}
                      />
                      {role === 'teacher' && (
                        <div className="text-xs text-slate-400 mt-1">Publish dikontrol admin</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.open(`/courses/${selected._id}?preview=1`, '_blank')}>
                      Preview
                    </Button>
                    <Button variant="outline" onClick={() => window.open(`/dashboard/courses/${selected._id}/stats`, '_blank')}>
                      Lihat Statistik
                    </Button>
                    {role === 'admin' && (
                      <Button variant="danger" onClick={deleteSelectedCourse}>
                        Hapus
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tab Bar */}
                <div className="mt-6 flex gap-2 border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors ${
                      activeTab === 'settings'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pengaturan
                  </button>
                  <button
                    onClick={() => setActiveTab('modules')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors ${
                      activeTab === 'modules'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Modul {modules.length > 0 ? `(${modules.length})` : ''}
                  </button>
                  <button
                    onClick={() => setActiveTab('lessons')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors ${
                      activeTab === 'lessons'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Materi
                  </button>
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors ${
                      activeTab === 'quiz'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Quiz
                  </button>
                </div>

                <div className="mt-4 flex-1 min-h-0 overflow-auto pr-1">
                  {activeTab === 'settings' && (
                    <div>
                      <div className="font-bold">Pengaturan Kursus</div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <Label>Judul Course {role === 'teacher' && <span className="text-slate-400 font-normal normal-case">(hanya admin)</span>}</Label>
                        <div className="mt-1">
                          <Input
                            value={courseForm.title}
                            onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
                            disabled={role === 'teacher'}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Deskripsi</Label>
                        <div className="mt-1">
                          <RichTextEditor
                            label=""
                            valueHtml={courseForm.description || ''}
                            onChangeHtml={(html) => setCourseForm((f) => ({ ...f, description: html }))}
                            editorClassName="min-h-[100px]"
                            onUploadImage={async (file) => {
                              const fd = new FormData();
                              fd.append('file', file);
                              const res = await api.post('/uploads/image', fd, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                              });
                              return res.data.url;
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Harga (Rp) {role === 'teacher' && <span className="text-slate-400 font-normal normal-case">(hanya admin)</span>}</Label>
                        <div className="mt-1">
                          <Input
                            type="number"
                            min="0"
                            value={courseForm.priceIdr}
                            onChange={(e) => setCourseForm((f) => ({ ...f, priceIdr: Number(e.target.value) || 0 }))}
                            placeholder="0 untuk gratis"
                            disabled={role === 'teacher'}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Tags / Keahlian</Label>
                        <div className="mt-1 flex gap-2">
                          <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                                e.preventDefault();
                                const t = tagInput.trim().toLowerCase();
                                if (!courseForm.tags.includes(t)) setCourseForm((f) => ({ ...f, tags: [...f.tags, t] }));
                                setTagInput('');
                              }
                            }}
                            placeholder="Ketik tag lalu Enter"
                          />
                        </div>
                        {courseForm.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {courseForm.tags.map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                                {t}
                                <button type="button" onClick={() => setCourseForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))} className="hover:text-orange-600">&times;</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {categories.length > 0 && (
                        <div>
                          <Label>Kategori</Label>
                          <div className="mt-1">
                            <select
                              className="w-full rounded-[10px] border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                              value={courseForm.categoryId}
                              onChange={(e) => setCourseForm((f) => ({ ...f, categoryId: e.target.value }))}
                            >
                              <option value="">-- Tanpa Kategori --</option>
                              {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={() => updateSelectedCourse(courseForm)}>Simpan Perubahan</Button>
                      </div>
                    </div>

                    {role === 'admin' && (
                    <div className="mt-6 border-t pt-4">
                      <div className="font-bold mb-3">Cover Image</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                      <div className="aspect-[16/9] overflow-hidden border border-slate-200 bg-slate-100">
                        {selected.coverImageUrl ? (
                          <img src={selected.coverImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                            Cover (opsional)
                          </div>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Input
                          value={selectedCoverDraft}
                          onChange={(e) => setSelectedCoverDraft(e.target.value)}
                          placeholder="Tempel URL gambar cover"
                        />
                        <Button
                          variant="outline"
                          onClick={() => updateSelectedCourse({ coverImageUrl: selectedCoverDraft })}
                          disabled={(selected.coverImageUrl || '') === selectedCoverDraft}
                        >
                          Simpan URL
                        </Button>
                        <label className="inline-flex items-center">
                          <span
                            className={
                              'inline-flex items-center justify-center px-4 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 ' +
                              (coverUploadingForSelected ? 'opacity-50 pointer-events-none' : '')
                            }
                          >
                            {coverUploadingForSelected ? 'Uploading...' : 'Upload Cover'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={coverUploadingForSelected}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setError('');
                              setCoverUploadingForSelected(true);
                              try {
                                const url = await uploadCoverImage(file);
                                await updateSelectedCourse({ coverImageUrl: url });
                              } catch (err) {
                                setError(err?.response?.data?.error?.message || err?.message || 'Gagal upload cover');
                              } finally {
                                setCoverUploadingForSelected(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                        {coverUploadingForSelected ? <div className="text-xs text-slate-600">Uploading...</div> : null}

                        <Button
                          variant="outline"
                          onClick={() => updateSelectedCourse({ coverImageUrl: '' })}
                          disabled={!selected.coverImageUrl}
                        >
                          Hapus Cover
                        </Button>
                      </div>
                    </div>
                    </div>
                    )}
                    </div>
                  )}

                  {activeTab === 'modules' && (
                    <div>
                      <div className="font-bold mb-4">Modul Kursus</div>

                      {templates.length > 0 && (
                        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm font-semibold text-slate-800">Terapkan Template Outline</div>
                          <p className="text-xs text-slate-500 mt-0.5 mb-3">Tambahkan modul & materi (draft) dari template ke course ini.</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={applyTemplateId}
                              onChange={(e) => setApplyTemplateId(e.target.value)}
                              className="border border-slate-200 bg-white px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-[#0C628D] min-w-[200px]"
                            >
                              <option value="">Pilih template…</option>
                              {templates.map((t) => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              onClick={applyTemplate}
                              disabled={!applyTemplateId || applyingTemplate}
                            >
                              {applyingTemplate ? 'Menerapkan…' : 'Terapkan'}
                            </Button>
                          </div>
                          {applyTemplateMsg && (
                            <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">{applyTemplateMsg}</div>
                          )}
                        </div>
                      )}

                      <form className="grid gap-3 mb-6 border-b border-slate-200 pb-6" onSubmit={createOrUpdateModule}>
                        <div>
                          <Label>Nama Modul</Label>
                          <div className="mt-1">
                            <Input
                              value={moduleForm.title}
                              onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
                              placeholder="mis: Pendahuluan"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Deskripsi (opsional)</Label>
                          <div className="mt-1">
                            <Input
                              value={moduleForm.description}
                              onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
                              placeholder="Deskripsi singkat modul"
                            />
                          </div>
                        </div>
                        <Toggle
                          checked={moduleForm.isPublished}
                          onChange={(e) => setModuleForm((f) => ({ ...f, isPublished: e.target.checked }))}
                          label="Publish"
                        />
                        <div className="flex gap-2">
                          <Button type="submit">{editingModuleId ? 'Simpan Modul' : 'Tambah Modul'}</Button>
                          {editingModuleId && (
                            <Button type="button" variant="outline" onClick={() => {
                              setEditingModuleId('');
                              setModuleForm({ title: '', description: '', order: modules.length, isPublished: true });
                            }}>
                              Batal
                            </Button>
                          )}
                        </div>
                      </form>

                      <div className="grid gap-3">
                        {modules.map((mod, idx) => {
                          const modLessons = lessons.filter((l) => String(l.moduleId) === String(mod._id));
                          const mdnd = moduleDnd.containerProps(idx);
                          return (
                            <div key={mod._id} className="border border-slate-200 rounded-lg p-4" {...mdnd} style={mdnd.style}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span {...moduleDnd.handleProps(idx)} style={{ ...moduleDnd.handleProps(idx).style, marginTop: 2 }}>
                                    <i className="ti ti-grip-vertical" style={{ fontSize: 16 }} />
                                  </span>
                                  <div className="min-w-0">
                                  <div className="font-semibold text-slate-900">{mod.title}</div>
                                  {mod.description && <div className="text-xs text-slate-500 mt-0.5">{mod.description}</div>}
                                  <div className="text-xs text-slate-400 mt-1">
                                    {modLessons.length} materi · {mod.isPublished ? 'Published' : 'Draft'}
                                  </div>
                                  {modLessons.length > 0 && (
                                    <div className="mt-1 text-xs text-slate-500">
                                      {modLessons.map((l) => l.title).join(', ')}
                                    </div>
                                  )}
                                  </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <Button variant="outline" className="px-3 text-xs" onClick={() => beginEditModule(mod)}>
                                    Edit
                                  </Button>
                                  <Button variant="danger" className="px-3 text-xs" onClick={() => deleteModule(mod)}>
                                    Hapus
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {modules.length === 0 && (
                          <div className="text-sm text-slate-600 italic">Belum ada modul. Tambah modul untuk mengorganisir materi.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'lessons' && (
                    <div>
                    <div className="font-bold">Materi (Lessons)</div>
                    <form className="mt-3 grid gap-3" onSubmit={isEditingLesson ? updateLesson : createLesson}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Judul Materi</Label>
                          <div className="mt-1">
                            <Input value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <Label>Modul <span className="text-slate-400 font-normal">(opsional)</span></Label>
                          <div className="mt-1">
                            <select
                              className="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                              value={lessonForm.moduleId || ''}
                              onChange={(e) => setLessonForm((f) => ({ ...f, moduleId: e.target.value || null }))}
                            >
                              <option value="">Tanpa modul</option>
                              {modules.map((m) => (
                                <option key={m._id} value={m._id}>{m.title}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label>Video Embed URL (opsional)</Label>
                        <div className="mt-1">
                          <Input
                            value={lessonForm.videoEmbedUrl || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLessonForm((f) => ({
                                ...f,
                                videoEmbedUrl: val,
                                contentBlocks: normalizeBlocks(f.contentBlocks, val, f.attachments),
                              }));
                            }}
                            placeholder="https://www.youtube.com/embed/..."
                          />
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Gunakan URL embed (bukan URL watch).</div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-700">Urutan Isi (Drag & Drop)</div>
                        <div className="mt-2 grid gap-2">
                          {(lessonForm.contentBlocks || []).map((b, idx) => {
                            const title = b.title || (b.type === 'video' ? 'Video' : b.type === 'attachments' ? 'Lampiran' : 'Materi');
                            const disabled = b.type === 'content';
                            return (
                              <div
                                key={b.type}
                                draggable={!disabled}
                                onDragStart={() => setDragBlockIdx(idx)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (dragBlockIdx === null || dragBlockIdx === idx) return;
                                  setLessonForm((f) => {
                                    const arr = [...(f.contentBlocks || [])];
                                    const [moved] = arr.splice(dragBlockIdx, 1);
                                    arr.splice(idx, 0, moved);
                                    return { ...f, contentBlocks: arr };
                                  });
                                  setDragBlockIdx(null);
                                }}
                                className={
                                  'flex items-center justify-between gap-3 border border-slate-200 bg-white px-3 py-2 text-sm ' +
                                  (disabled ? 'opacity-70' : 'cursor-move')
                                }
                              >
                                <div className="min-w-0 truncate font-semibold text-slate-900">{title}</div>
                                <div className="text-xs font-semibold text-slate-600">{disabled ? 'WAJIB' : 'DRAG'}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <RichTextEditor
                          label="Konten Materi (Word-like)"
                          valueHtml={lessonForm.contentHtml}
                          onChangeHtml={(html) => setLessonForm((f) => ({ ...f, contentHtml: html }))}
                          editorClassName="min-h-[200px]"
                          onUploadImage={async (file) => {
                            const fd = new FormData();
                            fd.append('file', file);
                            const res = await api.post('/uploads/image', fd, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            return res.data.url;
                          }}
                        />
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-700">Lampiran (PDF / Link)</div>
                        <div className="mt-2 grid gap-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              value={attachLink.name}
                              onChange={(e) => setAttachLink((a) => ({ ...a, name: e.target.value }))}
                              placeholder="Nama link (opsional)"
                            />
                            <Input
                              value={attachLink.url}
                              onChange={(e) => setAttachLink((a) => ({ ...a, url: e.target.value }))}
                              placeholder="https://..."
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              type="button"
                              onClick={() => {
                                if (!attachLink.url.trim()) return;
                                setLessonForm((f) => ({
                                  ...f,
                                  attachments: [
                                    ...(f.attachments || []),
                                    { type: 'link', name: attachLink.name || attachLink.url, url: attachLink.url },
                                  ],
                                  contentBlocks: normalizeBlocks(
                                    f.contentBlocks,
                                    f.videoEmbedUrl,
                                    [
                                      ...(f.attachments || []),
                                      { type: 'link', name: attachLink.name || attachLink.url, url: attachLink.url },
                                    ]
                                  ),
                                }));
                                setAttachLink({ name: '', url: '' });
                              }}
                            >
                              Tambah Link
                            </Button>

                            <label className="inline-flex items-center">
                              <span
                                className={
                                  'inline-flex items-center justify-center px-4 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 ' +
                                  (pdfUploading ? 'opacity-50 pointer-events-none' : '')
                                }
                              >
                                {pdfUploading ? 'Uploading PDF...' : 'Upload PDF'}
                              </span>
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                disabled={pdfUploading}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setPdfUploading(true);
                                  setError('');
                                  try {
                                    const url = await uploadLessonPdf(file);
                                    setLessonForm((f) => ({
                                      ...f,
                                      attachments: [
                                        ...(f.attachments || []),
                                        { type: 'file', name: file.name, url },
                                      ],
                                      contentBlocks: normalizeBlocks(f.contentBlocks, f.videoEmbedUrl, [
                                        ...(f.attachments || []),
                                        { type: 'file', name: file.name, url },
                                      ]),
                                    }));
                                  } catch (err) {
                                    setError(err?.response?.data?.error?.message || err?.message || 'Gagal upload PDF');
                                  } finally {
                                    setPdfUploading(false);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {(lessonForm.attachments || []).length > 0 ? (
                            <div className="grid gap-2">
                              {(lessonForm.attachments || []).map((a, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <a className="min-w-0 truncate font-semibold text-slate-900 hover:underline" href={a.url} target="_blank" rel="noreferrer">
                                    {a.name || a.url}
                                  </a>
                                  <Button
                                    variant="danger"
                                    className="px-3"
                                    type="button"
                                    onClick={() =>
                                      setLessonForm((f) => ({
                                        ...f,
                                        attachments: (f.attachments || []).filter((_, i) => i !== idx),
                                        contentBlocks: normalizeBlocks(
                                          f.contentBlocks,
                                          f.videoEmbedUrl,
                                          (f.attachments || []).filter((_, i) => i !== idx)
                                        ),
                                      }))
                                    }
                                  >
                                    Hapus
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <Toggle
                        checked={lessonForm.isPublished}
                        onChange={(e) => setLessonForm((f) => ({ ...f, isPublished: e.target.checked }))}
                        label="Publish"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit">{isEditingLesson ? 'Simpan Perubahan' : 'Tambah Materi'}</Button>
                        {isEditingLesson ? (
                          <Button type="button" variant="outline" onClick={cancelEditLesson}>
                            Batal
                          </Button>
                        ) : null}
                      </div>
                    </form>

                    <div className="mt-4 grid gap-3">
                      {(() => {
                        if (modules.length === 0) {
                          return <LessonDndList lessons={lessons} onEdit={beginEditLesson} onToggle={toggleLessonPublish} onDelete={deleteLesson} onReorder={reorderLessons} />;
                        }
                        const groups = [];
                        for (const mod of modules) {
                          const ml = lessons.filter((l) => String(l.moduleId) === String(mod._id));
                          groups.push(<div key={mod._id}>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide py-1 border-b border-slate-100 mb-2">{mod.title}</div>
                            {ml.length === 0 ? <div className="text-xs text-slate-400 italic mb-2">Belum ada materi di modul ini.</div> : (
                              <LessonDndList lessons={ml} onEdit={beginEditLesson} onToggle={toggleLessonPublish} onDelete={deleteLesson} onReorder={reorderLessons} />
                            )}
                          </div>);
                        }
                        const uncat = lessons.filter((l) => !l.moduleId || !modules.find((m) => String(m._id) === String(l.moduleId)));
                        if (uncat.length > 0) {
                          groups.push(<div key="__uncat">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide py-1 border-b border-slate-100 mb-2">Tidak Termodul</div>
                            <LessonDndList lessons={uncat} onEdit={beginEditLesson} onToggle={toggleLessonPublish} onDelete={deleteLesson} onReorder={reorderLessons} />
                          </div>);
                        }
                        return groups;
                      })()}
                      {lessons.length === 0 ? <div className="text-sm text-slate-600">Belum ada materi.</div> : null}
                    </div>
                    </div>
                  )}

                  {activeTab === 'quiz' && (
                    <div
                      onFocusCapture={() => setActivePanel('quiz')}
                    >
                    <div className="font-bold">Quiz</div>
                    <form className="mt-3 grid gap-3" onSubmit={createQuiz}>
                      <div>
                        <Label>Judul Quiz</Label>
                        <div className="mt-1">
                          <Input value={quizForm.title} onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Quiz untuk Materi</Label>
                        <div className="mt-1">
                          <select
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={quizForm.lessonId || ''}
                            onChange={(e) => setQuizForm((f) => ({ ...f, lessonId: e.target.value }))}
                          >
                            <option value="">(Pilih materi...)</option>
                            {lessons.map((l) => (
                              <option key={l._id} value={l._id}>
                                {l.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Menentukan quiz ini muncul setelah materi yang dipilih.</div>
                      </div>
                      <div>
                        <Label>Description</Label>
                        <div className="mt-1">
                          <Textarea rows={3} value={quizForm.description} onChange={(e) => setQuizForm((f) => ({ ...f, description: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Time Limit (sec)</Label>
                        <div className="mt-1">
                          <Input type="number" value={quizForm.timeLimitSec} onChange={(e) => setQuizForm((f) => ({ ...f, timeLimitSec: Number(e.target.value) }))} />
                        </div>
                      </div>
                      <Toggle checked={quizForm.allowClearAnswers} onChange={(e) => setQuizForm((f) => ({ ...f, allowClearAnswers: e.target.checked }))} label="Izinkan siswa menghapus jawaban" />
                      <Toggle checked={quizForm.isPublished} onChange={(e) => setQuizForm((f) => ({ ...f, isPublished: e.target.checked }))} label="Publish" />
                      <Button type="submit">Tambah Quiz</Button>
                    </form>

                    <div className="mt-4 grid gap-2">
                      {quizzes.map((q) => (
                        <Card key={q._id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <button
                                className="text-left font-semibold text-slate-900 hover:underline"
                                onClick={() => setActiveQuizId(q._id)}
                                type="button"
                              >
                                {q.title}
                              </button>
                              <div className="text-xs text-slate-500">{q.isPublished ? 'Published' : 'Draft'}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Toggle checked={q.isPublished} onChange={() => toggleQuizPublish(q)} />
                              <Button variant="danger" className="px-3" onClick={() => deleteQuiz(q)}>
                                Hapus
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {quizzes.length === 0 ? <div className="text-sm text-slate-600">Belum ada quiz.</div> : null}
                    </div>

                    <div className="mt-6 border-t border-slate-200 pt-4">
                      <div className="font-bold">Soal (untuk quiz terpilih)</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Quiz aktif: <span className="font-semibold">{activeQuizId ? activeQuizId : '(belum dipilih)'}</span>
                      </div>

                      {activeQuizId ? (
                        <>
                          <form className="mt-3 grid gap-3" onSubmit={importQuestionsFromBank}>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="sm:col-span-2">
                                <Label>Ambil dari Bank Soal (koleksi)</Label>
                                <div className="mt-1">
                                  <select
                                    className="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    value={bankCollectionId}
                                    onChange={(e) => setBankCollectionId(e.target.value)}
                                  >
                                    <option value="">(pilih koleksi)</option>
                                    {bankCollections.map((c) => (
                                      <option key={c._id} value={c._id}>
                                        {c.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <Label>Jumlah Soal</Label>
                                <div className="mt-1">
                                  <Input type="number" min={1} max={200} value={bankCount} onChange={(e) => setBankCount(Number(e.target.value))} />
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label>Tipe Soal (Campur atau pilih spesifik)</Label>
                              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                {[
                                  { id: 'mcq', label: 'Pilihan Ganda' },
                                  { id: 'essay', label: 'Essay' },
                                  { id: 'matching', label: 'Mencocokan' },
                                ].map((type) => (
                                  <label key={type.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={bankQuestionTypes.includes(type.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setBankQuestionTypes([...bankQuestionTypes, type.id]);
                                        } else {
                                          setBankQuestionTypes(bankQuestionTypes.filter((t) => t !== type.id));
                                        }
                                      }}
                                      className="h-4 w-4 border border-slate-300 rounded"
                                    />
                                    <span className="text-sm text-slate-700">{type.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button type="submit" disabled={!bankCollectionId || bankQuestionTypes.length === 0}>
                                Ambil Soal
                              </Button>
                              <div className="text-xs text-slate-500">Soal dicampur & ditambahkan ke quiz aktif.</div>
                            </div>
                          </form>

                          <form className="mt-3 grid gap-3" onSubmit={createQuestion}>
                            {editingQuestionId && (
                              <div className="flex items-center justify-between rounded bg-slate-100 p-2">
                                <div className="text-xs font-semibold text-slate-700">Mode: Edit soal</div>
                                <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={cancelEditQuestion}>
                                  Batal
                                </Button>
                              </div>
                            )}
                            <div>
                              <Label>Tipe Soal</Label>
                              <div className="mt-1">
                                <select
                                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                  value={questionForm.type}
                                  onChange={(e) => handleTypeChange(e.target.value)}
                                >
                                  <option value="mcq">Pilihan ganda</option>
                                  <option value="essay">Essay</option>
                                  <option value="matching">Mencocokan</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <RichTextEditor
                                label="Pertanyaan (Word-like)"
                                valueHtml={questionForm.promptHtml}
                                onChangeHtml={(html) => setQuestionForm((f) => ({ ...f, promptHtml: html }))}
                                editorClassName="min-h-[160px]"
                                onUploadImage={async (file) => {
                                  const fd = new FormData();
                                  fd.append('file', file);
                                  const res = await api.post('/uploads/image', fd, {
                                    headers: { 'Content-Type': 'multipart/form-data' },
                                  });
                                  return res.data.url;
                                }}
                              />
                            </div>

                            <div>
                              <Label>Gambar Soal (opsional)</Label>
                              {questionForm.imageUrl && (
                                <div className="mt-2 max-w-md">
                                  <img
                                    src={questionForm.imageUrl}
                                    alt="Question"
                                    className="w-full h-auto rounded border border-slate-200"
                                  />
                                </div>
                              )}
                              <div className="mt-2 grid gap-2">
                                <Input
                                  value={questionForm.imageUrl}
                                  onChange={(e) => setQuestionForm((f) => ({ ...f, imageUrl: e.target.value }))}
                                  placeholder="URL gambar atau upload di bawah"
                                />
                                <label className="inline-flex items-center">
                                  <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 cursor-pointer">
                                    Upload Gambar
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setError('');
                                      try {
                                        const fd = new FormData();
                                        fd.append('file', file);
                                        const res = await api.post('/uploads/image', fd, {
                                          headers: { 'Content-Type': 'multipart/form-data' },
                                        });
                                        setQuestionForm((f) => ({ ...f, imageUrl: res.data.url }));
                                      } catch (err) {
                                        setError(err?.response?.data?.error?.message || 'Gagal upload gambar');
                                      } finally {
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>
                                {questionForm.imageUrl && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setQuestionForm((f) => ({ ...f, imageUrl: '' }))}
                                  >
                                    Hapus Gambar
                                  </Button>
                                )}
                              </div>
                            </div>

                            {questionForm.type === 'essay' ? (
                              <div>
                                <Label>Rubrik / Kriteria Penilaian (opsional)</Label>
                                <div className="mt-1">
                                  <Textarea
                                    rows={3}
                                    value={questionForm.rubric}
                                    onChange={(e) => setQuestionForm((f) => ({ ...f, rubric: e.target.value }))}
                                    placeholder="Contoh: Jelaskan dengan 3 poin utama; sertakan contoh; minimal 100 kata"
                                  />
                                </div>
                              </div>
                            ) : questionForm.type === 'matching' ? (
                              <div>
                                <div className="flex items-center justify-between gap-3">
                                  <Label>Pasangan (Kiri ↔ Kanan)</Label>
                                  <Button
                                    variant="outline"
                                    className="px-3"
                                    type="button"
                                    onClick={() =>
                                      setQuestionForm((f) => ({
                                        ...f,
                                        pairs: [...(f.pairs || []), { left: '', right: '' }],
                                      }))
                                    }
                                  >
                                    + Tambah Pair
                                  </Button>
                                </div>
                                <div className="mt-2 grid gap-2">
                                  {(questionForm.pairs || []).map((p, idx) => (
                                    <div key={idx} className="grid gap-2 sm:grid-cols-2">
                                      <Input
                                        value={p.left}
                                        onChange={(e) =>
                                          setQuestionForm((f) => ({
                                            ...f,
                                            pairs: (f.pairs || []).map((x, i) => (i === idx ? { ...x, left: e.target.value } : x)),
                                          }))
                                        }
                                        placeholder="Kiri"
                                      />
                                      <div className="flex gap-2">
                                        <Input
                                          value={p.right}
                                          onChange={(e) =>
                                            setQuestionForm((f) => ({
                                              ...f,
                                              pairs: (f.pairs || []).map((x, i) => (i === idx ? { ...x, right: e.target.value } : x)),
                                            }))
                                          }
                                          placeholder="Kanan"
                                        />
                                        <Button
                                          variant="danger"
                                          className="px-3"
                                          type="button"
                                          onClick={() =>
                                            setQuestionForm((f) => ({
                                              ...f,
                                              pairs: (f.pairs || []).filter((_, i) => i !== idx),
                                            }))
                                          }
                                        >
                                          Hapus
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">Minimal 2 pasangan.</div>
                              </div>
                            ) : (
                              <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {questionForm.choices.map((c, idx) => (
                                    <div key={c.id}>
                                      <Label>Pilihan {c.id.toUpperCase()}</Label>
                                      <div className="mt-1">
                                        <Input
                                          value={c.text}
                                          onChange={(e) =>
                                            setQuestionForm((f) => ({
                                              ...f,
                                              choices: f.choices.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)),
                                            }))
                                          }
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div>
                                  <Label>Jawaban Benar</Label>
                                  <div className="mt-1">
                                    <select
                                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                      value={questionForm.correctChoiceId}
                                      onChange={(e) => setQuestionForm((f) => ({ ...f, correctChoiceId: e.target.value }))}
                                    >
                                      {questionForm.choices.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.id.toUpperCase()}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </>
                            )}

                            <Button type="submit">{editingQuestionId ? 'Update Soal' : 'Tambah Soal'}</Button>
                          </form>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button type="button" onClick={randomizeQuestionOrder} disabled={questions.length < 2}>
                              Acak Soal
                            </Button>
                            <div className="text-xs text-slate-500">Klik untuk mengacak urutan soal yang sudah ada.</div>
                          </div>

                          <div className="mt-4 grid gap-2">
                            {questions.map((q, idx) => {
                              const orderedQuestions = [...questions].sort((a, b) => a.order - b.order);
                              const currentIdx = orderedQuestions.findIndex((qi) => qi._id === q._id);
                              return (
                                <Card key={q._id} className="p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-semibold text-slate-600">{(q.type || 'mcq').toUpperCase()}</div>
                                      <div className="mt-1 text-sm font-semibold text-slate-900" dangerouslySetInnerHTML={{ __html: q.promptHtml || '' }} />
                                      <div className="mt-1 text-xs text-slate-500">
                                        Order: {q.order}
                                        {q.type === 'mcq' ? ` • Correct: ${q.correctChoiceId}` : ''}
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex gap-1">
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          className="px-2 py-1 text-xs"
                                          onClick={() => moveQuestion(q, 'up')}
                                          disabled={currentIdx === 0}
                                        >
                                          ↑
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          className="px-2 py-1 text-xs"
                                          onClick={() => moveQuestion(q, 'down')}
                                          disabled={currentIdx === orderedQuestions.length - 1}
                                        >
                                          ↓
                                        </Button>
                                      </div>
                                      <Button variant="primary" className="px-3" onClick={() => editQuestion(q)}>
                                        Edit
                                      </Button>
                                      <Button variant="danger" className="px-3" onClick={() => deleteQuestion(q)}>
                                        Hapus
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                            {questions.length === 0 ? <div className="text-sm text-slate-600">Belum ada soal.</div> : null}
                          </div>
                        </>
                      ) : (
                        <div className="mt-3 text-sm text-slate-600">Pilih quiz dulu untuk kelola soal.</div>
                      )}
                    </div>
                    </div>
                  )}
                </div>
                </>
              )}
        </div>
      </SidebarShell>
    </>
  );
}
