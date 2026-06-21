import { useEffect, useState } from 'react';
import { Button, Card, Input, Label } from '../../components/ui';
import { SidebarShell } from '../../components/SidebarShell';
import { useAuth } from '../../lib/auth';

const LESSON_TYPES = ['text', 'video', 'quiz', 'assignment'];

function emptyModule(idx) {
  return { title: `Modul ${idx + 1}`, lessons: [] };
}

function emptyLesson() {
  return { title: '', type: 'text' };
}

export default function CourseTemplateManager() {
  const { api } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ name: '', description: '', modules: [], isActive: true });
  const [savingId, setSavingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/course-templates');
      setTemplates(res.data.templates || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Gagal memuat template');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setEditingId('new');
    setForm({ name: '', description: '', modules: [emptyModule(0)], isActive: true });
  }

  function startEdit(t) {
    setEditingId(t._id);
    setForm({
      name: t.name,
      description: t.description || '',
      modules: (t.modules || []).map((m) => ({ ...m, lessons: (m.lessons || []).map((l) => ({ ...l })) })),
      isActive: t.isActive !== false,
    });
  }

  function cancelEdit() {
    setEditingId('');
    setForm({ name: '', description: '', modules: [], isActive: true });
  }

  // Module helpers
  function addModule() {
    setForm((f) => ({ ...f, modules: [...f.modules, emptyModule(f.modules.length)] }));
  }
  function removeModule(mi) {
    setForm((f) => ({ ...f, modules: f.modules.filter((_, i) => i !== mi) }));
  }
  function updateModule(mi, field, value) {
    setForm((f) => ({ ...f, modules: f.modules.map((m, i) => i === mi ? { ...m, [field]: value } : m) }));
  }
  function addLesson(mi) {
    setForm((f) => ({
      ...f,
      modules: f.modules.map((m, i) => i === mi ? { ...m, lessons: [...(m.lessons || []), emptyLesson()] } : m),
    }));
  }
  function removeLesson(mi, li) {
    setForm((f) => ({
      ...f,
      modules: f.modules.map((m, i) => i === mi ? { ...m, lessons: m.lessons.filter((_, j) => j !== li) } : m),
    }));
  }
  function updateLesson(mi, li, field, value) {
    setForm((f) => ({
      ...f,
      modules: f.modules.map((m, i) =>
        i === mi ? { ...m, lessons: m.lessons.map((l, j) => j === li ? { ...l, [field]: value } : l) } : m
      ),
    }));
  }

  async function save() {
    if (!form.name.trim()) { setError('Nama template wajib diisi'); return; }
    setSavingId(editingId);
    setError('');
    try {
      if (editingId === 'new') {
        const res = await api.post('/course-templates', form);
        setTemplates((prev) => [res.data.template, ...prev]);
      } else {
        const res = await api.put(`/course-templates/${editingId}`, form);
        setTemplates((prev) => prev.map((t) => (t._id === editingId ? res.data.template : t)));
      }
      cancelEdit();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Gagal menyimpan template');
    } finally {
      setSavingId('');
    }
  }

  async function deleteTemplate(id) {
    if (!window.confirm('Hapus template ini?')) return;
    setError('');
    try {
      await api.delete(`/course-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      if (editingId === id) cancelEdit();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Gagal menghapus template');
    }
  }

  const renderSidebar = () => (
    <div className="space-y-3">
      <Button onClick={startNew} className="w-full text-sm">+ Template Baru</Button>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mt-4">Template Tersedia</div>
      {templates.map((t) => (
        <button
          key={t._id}
          onClick={() => startEdit(t)}
          className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition-colors ${editingId === t._id ? 'bg-orange-100 text-orange-800 font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
        >
          <div className="font-medium truncate">{t.name}</div>
          <div className="text-xs text-slate-500">{(t.modules || []).length} modul · {t.isActive ? 'Aktif' : 'Nonaktif'}</div>
        </button>
      ))}
      {templates.length === 0 && !loading && (
        <div className="text-xs text-slate-500 italic">Belum ada template</div>
      )}
    </div>
  );

  return (
    <SidebarShell
      title="Template Outline Course"
      description="Buat dan kelola template struktur course. Teacher dapat memilih template saat membuat course baru."
      actions={<Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>}
      renderSidebar={renderSidebar}
      sidebarWidth="w-72"
    >
      {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {!editingId ? (
        <Card className="p-6">
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-500 text-sm mb-4">Belum ada template. Buat template pertama Anda.</div>
              <Button onClick={startNew}>Buat Template Baru</Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((t) => (
                <div key={t._id} className="border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{t.name}</div>
                      {t.description && <div className="text-sm text-slate-600 mt-0.5">{t.description}</div>}
                      <div className="mt-2 text-xs text-slate-500">{(t.modules || []).length} modul · {(t.modules || []).reduce((s, m) => s + (m.lessons || []).length, 0)} lesson total</div>
                      <div className="mt-2 flex flex-col gap-1">
                        {(t.modules || []).map((m, mi) => (
                          <div key={mi} className="text-xs">
                            <span className="font-medium text-slate-700">{mi + 1}. {m.title}</span>
                            {(m.lessons || []).length > 0 && (
                              <span className="ml-2 text-slate-400">({(m.lessons || []).map((l) => l.title).join(', ')})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" className="text-xs" onClick={() => startEdit(t)}>Edit</Button>
                      <Button variant="outline" className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => deleteTemplate(t._id)}>Hapus</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-lg font-bold mb-6">{editingId === 'new' ? 'Template Baru' : 'Edit Template'}</div>

          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nama Template</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="mis: Kursus Teknis Standar"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2 mt-4">
                  <input
                    id="tplActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="tplActive">Aktif (dapat dipilih teacher)</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Deskripsi</Label>
              <textarea
                className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Deskripsi singkat kapan template ini digunakan"
              />
            </div>

            {/* Modules */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Struktur Modul</Label>
                <Button type="button" variant="outline" className="text-xs" onClick={addModule}>+ Tambah Modul</Button>
              </div>

              <div className="grid gap-4">
                {form.modules.map((m, mi) => (
                  <div key={mi} className="border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-slate-500 w-6">M{mi + 1}</span>
                      <Input
                        value={m.title}
                        onChange={(e) => updateModule(mi, 'title', e.target.value)}
                        placeholder="Nama modul"
                        className="flex-1"
                      />
                      <button type="button" onClick={() => removeModule(mi)} className="text-xs text-rose-500 hover:text-rose-700 shrink-0">Hapus</button>
                    </div>

                    <div className="ml-8 grid gap-2">
                      {(m.lessons || []).map((l, li) => (
                        <div key={li} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-4">{li + 1}.</span>
                          <Input
                            value={l.title}
                            onChange={(e) => updateLesson(mi, li, 'title', e.target.value)}
                            placeholder="Judul lesson"
                            className="flex-1"
                          />
                          <select
                            value={l.type}
                            onChange={(e) => updateLesson(mi, li, 'type', e.target.value)}
                            className="border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                          >
                            {LESSON_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                          </select>
                          <button type="button" onClick={() => removeLesson(mi, li)} className="text-xs text-rose-400 hover:text-rose-600">×</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addLesson(mi)} className="text-xs text-orange-600 hover:text-orange-800 self-start mt-1">+ Tambah lesson</button>
                    </div>
                  </div>
                ))}

                {form.modules.length === 0 && (
                  <div className="text-sm text-slate-500 italic">Belum ada modul. Klik "+ Tambah Modul".</div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={cancelEdit}>Batal</Button>
              {editingId !== 'new' && (
                <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => deleteTemplate(editingId)}>Hapus Template</Button>
              )}
              <Button onClick={save} disabled={!!savingId}>
                {savingId ? 'Menyimpan...' : 'Simpan Template'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </SidebarShell>
  );
}
