import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Container, Button, Input } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function AssignmentSubmit() {
  const { api } = useAuth();
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Submission form state
  const [startedAttempt, setStartedAttempt] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadAssignment();
  }, [assignmentId]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assignments/${assignmentId}`);
      setAssignment(res.data);

      //Initialize answers for question-based assignment
      if (res.data.type === 'question_based' && res.data.questions) {
        const initialAnswers = {};
        res.data.questions.forEach((q) => {
          initialAnswers[q._id] = '';
        });
        setAnswers(initialAnswers);
      }

      // Check if already submitted
      if (res.data.currentAttempt?.submittedAt) {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat assignment');
    } finally {
      setLoading(false);
    }
  };

  const startAttempt = async () => {
    try {
      setLoading(true);
      await api.post(`/assignments/${assignmentId}/start`, {});
      setStartedAttempt(true);
      setSuccess('Mulai mengerjakan assignment');
      loadAssignment();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memulai assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file types
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Hanya file PDF atau DOKUMEN yang diperbolehkan');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10MB');
      return;
    }

    setUploadedFile(file);
    setFilePreview(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  };

  const submitAssignment = async () => {
    if (!assignment?.currentAttempt) {
      setError('Error: Attempt tidak ditemukan');
      return;
    }

    if (assignment.type === 'file_upload' && !uploadedFile) {
      setError('Pilih file terlebih dahulu');
      return;
    }

    if (assignment.type === 'question_based') {
      const allAnswered = assignment.questions?.every((q) => answers[q._id]?.trim());
      if (!allAnswered) {
        setError('Semua pertanyaan harus dijawab');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        attemptId: assignment.currentAttempt._id,
      };

      if (assignment.type === 'file_upload' && uploadedFile) {
        // In a real app, upload to S3/storage service first
        payload.fileName = uploadedFile.name;
        payload.fileSize = uploadedFile.size;
        payload.fileType = uploadedFile.type;
      } else if (assignment.type === 'question_based') {
        payload.answers = assignment.questions
          ?.map((q) => ({
            questionId: q._id,
            answer: answers[q._id],
          }))
          .filter((a) => a.answer?.trim());
      }

      await api.post(`/api/assignments/${assignmentId}/submit`, payload);

      setSuccess('Assignment berhasil disubmit');
      setSubmitted(true);
      setTimeout(() => navigate(-1), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="py-10">
        <Container>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Memuat assignment...</p>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  if (!assignment) {
    return (
      <section className="py-10">
        <Container>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-4xl mb-2">❌</div>
              <p className="text-red-600 font-medium">Assignment tidak ditemukan</p>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-10">
      <Container className="max-w-2xl">
        {error && (
          <Card className="mb-6 p-4 border-l-4 border-l-red-500 bg-red-50">
            <div className="flex justify-between items-center">
              <span className="text-red-700 font-medium">{error}</span>
              <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 font-medium">Tutup</button>
            </div>
          </Card>
        )}

        {success && (
          <Card className="mb-6 p-4 border-l-4 border-l-green-500 bg-green-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✓</span>
                <span className="text-green-700 font-medium">{success}</span>
              </div>
              <button onClick={() => setSuccess(null)} className="text-sm text-green-600 hover:text-green-800 font-medium">Tutup</button>
            </div>
          </Card>
        )}

        {/* Assignment Header */}
        <Card className="mb-6 p-6">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{assignment.title}</h1>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-600">Tipe</p>
              <p className="font-medium text-slate-900">
                {assignment.type === 'file_upload' ? 'Upload File' : 'Jawab Pertanyaan'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Poin</p>
              <p className="font-medium text-slate-900">{assignment.points || 100} poin</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Percobaan</p>
              <p className="font-medium text-slate-900">
                {assignment.attemptCount} / {assignment.maxAttempts}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Status</p>
              <p className={`font-medium ${assignment.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                {assignment.isOpen ? 'Dibuka' : 'Ditutup'}
              </p>
            </div>
          </div>

          {assignment.description && (
            <div className="bg-slate-50 p-4 rounded text-sm text-slate-700 border border-slate-200">
              {assignment.description}
            </div>
          )}
        </Card>

        {/* Student Submission Status */}
        {submitted && assignment.currentAttempt?.submittedAt && (
          <Card className="mb-6 p-6 border border-green-200 bg-green-50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">✓</span>
              <h2 className="text-lg font-semibold text-green-900">Assignment Disubmit</h2>
            </div>
            <div className="space-y-2 text-sm text-green-800">
              <p>
                <strong>Tanggal Submission:</strong>{' '}
                {new Date(assignment.currentAttempt.submittedAt).toLocaleString('id-ID')}
              </p>
              {assignment.currentAttempt.grade && (
                <>
                  <p>
                    <strong>Nilai:</strong> {assignment.currentAttempt.score} / {assignment.points || 100}
                  </p>
                  <p>
                    <strong>Grade:</strong> {assignment.currentAttempt.grade}
                  </p>
                  {assignment.currentAttempt.feedback && (
                    <p>
                      <strong>Feedback:</strong> {assignment.currentAttempt.feedback}
                    </p>
                  )}
                </>
              )}
            </div>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="mt-4"
            >
              Kembali
            </Button>
          </Card>
        )}

        {/* Submission Form */}
        {!submitted && (
          <>
            {!assignment.canAttempt ? (
              <Card className="p-6 text-center border border-red-200 bg-red-50">
                <div className="text-4xl mb-3">❌</div>
                <p className="text-red-900 font-semibold mb-2">Batas Percobaan Tercapai</p>
                <p className="text-red-800 text-sm">
                  Anda telah mencapai batas maksimal percobaan ({assignment.maxAttempts}). 
                  Hubungi guru untuk reopen.
                </p>
              </Card>
            ) : !assignment.isOpen ? (
              <Card className="p-6 text-center border border-yellow-200 bg-yellow-50">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-yellow-900 font-semibold mb-2">Assignment Belum Dibuka / Sudah Ditutup</p>
                <p className="text-yellow-800 text-sm">
                  {assignment.openedAt && `Selesai pada: ${new Date(assignment.closedAt).toLocaleString('id-ID')}`}
                </p>
              </Card>
            ) : startedAttempt && assignment.currentAttempt ? (
              <Card className="p-6 space-y-6">
                {/* File Upload Assignment */}
                {assignment.type === 'file_upload' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Upload File</h2>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        id="file-input"
                      />
                      <label htmlFor="file-input" className="cursor-pointer">
                        <div className="text-4xl mb-3">📄</div>
                        <p className="text-sm text-slate-600 mb-1">
                          Klik untuk memilih atau drag-drop file
                        </p>
                        <p className="text-xs text-slate-500">PDF, DOC, DOCX (Max 10MB)</p>
                      </label>
                    </div>

                    {filePreview && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center gap-3 border border-slate-200">
                      <div className="text-2xl">📄</div>
                      <span className="text-sm text-slate-700">{filePreview}</span>
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setFilePreview(null);
                        }}
                        className="ml-auto text-red-600 hover:text-red-700 font-semibold"
                      >
                        ✕
                      </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Question-Based Assignment */}
                {assignment.type === 'question_based' && assignment.questions && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Jawab Pertanyaan</h2>
                    <div className="space-y-6">
                      {assignment.questions.map((question, idx) => (
                      <div key={question._id} className="border border-slate-200 rounded-lg p-4">
                          <p className="font-semibold text-slate-900 mb-3">
                            {idx + 1}. {question.prompt}
                          </p>

                          {question.type === 'mcq' && question.choices && (
                            <div className="space-y-2">
                              {question.choices.map((choice) => (
                                <label key={choice.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question-${question._id}`}
                                    value={choice.id}
                                    checked={answers[question._id] === choice.id}
                                    onChange={(e) =>
                                      setAnswers({ ...answers, [question._id]: e.target.value })
                                    }
                                    className="rounded"
                                  />
                                  <span className="text-sm text-slate-700">{choice.text}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {question.type === 'essay' && (
                            <textarea
                              value={answers[question._id] || ''}
                              onChange={(e) =>
                                setAnswers({ ...answers, [question._id]: e.target.value })
                              }
                              placeholder="Jawaban Anda"
                              className="w-full border border-slate-300 rounded-lg p-3"
                              rows="4"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  onClick={submitAssignment}
                  disabled={submitting}
                >
                  {submitting ? 'Menyubmit...' : 'Submit Assignment'}
                </Button>
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                >
                  Batal
                </Button>
              </div>
            </Card>
            ) : (
              <Card className="p-6 text-center">
                <div className="text-4xl mb-4">👋</div>
                <p className="text-slate-700 mb-4">Silakan mulai mengerjakan assignment</p>
                <Button
                  onClick={startAttempt}
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : 'Mulai Assignment'}
                </Button>
              </Card>
            )}
          </>
        )}
      </Container>
    </section>
  );
}
