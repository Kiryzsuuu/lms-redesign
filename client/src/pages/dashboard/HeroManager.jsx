import { useEffect, useState } from 'react';
import { Card, Button, Input, Label } from '../../components/ui';
import { useAuth } from '../../lib/auth';

export default function HeroManager() {
  const { api } = useAuth();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ imageUrl: '', order: 0, isActive: true });
  const [heroText, setHeroText] = useState({
    kicker: 'Belajar & Quiz Interaktif',
    heading: 'Belajar Skill Baru, Setiap Hari',
    subheading: 'Course singkat + quiz interaktif ala Kahoot/Quizizz.',
  });
  const [savingText, setSavingText] = useState(false);
  const [error, setError] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [slidesRes, textRes] = await Promise.all([api.get('/heroes/all'), api.get('/heroes/text')]);
      setSlides(slidesRes.data.slides || []);
      if (textRes?.data?.text) setHeroText(textRes.data.text);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat hero');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e) {
      setSidebarWidth((prev) => {
        const newWidth = e.clientX;
        return Math.max(220, Math.min(newWidth, 600));
      });
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  async function createSlide(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/heroes', form);
      setForm({ imageUrl: '', order: 0, isActive: true });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal membuat hero');
    }
  }

  async function saveHeroText(e) {
    e.preventDefault();
    setError('');
    setSavingText(true);
    try {
      const res = await api.put('/heroes/text', heroText);
      if (res?.data?.text) setHeroText(res.data.text);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal menyimpan tulisan hero');
    } finally {
      setSavingText(false);
    }
  }

  async function updateSlide(id, patch) {
    setError('');
    try {
      const current = slides.find((s) => s._id === id);
      await api.put(`/heroes/${id}`, { ...current, ...patch });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal update hero');
    }
  }

  async function removeSlide(id) {
    if (!confirm('Hapus slide ini?')) return;
    setError('');
    try {
      await api.delete(`/heroes/${id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal hapus hero');
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}><div className="flex flex-col">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-4 border-b border-slate-200 px-4 py-6 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-start gap-1 text-left">
            <h1 className="text-3xl font-extrabold tracking-tight">Kelola Hero Carousel</h1>
            <p className="text-sm text-slate-600">Tambah/ubah slide. Landing page akan otomatis jadi slider.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="shrink-0">Refresh</Button>
        </div>
        {error ? <div className="bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="flex flex-col gap-4 border-r border-slate-200 bg-slate-50 p-3 sm:p-4 overflow-auto"
          style={{ width: `${sidebarWidth}px` }}
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="cursor-col-resize select-none" />
          
          <div>
            <div className="text-base font-bold text-slate-900">Buat Slide Baru (Gambar)</div>
            <form className="mt-4 grid gap-2" onSubmit={createSlide}>
              <div>
                <Label className="block text-xs sm:text-sm">Image URL</Label>
                <Input
                  className="mt-1 text-xs sm:text-sm"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label className="block text-xs sm:text-sm">Order</Label>
                <Input
                  type="number"
                  className="mt-1 text-xs sm:text-sm"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                <Label htmlFor="isActive" className="text-xs sm:text-sm">Active</Label>
              </div>
              <Button type="submit" className="bg-[#F3921B] text-white hover:bg-[#D97C0D] mt-2">
                Tambah Slide
              </Button>
            </form>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="text-base font-bold text-slate-900">Teks di Bawah Hero</div>
            <form className="mt-4 grid gap-2" onSubmit={saveHeroText}>
              <div>
                <Label className="block text-xs sm:text-sm">Kicker</Label>
                <Input
                  className="mt-1 text-xs sm:text-sm"
                  value={heroText.kicker}
                  onChange={(e) => setHeroText((t) => ({ ...t, kicker: e.target.value }))}
                  placeholder="Belajar & Quiz Interaktif"
                />
              </div>
              <div>
                <Label className="block text-xs sm:text-sm">Heading</Label>
                <Input
                  className="mt-1 text-xs sm:text-sm"
                  value={heroText.heading}
                  onChange={(e) => setHeroText((t) => ({ ...t, heading: e.target.value }))}
                  placeholder="Belajar Skill Baru, Setiap Hari"
                />
              </div>
              <div>
                <Label className="block text-xs sm:text-sm">Subheading</Label>
                <Input
                  className="mt-1 text-xs sm:text-sm"
                  value={heroText.subheading}
                  onChange={(e) => setHeroText((t) => ({ ...t, subheading: e.target.value }))}
                  placeholder="Course singkat + quiz interaktif..."
                />
              </div>
              <Button type="submit" variant="outline" disabled={savingText} className="mt-2">
                {savingText ? 'Menyimpan...' : 'Simpan Teks'}
              </Button>
            </form>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <Card className="p-4 sm:p-6">
            <div className="text-lg font-bold text-slate-900">Daftar Slide</div>
            <div className="mt-4 grid gap-3">
              {slides.map((s) => (
                <Card key={s._id} className="p-4 border border-slate-200">
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 break-words w-full">
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-28 shrink-0 overflow-hidden bg-slate-100">
                          {s.imageUrl ? <img src={s.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{s.imageUrl || '(tanpa image url)'}</div>
                          <div className="mt-2 text-xs text-slate-500">Order: {s.order} • Active: {String(s.isActive)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                      <Button 
                        variant="outline" 
                        className="px-3 text-xs sm:text-sm" 
                        onClick={() => updateSlide(s._id, { isActive: !s.isActive })}
                      >
                        {s.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="px-3 text-xs sm:text-sm hover:bg-rose-50 hover:text-rose-700" 
                        onClick={() => removeSlide(s._id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {slides.length === 0 && <div className="text-sm text-slate-600">Belum ada slide.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div></div>
  );
}
