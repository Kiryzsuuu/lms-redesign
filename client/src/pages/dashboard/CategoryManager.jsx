import { useEffect, useState } from 'react';
import { SidebarShell } from '../../components/SidebarShell';
import { Button, Input, Label } from '../../components/ui';
import { useAuth } from '../../lib/auth';

const ACCENT_PRESETS = [
  '#0C628D', '#0FADA8', '#6C5CE7', '#F3921B',
  '#E84393', '#84CC16', '#F59E0B', '#374151',
];

const BG_PRESETS = [
  '#E0F0FA', '#E0F5F5', '#EEE9FF', '#FEF3E2',
  '#FFE5F3', '#F0FDE4', '#FEF9E7', '#F3F4F6',
];

const EMPTY = {
  name: '', subtitle: '', coverImageUrl: '',
  accent: '#0C628D', iconBg: '#E0F0FA', order: 0, isActive: true,
};

export default function CategoryManager() {
  const { api } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function load() {
    try {
      const res = await api.get('/categories/all');
      setCategories(res.data.categories || []);
    } catch { setCategories([]); }
  }

  useEffect(() => { load(); }, []);

  function startEdit(cat) {
    setEditId(cat._id);
    setForm({
      name: cat.name || '',
      subtitle: cat.subtitle || '',
      coverImageUrl: cat.coverImageUrl || '',
      accent: cat.accent || '#0C628D',
      iconBg: cat.iconBg || '#E0F0FA',
      order: cat.order ?? 0,
      isActive: cat.isActive ?? true,
    });
    setError('');
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY);
    setError('');
  }

  async function uploadImage(file) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/uploads/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.url || res.data?.path || '';
      setForm((f) => ({ ...f, coverImageUrl: url }));
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Upload gagal');
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editId) {
        await api.put(`/categories/${editId}`, form);
      } else {
        await api.post('/categories', form);
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Hapus kategori ini?')) return;
    try {
      await api.delete(`/categories/${id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Gagal menghapus');
    }
  }

  return (
    <SidebarShell
      title="Kelola Kategori"
      description="Tambah, edit, atau hapus kategori yang tampil di halaman utama."
      actions={
        !editId && (
          <Button onClick={() => { setEditId('new'); setForm(EMPTY); setError(''); }}>
            Tambah Kategori
          </Button>
        )
      }
    >
      {error && (
        <div className="mb-4 rounded-[10px] p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700">{error}</div>
      )}

      {/* Form */}
      {editId && (
        <form onSubmit={submit} className="mb-8 bg-gray-50 border border-gray-200 rounded-[16px] p-6 grid gap-4">
          <h3 className="font-display font-bold text-gray-900">{editId === 'new' ? 'Tambah Kategori Baru' : 'Edit Kategori'}</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1">Nama Kategori</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Cloud & DevOps" required />
            </div>
            <div>
              <Label className="block mb-1">Subtitle / Jumlah Kursus</Label>
              <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. 41 kursus" />
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <Label className="block mb-1">Gambar Sampul</Label>
            <div className="flex items-center gap-3 flex-wrap">
              {form.coverImageUrl && (
                <img src={form.coverImageUrl} alt="preview" className="h-[80px] w-[140px] object-cover rounded-[10px] border border-gray-200" />
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                {uploading ? 'Mengunggah...' : 'Upload Gambar'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); }}
                  disabled={uploading}
                />
              </label>
              {form.coverImageUrl && (
                <button type="button" className="text-sm text-rose-600 hover:underline" onClick={() => setForm((f) => ({ ...f, coverImageUrl: '' }))}>
                  Hapus gambar
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">Jika tidak ada gambar, warna latar belakang akan digunakan.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Accent color */}
            <div>
              <Label className="block mb-1">Warna Aksen</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, accent: c }))}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: form.accent === c ? '#111827' : 'transparent' }}
                  />
                ))}
                <input
                  type="color"
                  value={form.accent}
                  onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))}
                  className="w-7 h-7 rounded-full cursor-pointer border border-gray-200"
                  title="Pilih warna lain"
                />
              </div>
            </div>

            {/* Icon/BG color */}
            <div>
              <Label className="block mb-1">Warna Latar (Fallback)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {BG_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, iconBg: c }))}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: form.iconBg === c ? '#111827' : '#E5E7EB' }}
                  />
                ))}
                <input
                  type="color"
                  value={form.iconBg}
                  onChange={(e) => setForm((f) => ({ ...f, iconBg: e.target.value }))}
                  className="w-7 h-7 rounded-full cursor-pointer border border-gray-200"
                  title="Pilih warna lain"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="block mb-1">Urutan</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                min={0}
              />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-[#0C628D]"
                />
                Aktif (tampil di halaman utama)
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
            <Button type="button" variant="outline" onClick={cancelEdit}>Batal</Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="grid gap-3">
        {categories.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">Belum ada kategori. Tambahkan satu.</div>
        )}
        {categories.map((cat) => (
          <div
            key={cat._id}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-[14px] p-4"
          >
            {/* Preview */}
            <div
              className="w-[56px] h-[56px] rounded-[10px] flex-shrink-0 overflow-hidden"
              style={{ background: cat.coverImageUrl ? undefined : cat.iconBg || '#E0F0FA' }}
            >
              {cat.coverImageUrl && (
                <img src={cat.coverImageUrl} alt={cat.name} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-sm text-gray-900 flex items-center gap-2">
                {cat.name}
                <span
                  className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ background: cat.accent || '#0C628D' }}
                />
                {!cat.isActive && (
                  <span className="text-[0.7rem] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Nonaktif</span>
                )}
              </div>
              {cat.subtitle && <div className="text-xs text-gray-400 mt-0.5">{cat.subtitle}</div>}
              <div className="text-xs text-gray-400">Urutan: {cat.order}</div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => startEdit(cat)}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => remove(cat._id)}>Hapus</Button>
            </div>
          </div>
        ))}
      </div>
    </SidebarShell>
  );
}
