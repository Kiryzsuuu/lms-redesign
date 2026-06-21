import { useEffect, useState } from 'react';
import { SidebarShell } from '../../components/SidebarShell';
import { Button } from '../../components/ui';
import { useAuth } from '../../lib/auth';

const STATUS_LABEL = {
  pending:  { text: 'Menunggu',  bg: '#FEF9E7', color: '#92400e', border: '#FDE68A' },
  approved: { text: 'Disetujui', bg: '#E0F5F5', color: '#0a7a76', border: '#0FADA8' },
  rejected: { text: 'Ditolak',   bg: '#FFF1F2', color: '#be123c', border: '#FDA4AF' },
};

export default function TestimonialManager() {
  const { api } = useAuth();
  const [testimonials, setTestimonials] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await api.get('/testimonials/all');
      setTestimonials(res.data.testimonials || []);
    } catch { setTestimonials([]); }
  }

  useEffect(() => { load(); }, []);

  async function approve(id) {
    try {
      await api.put(`/testimonials/${id}/approve`);
      await load();
    } catch (e) { setError(e?.response?.data?.error?.message || 'Gagal'); }
  }

  async function reject(id) {
    try {
      await api.put(`/testimonials/${id}/reject`);
      await load();
    } catch (e) { setError(e?.response?.data?.error?.message || 'Gagal'); }
  }

  async function remove(id) {
    if (!window.confirm('Hapus testimoni ini?')) return;
    try {
      await api.delete(`/testimonials/${id}`);
      await load();
    } catch (e) { setError(e?.response?.data?.error?.message || 'Gagal'); }
  }

  const counts = { all: testimonials.length, pending: 0, approved: 0, rejected: 0 };
  testimonials.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });

  const visible = filter === 'all' ? testimonials : testimonials.filter((t) => t.status === filter);

  return (
    <SidebarShell
      title="Kelola Testimoni"
      description="Setujui atau tolak testimoni dari siswa. Hanya yang disetujui yang tampil di halaman utama."
    >
      {error && (
        <div className="mb-4 rounded-[10px] p-3 text-sm bg-rose-50 border border-rose-200 text-rose-700">{error}</div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected']).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              background: filter === s ? '#0C628D' : '#F3F4F6',
              color: filter === s ? '#fff' : '#374151',
            }}
          >
            {s === 'all' ? 'Semua' : STATUS_LABEL[s].text}
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: filter === s ? 'rgba(255,255,255,.2)' : '#E5E7EB', color: filter === s ? '#fff' : '#6B7280' }}
            >
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {visible.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">Belum ada testimoni di kategori ini.</div>
        )}
        {visible.map((t) => {
          const st = STATUS_LABEL[t.status];
          return (
            <div key={t._id} className="bg-white rounded-[14px] p-5" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Left: content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: t.grad || 'linear-gradient(135deg,#0C628D,#2E86B5)' }}
                    >
                      {(t.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{t.name}</div>
                      {t.role && <div className="text-xs text-gray-400">{t.role}</div>}
                    </div>
                    <span
                      className="ml-2 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                    >
                      {st.text}
                    </span>
                  </div>
                  <p className="text-sm italic text-gray-600">"{t.text}"</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {t.userId?.email || ''} · {new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Right: actions */}
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  {t.status !== 'approved' && (
                    <Button size="sm" onClick={() => approve(t._id)}>Setujui</Button>
                  )}
                  {t.status !== 'rejected' && (
                    <Button size="sm" variant="outline" onClick={() => reject(t._id)}>Tolak</Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => remove(t._id)}>Hapus</Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SidebarShell>
  );
}
