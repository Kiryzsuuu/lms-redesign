import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Container, Button } from '../components/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../lib/auth';

export default function QuizPlay() {
  const { quizId } = useParams();
  const { api, isAuthed, role } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const isPreview = sp.get('preview') === '1' && (role === 'admin' || role === 'teacher');

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [pinnedById, setPinnedById] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pinMode, setPinMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [gradingByQuestionId, setGradingByQuestionId] = useState({});
  const [navInfo, setNavInfo] = useState({ courseId: null, lessonId: null, nextLessonId: null });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [autoSubmitMsg, setAutoSubmitMsg] = useState('');
  const [quizError, setQuizError] = useState('');
  const [remainingSec, setRemainingSec] = useState(0);
  const autoSubmittedRef = useRef(false);
  const [attemptId, setAttemptId] = useState(null);
  const [timerBase, setTimerBase] = useState({ endsAtMs: null });
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const saveTimerRef = useRef(null);

  function answersArrayFromMap(map) {
    return Object.entries(map || {}).map(([questionId, a]) => ({
      questionId,
      choiceId: a?.choiceId,
      textAnswer: a?.textAnswer,
      matchingAnswer: a?.matchingAnswer,
    }));
  }

  function mapFromAttemptAnswers(arr) {
    const out = {};
    for (const a of arr || []) {
      if (!a?.questionId) continue;
      out[String(a.questionId)] = {
        choiceId: a.choiceId,
        textAnswer: a.textAnswer,
        matchingAnswer: a.matchingAnswer,
      };
    }
    return out;
  }

  // Preview mode (admin/teacher): load quiz + questions WITH answers, no attempt,
  // and render in review state so correct answers are highlighted and nothing submits.
  useEffect(() => {
    if (!isAuthed || !isPreview) return;
    api.get(`/quizzes/${quizId}/preview`)
      .then((res) => {
        const qz = res.data.quiz || {};
        const ques = res.data.questions || [];
        setQuiz(qz);
        setQuestions(ques);
        setAnswers({});
        setCurrentIdx(0);
        setNavInfo({ courseId: qz?.courseId || null, lessonId: qz?.lessonId || null, nextLessonId: null });
        const grading = {};
        for (const q of ques) {
          grading[String(q._id)] = {
            isAutoGradable: q.type === 'mcq',
            correctChoiceId: q.correctChoiceId || null,
          };
        }
        setGradingByQuestionId(grading);
        setResult({ preview: true, score: 0, maxScore: ques.length });
      })
      .catch((e) => {
        setQuizError(e?.response?.data?.error?.message || 'Gagal memuat quiz');
      });
  }, [quizId, isAuthed, isPreview]);

  useEffect(() => {
    if (!isAuthed || isPreview) return;
    api
      .get(`/quizzes/play/${quizId}`)
      .then((res) => {
        setQuiz(res.data.quiz);
        setQuestions(res.data.questions || []);
        const at = res.data.attempt;
        setAttemptId(at?._id || null);

        const serverNowMs = res.data.serverNow ? new Date(res.data.serverNow).getTime() : Date.now();
        setClockOffsetMs(serverNowMs - Date.now());
        const startedAtMs = at?.startedAt ? new Date(at.startedAt).getTime() : serverNowMs;
        const timeLimitSec = Number(res.data.quiz?.timeLimitSec || 0);
        const endsAtMs = timeLimitSec > 0 ? startedAtMs + timeLimitSec * 1000 : null;
        setTimerBase({ endsAtMs });
        setRemainingSec(Number(res.data.remainingSec || 0));

        const savedAnswers = mapFromAttemptAnswers(at?.answers || []);
        setAnswers(savedAnswers);

        const meta = at?.meta || {};
        setCurrentIdx(Number.isFinite(meta.currentIdx) ? Math.max(0, meta.currentIdx) : 0);
        setPinnedById(meta.pinnedById || {});
        setConfirmOpen(false);
        setSidebarOpen(true);
        setPinMode(false);
        autoSubmittedRef.current = false;
        setNavInfo({
          courseId: res.data.quiz?.courseId || null,
          lessonId: res.data.quiz?.lessonId || null,
          nextLessonId: null,
        });
      })
      .catch((e) => {
        const status = e?.response?.status;
        const msg = e?.response?.data?.error?.message || 'Gagal memuat quiz';
        setQuiz(null);
        setQuestions([]);
        setQuizError(status === 404 ? 'Quiz tidak ditemukan atau telah dihapus.' : msg);
      });
  }, [quizId, isAuthed]);

  useEffect(() => {
    if (!quiz) return;
    if (!quiz.timeLimitSec || Number(quiz.timeLimitSec) <= 0) return;
    if (result) return;
    if (submitting) return;

    const t = setInterval(() => {
      setRemainingSec(() => {
        const endsAtMs = timerBase.endsAtMs;
        if (!endsAtMs) return 0;
        const nowMs = Date.now() + Number(clockOffsetMs || 0);
        const next = Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
        return next;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [quiz, result, submitting, timerBase.endsAtMs, clockOffsetMs]);

  useEffect(() => {
    setCurrentIdx((idx) => {
      const last = Math.max(0, (questions?.length || 0) - 1);
      return Math.min(Math.max(0, idx), last);
    });
  }, [questions?.length]);

  useEffect(() => {
    if (!quiz) return;
    if (!quiz.timeLimitSec || Number(quiz.timeLimitSec) <= 0) return;
    if (result) return;
    if (submitting) return;
    if (remainingSec !== 0) return;
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setAutoSubmitMsg('Waktu habis! Quiz otomatis dikumpulkan.');
    submit().catch(() => {});
  }, [quiz, remainingSec, result, submitting]);

  function isQuestionAnswered(q) {
    const a = answers[q._id];
    if (!a) return false;
    if ((q.type || 'mcq') === 'essay') return Boolean(a.textAnswer && String(a.textAnswer).trim());
    if ((q.type || 'mcq') === 'matching') {
      const rows = a.matchingAnswer || [];
      if (!Array.isArray(rows) || rows.length === 0) return false;
      return rows.every((r) => (r.left || '').trim() && (r.right || '').trim());
    }
    return Boolean(a.choiceId);
  }

  const unanswered = useMemo(() => {
    return (questions || [])
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => !isQuestionAnswered(q));
  }, [questions, answers]);

  async function submit() {
    setSubmitting(true);
    try {
      const payload = {
        attemptId,
        answers: questions.map((q) => {
          const a = answers[q._id] || {};
          return {
            questionId: q._id,
            choiceId: a.choiceId,
            textAnswer: a.textAnswer,
            matchingAnswer: a.matchingAnswer,
          };
        }),
      };
      const res = await api.post(`/quizzes/play/${quizId}/submit`, payload);
      setResult(res.data.attempt);
      setGradingByQuestionId(res.data.gradingByQuestionId || {});
      setNavInfo({
        courseId: res.data.courseId || quiz?.courseId || null,
        lessonId: res.data.lessonId || null,
        nextLessonId: res.data.nextLessonId || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Autosave answers + meta (current index / pinned). Debounced to minimize API calls.
  useEffect(() => {
    if (!isAuthed) return;
    if (!attemptId) return;
    if (result) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api
        .patch(`/quizzes/play/${quizId}/attempt/${attemptId}`,
          {
            answers: answersArrayFromMap(answers),
            meta: { currentIdx, pinnedById },
          }
        )
        .catch(() => {});
    }, 400);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [answers, currentIdx, pinnedById, attemptId, quizId, isAuthed, result]);

  function goToLesson(lessonId) {
    if (!lessonId || !navInfo.courseId) return;
    nav(`/courses/${navInfo.courseId}?lesson=${lessonId}`);
  }

  const currentQuestion = questions[currentIdx] || null;
  const lastIdx = Math.max(0, questions.length - 1);
  const isLastQuestion = currentIdx === lastIdx;
  const hasQuestions = questions.length > 0;

  function fmtTime(sec) {
    const s = Math.max(0, Number(sec || 0));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  if (!isAuthed) {
    return (
      <section className="py-10">
        <Container>
          <Card className="p-8">
            <div className="text-sm text-slate-600">Silakan login untuk mulai quiz.</div>
            <div className="mt-4">
              <Button onClick={() => nav('/login')}>Login</Button>
            </div>
          </Card>
        </Container>
      </section>
    );
  }

  if (!quiz) {
    return (
      <section className="py-10">
        <Container>
          <Card className="p-8">
            <div className="text-sm text-slate-600">{quizError || 'Quiz tidak ditemukan / belum dipublish.'}</div>
            <div className="mt-4">
              <Link to="/courses">
                <Button variant="outline">Kembali ke Daftar Course</Button>
              </Link>
            </div>
          </Card>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-10">
      <Container>
        <ConfirmDialog
          open={confirmOpen}
          title="Submit quiz sekarang?"
          message={
            unanswered.length > 0 ? (
              <div className="mt-2 text-sm text-slate-600">
                <div className="font-semibold text-rose-700">Ada {unanswered.length} soal yang belum dijawab.</div>
                <div className="mt-2">
                  Soal belum dijawab:{' '}
                  <span className="font-semibold">
                    {unanswered.map(({ idx }) => idx + 1).join(', ')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-600">Semua soal sudah dijawab. Lanjut submit?</div>
            )
          }
          confirmText={submitting ? 'Mengirim...' : 'Submit'}
          cancelText="Batal"
          confirmVariant="primary"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={async () => {
            setConfirmOpen(false);
            await submit();
          }}
        />

        {autoSubmitMsg && (
          <div className="mb-4 rounded-[10px] px-4 py-3 text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-800">
            {autoSubmitMsg}
          </div>
        )}

        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{quiz.title}</h1>
            {quiz.description ? <p className="mt-1 text-sm text-slate-600">{quiz.description}</p> : null}
          </div>
          {isPreview ? (
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">👁️ Mode Preview</span>
            </div>
          ) : result ? (
            <div className="text-right">
              <div className="text-sm text-slate-600">Skor</div>
              <div className="text-2xl font-extrabold">{result.score} / {result.maxScore}</div>
            </div>
          ) : quiz?.timeLimitSec ? (
            <div className="text-right">
              <div className="text-sm text-slate-600">Sisa waktu</div>
              <div className={'text-2xl font-extrabold ' + (remainingSec <= 30 ? 'text-rose-700' : 'text-slate-900')}>
                {fmtTime(remainingSec)}
              </div>
              <div className="mt-1 text-xs text-slate-500">Otomatis submit jika waktu habis</div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {!hasQuestions ? (
              <Card className="p-8">
                <div className="text-sm text-slate-600">Belum ada soal.</div>
              </Card>
            ) : currentQuestion ? (
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-500">Soal {currentIdx + 1} / {questions.length}</div>
                  {!result ? (
                    <div
                      className={
                        'inline-flex items-center border px-2 py-1 text-xs font-semibold ' +
                        (isQuestionAnswered(currentQuestion)
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700')
                      }
                    >
                      {isQuestionAnswered(currentQuestion) ? 'TERJAWAB' : 'BELUM'}
                    </div>
                  ) : null}
                </div>

                {result && !isPreview && gradingByQuestionId?.[currentQuestion._id]?.isAutoGradable ? (
                  <div
                    className={
                      'mt-2 inline-flex w-fit items-center border px-2 py-1 text-xs font-semibold ' +
                      (gradingByQuestionId[currentQuestion._id].isCorrect
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-rose-200 bg-rose-50 text-rose-800')
                    }
                  >
                    {gradingByQuestionId[currentQuestion._id].isCorrect ? 'BENAR' : 'SALAH'}
                  </div>
                ) : null}

                {currentQuestion.promptHtml ? (
                  <div
                    className="mt-2 text-lg font-bold text-slate-900"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.promptHtml }}
                  />
                ) : (
                  <div className="mt-2 text-lg font-bold text-slate-900">{currentQuestion.prompt}</div>
                )}

                {currentQuestion.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question"
                      className="max-w-full h-auto rounded border border-slate-200"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                )}

                {(currentQuestion.type || 'mcq') === 'essay' ? (
                  <div className="mt-4">
                    <textarea
                      className="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      rows={6}
                      value={answers[currentQuestion._id]?.textAnswer || ''}
                      disabled={Boolean(result)}
                      onChange={(e) =>
                        setAnswers((a) => ({
                          ...a,
                          [currentQuestion._id]: { ...(a[currentQuestion._id] || {}), textAnswer: e.target.value },
                        }))
                      }
                      placeholder="Tulis jawabanmu..."
                    />
                    <div className="mt-1 text-xs text-slate-500">Essay tidak otomatis dinilai.</div>
                  </div>
                ) : (currentQuestion.type || 'mcq') === 'matching' ? (
                  <div className="mt-4 grid gap-2">
                    {(() => {
                      const pairs = currentQuestion.pairs || [];
                      const rights = pairs.map((p) => p.right);
                      const current = answers[currentQuestion._id]?.matchingAnswer;
                      const init = Array.isArray(current)
                        ? current
                        : pairs.map((p) => ({ left: p.left, right: '' }));

                      return pairs.map((p, rowIdx) => (
                        <div key={rowIdx} className="grid gap-2 sm:grid-cols-2">
                          <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
                            {p.left}
                          </div>
                          <select
                            className="w-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            disabled={Boolean(result)}
                            value={init[rowIdx]?.right || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAnswers((a) => {
                                const base = Array.isArray(a[currentQuestion._id]?.matchingAnswer)
                                  ? [...a[currentQuestion._id].matchingAnswer]
                                  : pairs.map((x) => ({ left: x.left, right: '' }));
                                base[rowIdx] = { left: p.left, right: val };
                                return { ...a, [currentQuestion._id]: { ...(a[currentQuestion._id] || {}), matchingAnswer: base } };
                              });
                            }}
                          >
                            <option value="">Pilih pasangan...</option>
                            {rights.map((r, i) => (
                              <option key={i} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      ));
                    })()}
                    <div className="text-xs text-slate-500">Matching tidak otomatis dinilai.</div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2">
                    {currentQuestion.choices.map((c) => {
                      const selected = answers[currentQuestion._id]?.choiceId === c.id;
                      const g = gradingByQuestionId?.[currentQuestion._id];
                      const isCorrectChoice = Boolean(result && g?.isAutoGradable && g.correctChoiceId === c.id);
                      const isSelectedWrong = Boolean(result && g?.isAutoGradable && selected && g.correctChoiceId !== c.id);
                      return (
                        <button
                          key={c.id}
                          disabled={Boolean(result)}
                          onClick={() =>
                            setAnswers((a) => ({
                              ...a,
                              [currentQuestion._id]: { ...(a[currentQuestion._id] || {}), choiceId: c.id },
                            }))
                          }
                          className={
                            'border px-4 py-3 text-left text-sm transition ' +
                            (isCorrectChoice
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                              : isSelectedWrong
                                ? 'border-rose-300 bg-rose-50 text-rose-900'
                                : selected
                                  ? 'border-[#0C628D] bg-[#0C628D] text-white'
                                  : 'border-slate-200 bg-white hover:bg-slate-50')
                          }
                        >
                          <div>{c.text}</div>
                          {c.imageUrl ? (
                            <img src={c.imageUrl} alt={`Opsi ${c.id}`} className="mt-3 max-h-40 rounded-xl border border-slate-200 object-contain" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!result ? (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      disabled={currentIdx === 0}
                      onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                    >
                      Previous
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      {quiz?.allowClearAnswers && isQuestionAnswered(currentQuestion) ? (
                        <Button
                          variant="outline"
                          className="!text-rose-600 !border-rose-300 hover:!bg-rose-50"
                          onClick={() => setAnswers((a) => { const next = { ...a }; delete next[currentQuestion._id]; return next; })}
                        >
                          Hapus Jawaban
                        </Button>
                      ) : null}
                      {!isLastQuestion ? (
                        <Button onClick={() => setCurrentIdx((i) => Math.min(lastIdx, i + 1))}>Next</Button>
                      ) : (
                        <Button disabled={submitting} onClick={() => setConfirmOpen(true)}>
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </Card>
            ) : null}
          </div>

          <div>
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold">Navigasi Soal</div>
                <Button type="button" variant="outline" className="px-3" onClick={() => setSidebarOpen((v) => !v)}>
                  {sidebarOpen ? 'Hide' : 'Show'}
                </Button>
              </div>
              {!result ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {currentQuestion ? (
                    <Button
                      type="button"
                      variant={pinnedById[currentQuestion._id] ? 'primary' : 'outline'}
                      className={'px-3 ' + (pinnedById[currentQuestion._id] ? '!bg-rose-600 !border-rose-600 hover:!bg-rose-700' : '!text-rose-600 !border-rose-300 hover:!bg-rose-50')}
                      onClick={() => setPinnedById((m) => {
                        const next = { ...(m || {}) };
                        if (next[currentQuestion._id]) delete next[currentQuestion._id];
                        else next[currentQuestion._id] = true;
                        return next;
                      })}
                    >
                      ⚑ {pinnedById[currentQuestion._id] ? 'Hapus Flag' : 'Flag soal ini'}
                    </Button>
                  ) : null}
                  {unanswered.length > 0 ? (
                    <div className="text-xs font-semibold text-rose-800">Belum dijawab: {unanswered.length}</div>
                  ) : (
                    <div className="text-xs font-semibold text-emerald-800">Semua terjawab</div>
                  )}
                </div>
              ) : null}

              {sidebarOpen ? (
                <div className="mt-4 grid grid-cols-8 gap-2 sm:grid-cols-10 lg:grid-cols-6 xl:grid-cols-8">
                  {questions.map((q, idx) => {
                    const answered = isQuestionAnswered(q);
                    const flagged = Boolean(pinnedById[q._id]);
                    const active = idx === currentIdx;
                    return (
                      <button
                        key={q._id}
                        type="button"
                        onClick={() => setCurrentIdx(idx)}
                        className={
                          'relative aspect-square border text-xs font-extrabold transition ' +
                          (flagged
                            ? 'border-rose-500 bg-rose-500 text-white hover:bg-rose-600'
                            : active
                              ? 'border-[#0C628D] bg-[#0C628D] text-white'
                              : answered
                                ? 'border-blue-200 bg-blue-50 text-[#0C628D] hover:bg-blue-100'
                                : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50')
                        }
                        title={flagged ? `Soal ${idx + 1} (FLAG)` : `Soal ${idx + 1}`}
                      >
                        {idx + 1}
                        {flagged ? (
                          <span className="absolute right-1 top-1 text-[10px] font-extrabold">⚑</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {!result ? (
                <div className="mt-4 text-xs text-slate-600">
                  Submit hanya muncul di soal terakhir.
                </div>
              ) : null}
            </Card>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {isPreview ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                if (navInfo.courseId && navInfo.lessonId) nav(`/courses/${navInfo.courseId}/lessons/${navInfo.lessonId}?preview=1`);
                else if (navInfo.courseId) nav(`/courses/${navInfo.courseId}?preview=1`);
                else nav('/dashboard/courses');
              }}
            >
              ← Kembali ke Materi
            </Button>
          ) : (
            <>
              <Link to="/courses">
                <Button variant="outline" className="w-full sm:w-auto">Kembali</Button>
              </Link>
              {result ? (
                <>
                  {navInfo.courseId && navInfo.lessonId ? (
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => goToLesson(navInfo.lessonId)}>
                      Kembali ke Materi
                    </Button>
                  ) : null}
                  {navInfo.courseId && navInfo.nextLessonId ? (
                    <Button className="w-full sm:w-auto" onClick={() => goToLesson(navInfo.nextLessonId)}>
                      Lanjut Materi Berikutnya
                    </Button>
                  ) : null}
                  <Button className="w-full sm:w-auto" onClick={() => window.location.reload()}>
                    Coba Lagi
                  </Button>
                </>
              ) : null}
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
