import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DsPage, DsCard, DsEmpty } from '../components/ds';
import { PageSpinner } from '../components/PageSpinner';

function fmtDate(d) {
  if (!d) return 'Tanpa batas waktu';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TABS = [
  { key: 'upcoming', label: 'Mendatang' },
  { key: 'done', label: 'Selesai' },
  { key: 'late', label: 'Kadaluarsa' },
];

export default function StudentAssignments() {
  const { api } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    if (!api) return;
    api.get('/assignments/mine')
      .then(r => setItems(r.data.assignments || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [api]);

  const counts = useMemo(() => ({
    upcoming: items.filter(i => i.status === 'upcoming').length,
    done: items.filter(i => i.status === 'done').length,
    late: items.filter(i => i.status === 'late').length,
  }), [items]);

  const filtered = items.filter(i => i.status === tab);

  if (loading) return <PageSpinner fullPage />;

  return (
    <DsPage title="Tugas Saya" subtitle="Semua tugas dari kursus yang kamu ikuti">
      <div className="ds-tabs">
        {TABS.map(t => (
          <div key={t.key} className={`ds-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} ({counts[t.key]})
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <DsCard><DsEmpty icon="ti-checklist">Tidak ada tugas pada kategori ini.</DsEmpty></DsCard>
      ) : (
        filtered.map(a => {
          const color = a.status === 'late' ? '#A32D2D' : a.status === 'done' ? '#0FADA8' : '#0C628D';
          const bg = a.status === 'late' ? '#FCEBEB' : a.status === 'done' ? '#E0F5F5' : '#EBF5FF';
          return (
            <DsCard key={a._id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${a.type === 'file_upload' ? 'ti-file-upload' : 'ti-list-check'}`} style={{ fontSize: 18, color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 3 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {a.courseTitle} · Batas: {fmtDate(a.dueDate)}
                    {a.status === 'done' && a.score != null && ` · Nilai: ${a.score}`}
                  </div>
                </div>
                {a.status !== 'done' && (
                  <button className="ds-btn-sm" style={{ flexShrink: 0, background: color }} onClick={() => nav(`/assignment/${a._id}`)}>
                    {a.status === 'late' ? 'Lihat' : 'Kerjakan'}
                  </button>
                )}
                {a.status === 'done' && (
                  <span className="ds-tag" style={{ background: '#E0F5F5', color: '#0F6E56', flexShrink: 0 }}>Selesai</span>
                )}
              </div>
            </DsCard>
          );
        })
      )}
    </DsPage>
  );
}
