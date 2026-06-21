import React, { useState, useEffect, useRef } from 'react';
import { Card, Container, Button, Input, Textarea, Label } from '../../components/ui';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../lib/auth';

export default function QuestionBankManager() {
  const { api } = useAuth();
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionCategory, setNewCollectionCategory] = useState('');
  const [questionForm, setQuestionForm] = useState({
    type: 'mcq',
    question: '',
    questionImageUrl: '',
    options: [
      { id: '1', text: '', imageUrl: '' },
      { id: '2', text: '', imageUrl: '' },
    ],
    correctAnswer: '1',
    explanation: '',
  });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const confirmActionRef = useRef(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Konfirmasi',
    message: '',
    confirmText: 'Hapus',
    confirmVariant: 'danger',
  });

  const askConfirm = ({ title, message, confirmText, confirmVariant, onConfirm }) => {
    confirmActionRef.current = onConfirm;
    setConfirmState({
      open: true,
      title: title || 'Konfirmasi',
      message: message || '',
      confirmText: confirmText || 'OK',
      confirmVariant: confirmVariant || 'primary',
    });
  };

  const handleConfirm = () => {
    confirmActionRef.current?.();
    setConfirmState((s) => ({ ...s, open: false }));
  };

  const handleCancelConfirm = () => {
    setConfirmState((s) => ({ ...s, open: false }));
  };

  const exportQuestion = (question) => {
    let content = '';

    if (question.type === 'mcq') {
      content = `${stripHtml(question.promptHtml || question.prompt || '')}\n`;
      question.choices?.forEach((choice) => {
        content += `${choice.id}. ${choice.text}\n`;
      });
      content += `ANSWER: ${question.correctChoiceId}\n`;
    } else if (question.type === 'essay') {
      content = `${stripHtml(question.promptHtml || question.prompt || '')}\n`;
      if (question.rubric) {
        content += `JAWABAN: ${question.rubric}\n`;
      }
    } else if (question.type === 'matching') {
      content = `${stripHtml(question.promptHtml || question.prompt || '')}\n`;
      question.pairs?.forEach((pair) => {
        content += `${pair.left} -> ${pair.right}\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soal_${selectedCollection?.title.replace(/\s+/g, '_')}_${question._id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllQuestions = () => {
    if (questions.length === 0) {
      setError('Tidak ada soal untuk disimpan');
      return;
    }

    let content = '';

    questions.forEach((question, idx) => {
      if (idx > 0) content += '\n\n';

      if (question.type === 'mcq') {
        content += `Soal ${idx + 1}\n`;
        content += `${stripHtml(question.promptHtml || question.prompt || '')}\n`;
        question.choices?.forEach((choice) => {
          content += `${choice.id}. ${choice.text}\n`;
        });
        content += `ANSWER: ${question.correctChoiceId}\n`;
      } else if (question.type === 'essay') {
        content += `Soal ${idx + 1} (Essay)\n`;
        content += `${stripHtml(question.promptHtml || question.prompt || '')}\n`;
        if (question.rubric) {
          content += `JAWABAN: ${question.rubric}\n`;
        }
      } else if (question.type === 'matching') {
        content += `Soal ${idx + 1} (Matching)\n`;
        content += `${stripHtml(question.promptHtml || question.prompt || '')}\n`;
        question.pairs?.forEach((pair) => {
          content += `${pair.left} -> ${pair.right}\n`;
        });
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCollection?.title.replace(/\s+/g, '_')}_${questions.length}_soal.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess(`${questions.length} soal berhasil disimpan`);
  };

  const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, '').trim();

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data?.url || '';
  };

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) loadQuestions(selectedCollection._id);
  }, [selectedCollection?._id]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const res = await api.get('/question-bank/collections');
      setCollections(res.data.collections || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat koleksi');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (collectionId) => {
    try {
      setLoading(true);
      const res = await api.get(`/question-bank/collections/${collectionId}/questions`);
      setQuestions(res.data.questions || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat soal');
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) {
      setError('Nama koleksi harus diisi');
      return;
    }

    try {
      setLoading(true);
      await api.post('/question-bank/collections', {
        title: newCollectionName,
        category: newCollectionCategory.trim(),
      });
      setSuccess('Koleksi dibuat');
      setNewCollectionName('');
      setNewCollectionCategory('');
      setShowNewCollectionModal(false);
      loadCollections();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat koleksi');
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async (id) => {
    askConfirm({
      title: 'Hapus Koleksi?',
      message: 'Semua soal dalam koleksi ini akan dihapus permanen.',
      confirmText: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.delete(`/question-bank/collections/${id}`);
          setSuccess('Koleksi dihapus');
          setSelectedCollection(null);
          loadCollections();
        } catch (err) {
          setError(err.response?.data?.message || 'Gagal menghapus koleksi');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const addQuestion = async () => {
    if (!selectedCollection) {
      setError('Pilih koleksi terlebih dahulu');
      return;
    }

    if (!questionForm.question.trim()) {
      setError('Pertanyaan harus diisi');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        type: questionForm.type,
        promptHtml: questionForm.question,
        questionImageUrl: questionForm.questionImageUrl,
        rubric: questionForm.explanation,
      };

      if (questionForm.type === 'mcq') {
        payload.choices = questionForm.options.filter((o) => o.text.trim());
        payload.correctChoiceId = questionForm.correctAnswer;
      }

      if (editingQuestion) {
        await api.put(`/question-bank/collections/${selectedCollection._id}/questions/${editingQuestion._id}`, payload);
      } else {
        await api.post(`/question-bank/collections/${selectedCollection._id}/questions`, payload);
      }
      setSuccess(editingQuestion ? 'Soal diperbarui' : 'Soal ditambahkan');
      resetQuestionForm();
      setEditingQuestion(null);
      loadQuestions(selectedCollection._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menambah soal');
    } finally {
      setLoading(false);
    }
  };

  const startEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      type: question.type || 'mcq',
      question: question.promptHtml || question.prompt || '',
      questionImageUrl: question.questionImageUrl || '',
      options: (question.choices || [
        { id: '1', text: '', imageUrl: '' },
        { id: '2', text: '', imageUrl: '' },
      ]).map((c) => ({ id: c.id, text: c.text, imageUrl: c.imageUrl || '' })),
      correctAnswer: question.correctChoiceId || '1',
      explanation: question.rubric || '',
    });
  };

  const deleteQuestion = async (questionId) => {
    askConfirm({
      title: 'Hapus Soal?',
      message: 'Soal ini akan dihapus permanen dari koleksi.',
      confirmText: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.delete(`/question-bank/collections/${selectedCollection._id}/questions/${questionId}`);
          setSuccess('Soal dihapus');
          loadQuestions(selectedCollection._id);
        } catch (err) {
          setError(err.response?.data?.message || 'Gagal menghapus soal');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const importQuestions = async () => {
    if (!importFile) {
      setError('Pilih file terlebih dahulu');
      return;
    }

    if (!selectedCollection) {
      setError('Pilih koleksi terlebih dahulu');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const content = e.target.result;

        const res = await api.post(`/question-bank/collections/${selectedCollection._id}/import-txt`, {
          content: String(content || ''),
          shuffleChoices: true,
        });

        setSuccess(`${res.data?.imported || 0} soal berhasil diimpor`);
        setImportFile(null);
        setShowImportModal(false);
        resetQuestionForm();
        setEditingQuestion(null);
        loadQuestions(selectedCollection._id);
      } catch (err) {
        setError(err.response?.data?.message || 'Gagal impor soal');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(importFile);
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      type: 'mcq',
      question: '',
      questionImageUrl: '',
      options: [
        { id: '1', text: '', imageUrl: '' },
        { id: '2', text: '', imageUrl: '' },
      ],
      correctAnswer: '1',
      explanation: '',
    });
  };

  const updateOption = (idx, key, value) => {
    const newOptions = [...questionForm.options];
    newOptions[idx][key] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const addOption = () => {
    const newId = Math.max(...questionForm.options.map((o) => parseInt(o.id) || 0)) + 1;
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { id: String(newId), text: '', imageUrl: '' }],
    });
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}><section className="py-10">
      <Container>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Bank Soal</h1>
            <p className="mt-1 text-sm text-slate-600">Kelola koleksi soal dan impor pertanyaan</p>
          </div>
          <Button onClick={() => setShowNewCollectionModal(true)}>
            Koleksi Baru
          </Button>
        </div>

        {error && (
          <Card className="mb-6 p-4 border-l-4 border-l-red-500 bg-red-50">
            <div className="flex justify-between items-center">
              <span className="text-red-700 font-medium">{error}</span>
              <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 font-medium">
                Tutup
              </button>
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
              <button onClick={() => setSuccess(null)} className="text-sm text-green-600 hover:text-green-800 font-medium">
                Tutup
              </button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Collections List */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <h2 className="font-semibold mb-4 text-slate-900">Collections</h2>
              <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-0.5">
                {(() => {
                  const grouped = {};
                  for (const col of collections) {
                    const cat = col.category?.trim() || 'Uncategorized';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(col);
                  }
                  return Object.entries(grouped).map(([cat, cols]) => (
                    <div key={cat}>
                      <div className="text-[0.68rem] font-bold uppercase tracking-widest text-slate-400 mb-1.5 px-1">{cat}</div>
                      <div className="space-y-1">
                        {cols.map((col) => (
                          <button
                            key={col._id}
                            onClick={() => {
                              setSelectedCollection(selectedCollection?._id === col._id ? null : col);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-[8px] transition border text-sm ${
                              selectedCollection?._id === col._id
                                ? 'border-orange-400 bg-orange-50 text-slate-900 font-semibold'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="font-medium truncate">{col.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{col.numQuestions || 0} questions</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
                {collections.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No collections yet.</p>
                )}
              </div>

              {selectedCollection && (
                <Button
                  onClick={() => deleteCollection(selectedCollection._id)}
                  variant="destructive"
                  className="mt-4 w-full text-sm"
                >
                  Delete Collection
                </Button>
              )}
            </Card>
          </div>

          {/* Questions and Form */}
          <div className="lg:col-span-3">
            {selectedCollection ? (
              <div className="space-y-6">
                {/* Import Button */}
                <Card className="p-4 border border-blue-200 bg-blue-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-900">Impor Soal dari File TXT</p>
                      <p className="text-xs text-slate-600 mt-1">Format Ayken: Soal X / A. Opsi / Jawaban: A</p>
                    </div>
                    <Button onClick={() => setShowImportModal(true)}>
                      Impor TXT
                    </Button>
                  </div>
                </Card>

                {/* Divider */}
                <div className="border-t border-slate-200 pt-6">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Atau tambah soal manual</p>
                </div>

                {/* Add Question Form */}
                <Card className="p-6 border-2 border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-900">
                      {editingQuestion ? 'Edit Soal' : 'Tambah Soal Manual'}
                    </h3>
                    {editingQuestion && (
                      <button
                        onClick={() => {
                          resetQuestionForm();
                          setEditingQuestion(null);
                        }}
                        className="text-sm text-slate-500 hover:text-slate-700 underline"
                      >
                        Tutup
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1">Pertanyaan</Label>
                      <Textarea
                        value={questionForm.question}
                        onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                        placeholder="Masukkan pertanyaan"
                        className="w-full"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-1">Gambar soal</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setLoading(true);
                              const url = await uploadImage(file);
                              setQuestionForm((prev) => ({ ...prev, questionImageUrl: url }));
                            } catch (err) {
                              setError(err.response?.data?.error?.message || 'Gagal upload gambar soal');
                            } finally {
                              setLoading(false);
                            }
                          }}
                        />
                      </div>
                      {questionForm.questionImageUrl ? (
                        <img src={questionForm.questionImageUrl} alt="Preview soal" className="max-h-48 rounded-2xl border border-slate-200 object-contain" />
                      ) : null}
                    </div>

                    {questionForm.type === 'mcq' && (
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-2">Opsi</Label>
                        {questionForm.options.map((option, idx) => (
                          <div key={option.id} className="mb-3 rounded-2xl border border-slate-200 p-3">
                            <div className="flex gap-2">
                              <input
                                type="radio"
                                name="correctAnswer"
                                value={option.id}
                                checked={questionForm.correctAnswer === option.id}
                                onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                                className="mt-2"
                              />
                              <Input
                                type="text"
                                value={option.text}
                                onChange={(e) => updateOption(idx, 'text', e.target.value)}
                                placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                              />
                            </div>
                            <div className="mt-3 space-y-2">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    setLoading(true);
                                    const url = await uploadImage(file);
                                    updateOption(idx, 'imageUrl', url);
                                  } catch (err) {
                                    setError(err.response?.data?.error?.message || 'Gagal upload gambar opsi');
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              />
                              {option.imageUrl ? (
                                <img src={option.imageUrl} alt={`Preview opsi ${idx + 1}`} className="max-h-32 rounded-xl border border-slate-200 object-contain" />
                              ) : null}
                            </div>
                          </div>
                        ))}
                        <Button
                          onClick={addOption}
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                        >
                          + Tambah Opsi
                        </Button>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1">Penjelasan (Opsional)</Label>
                      <Textarea
                        value={questionForm.explanation}
                        onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                        placeholder="Penjelasan jawaban"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={addQuestion}
                        disabled={loading}
                      >
                        {loading ? 'Menyimpan...' : editingQuestion ? 'Perbarui Soal' : 'Simpan Soal'}
                      </Button>
                      <Button
                        onClick={() => {
                          resetQuestionForm();
                          setEditingQuestion(null);
                        }}
                        variant="outline"
                      >
                        {editingQuestion ? 'Batal Edit' : 'Reset'}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Questions List */}
                <Card className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-900">Soal dalam Koleksi ({questions.length})</h3>
                    {questions.length > 0 && (
                      <Button
                        onClick={exportAllQuestions}
                        className="text-sm"
                      >
                        Simpan Koleksi
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {questions.map((question, idx) => (
                      <div key={question._id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-slate-900">
                              {idx + 1}. {stripHtml(question.promptHtml || question.prompt || '')}
                            </div>
                            {question.questionImageUrl ? (
                              <img src={question.questionImageUrl} alt={`Soal ${idx + 1}`} className="mt-3 max-h-40 rounded-2xl border border-slate-200 object-contain" />
                            ) : null}
                            {question.type === 'mcq' && question.choices && (
                              <div className="mt-2 space-y-2 text-sm text-slate-600">
                                {question.choices.map((choice, idx) => (
                                  <div
                                    key={choice.id}
                                    className={`rounded-xl border border-slate-200 p-3 ${choice.id === question.correctChoiceId ? 'border-green-300 bg-green-50 text-green-700 font-medium' : ''}`}
                                  >
                                    <div>
                                      {String.fromCharCode(65 + idx)}. {choice.text}
                                      {choice.id === question.correctChoiceId && ' ✓'}
                                    </div>
                                    {choice.imageUrl ? (
                                      <img src={choice.imageUrl} alt={`Opsi ${idx + 1}`} className="mt-2 max-h-28 rounded-xl border border-slate-200 object-contain" />
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-2">
                            <button
                              onClick={() => startEditQuestion(question)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                              title="Edit soal"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => exportQuestion(question)}
                              className="text-green-600 hover:text-green-700 font-medium"
                              title="Simpan soal ke file"
                            >
                              💾
                            </button>
                            <button
                              onClick={() => deleteQuestion(question._id)}
                              className="text-red-600 hover:text-red-700 font-medium"
                              title="Hapus soal"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-slate-500">Pilih koleksi atau buat koleksi baru</p>
              </Card>
            )}
          </div>
        </div>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmVariant={confirmState.confirmVariant}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">New Collection</h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Collection Name *</label>
                <Input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g. Module 1 — Data Basics"
                  onKeyPress={(e) => e.key === 'Enter' && createCollection()}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 block">Category (optional)</label>
                <Input
                  type="text"
                  value={newCollectionCategory}
                  onChange={(e) => setNewCollectionCategory(e.target.value)}
                  placeholder="e.g. Materi 1, Chapter 2, Python Basics"
                />
                <p className="text-xs text-slate-400 mt-1">Collections with the same category will be grouped together.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createCollection} disabled={loading}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
              <Button onClick={() => { setShowNewCollectionModal(false); setNewCollectionName(''); setNewCollectionCategory(''); }} variant="outline">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">Impor Soal dari TXT</h2>
            <p className="text-xs text-slate-500 mb-4">Paste format Ayken: Soal X / A. Opsi / Jawaban: A</p>
            
            <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
              <p className="text-xs font-medium text-slate-600 mb-2">File yang dipilih:</p>
              {importFile ? (
                <p className="text-sm font-medium text-slate-900 truncate">{importFile.name}</p>
              ) : (
                <p className="text-sm text-slate-500 italic">Belum ada file dipilih</p>
              )}
            </div>
            
            <Input
              type="file"
              accept=".txt"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="mb-4"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={importQuestions}
                disabled={loading || !importFile}
                className="flex-1"
              >
                {loading ? 'Mengimpor...' : 'Impor'}
              </Button>
              <Button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Batal
              </Button>
            </div>
          </Card>
        </div>
      )}
      </Container>
    </section></div>
  );
}
