import { useEffect, useState } from 'react';
import { Card, Button, Input, Label } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { SidebarShell } from '../../components/SidebarShell';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const DEFAULT_ABOUT_TEXT = {
  title: 'Tentang InspiraLearn',
  tagline: 'Platform Pembelajaran Terpadu',
  description: 'Kami menyediakan platform pembelajaran online yang inovatif dengan fitur quiz interaktif untuk mendukung pengembangan skill Anda.',
  mission: 'Memberdayakan individu melalui pendidikan berkualitas tinggi yang dapat diakses oleh semua orang.',
  vision: 'Menjadi platform pembelajaran terdepan yang menginspirasi dan mengembangkan talenta Indonesia.',
};

export default function AboutManager() {
  const { api } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [aboutText, setAboutText] = useState(DEFAULT_ABOUT_TEXT);
  const [activeTab, setActiveTab] = useState('info');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    name: '',
    role: '',
    bio: '',
    imageUrl: '',
    order: 0,
    isActive: true,
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [textRes, teachersRes] = await Promise.all([
        api.get('/about/text'),
        api.get('/about/teachers/all'),
      ]);
      setAboutText(textRes.data.text);
      setTeachers(teachersRes.data.teachers || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Reset form when selectedId changes
  useEffect(() => {
    if (selectedId) {
      const teacher = teachers.find((t) => t._id === selectedId);
      if (teacher) {
        setForm({
          name: teacher.name,
          role: teacher.role || '',
          bio: teacher.bio || '',
          imageUrl: teacher.imageUrl || '',
          order: teacher.order || 0,
          isActive: teacher.isActive !== false,
        });
      }
    } else {
      setForm({
        name: '',
        role: '',
        bio: '',
        imageUrl: '',
        order: 0,
        isActive: true,
      });
    }
  }, [selectedId, teachers]);

  async function saveAboutText(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/about/text', aboutText);
      setAboutText(res.data.text);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function saveTeacher(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Nama pengajar tidak boleh kosong');
      return;
    }
    setError('');
    setSaving(true);
    try {
      if (selectedId) {
        await api.put(`/about/teachers/${selectedId}`, form);
      } else {
        await api.post('/about/teachers', form);
      }
      await load();
      setActiveTab('info');
      setSelectedId('');
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeacher() {
    setError('');
    setSaving(true);
    try {
      await api.delete(`/about/teachers/${selectedId}`);
      await load();
      setActiveTab('info');
      setSelectedId('');
      setConfirmDelete(false);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  }

  const renderSidebar = (closeDrawer) => (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() => {
          setSelectedId('');
          setActiveTab('teacher');
          if (closeDrawer) closeDrawer();
        }}
        className="w-full bg-primary text-white"
      >
        Tambah Pengajar
      </Button>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase px-2">Daftar Pengajar</div>
        {teachers.map((teacher) => (
          <button
            key={teacher._id}
            onClick={() => {
              setSelectedId(teacher._id);
              setActiveTab('teacher');
              if (closeDrawer) closeDrawer();
            }}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedId === teacher._id
                ? 'bg-slate-100 border-slate-300'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold text-sm text-slate-900">{teacher.name}</div>
            <div className="text-xs text-slate-500 mt-1">{teacher.role || 'No role'}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`h-2 w-2 rounded-full ${teacher.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="text-xs text-slate-500">{teacher.isActive ? 'Aktif' : 'Nonaktif'}</span>
            </div>
          </button>
        ))}
        {teachers.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-4">Belum ada pengajar</div>
        )}
      </div>
    </div>
  );

  return (
    <SidebarShell
      title="Kelola Tentang Kami"
      description="Kelola info platform dan tim pengajar"
      sidebarTitle="Tim Pengajar"
      renderSidebar={renderSidebar}
      sidebarWidth="w-80"
    >
      {error && <div className="mb-4 bg-rose-50 p-3 text-sm text-rose-700 rounded-lg">{error}</div>}

      {/* Tab Bar */}
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === 'info'
              ? 'text-primary border-b-2 border-primary -mb-[2px]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Info Platform
        </button>
        <button
          onClick={() => setActiveTab('teacher')}
          className={`px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === 'teacher'
              ? 'text-primary border-b-2 border-primary -mb-[2px]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pengajar
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Edit Info Platform</h3>
            <p className="text-sm text-slate-600 mt-1">Ubah informasi tentang InspiraLearn yang ditampilkan di halaman Tentang Kami</p>
          </div>

          <form onSubmit={saveAboutText} className="space-y-4">
            <div>
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                className="mt-1"
                value={aboutText.title}
                onChange={(e) => setAboutText({ ...aboutText, title: e.target.value })}
                placeholder="Tentang InspiraLearn"
              />
            </div>

            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                className="mt-1"
                value={aboutText.tagline}
                onChange={(e) => setAboutText({ ...aboutText, tagline: e.target.value })}
                placeholder="Platform Pembelajaran Terpadu"
              />
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <textarea
                id="description"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                rows="3"
                value={aboutText.description}
                onChange={(e) => setAboutText({ ...aboutText, description: e.target.value })}
                placeholder="Deskripsi tentang platform..."
              />
            </div>

            <div>
              <Label htmlFor="mission">Misi</Label>
              <textarea
                id="mission"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                rows="3"
                value={aboutText.mission}
                onChange={(e) => setAboutText({ ...aboutText, mission: e.target.value })}
                placeholder="Misi kami..."
              />
            </div>

            <div>
              <Label htmlFor="vision">Visi</Label>
              <textarea
                id="vision"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                rows="3"
                value={aboutText.vision}
                onChange={(e) => setAboutText({ ...aboutText, vision: e.target.value })}
                placeholder="Visi kami..."
              />
            </div>

            <Button type="submit" disabled={saving} className="bg-primary text-white">
              {saving ? 'Menyimpan...' : 'Simpan Info'}
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'teacher' && (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {selectedId ? 'Edit Pengajar' : 'Tambah Pengajar Baru'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {selectedId
                ? 'Ubah informasi pengajar'
                : 'Tambahkan pengajar baru ke dalam tim Anda'}
            </p>
          </div>

          <form onSubmit={saveTeacher} className="space-y-4">
            <div>
              <Label htmlFor="name">Nama*</Label>
              <Input
                id="name"
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama lengkap pengajar"
                required
              />
            </div>

            <div>
              <Label htmlFor="role">Jabatan/Role</Label>
              <Input
                id="role"
                className="mt-1"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Contoh: Web Development Instructor"
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">Foto URL</Label>
              <Input
                id="imageUrl"
                className="mt-1"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="bio">Biografi</Label>
              <textarea
                id="bio"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                rows="3"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Biografi singkat pengajar..."
              />
            </div>

            <div>
              <Label htmlFor="order">Urutan</Label>
              <Input
                id="order"
                type="number"
                className="mt-1"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                className="h-4 w-4"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <Label htmlFor="isActive" className="!mb-0">
                Aktif (Tampilkan di halaman publik)
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving} className="bg-primary text-white flex-1">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
              {selectedId && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={saving}
                  onClick={() => setConfirmDelete(true)}
                >
                  Hapus
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus Pengajar?"
        message="Apakah Anda yakin ingin menghapus pengajar ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        confirmVariant="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteTeacher}
      />
    </SidebarShell>
  );
}
