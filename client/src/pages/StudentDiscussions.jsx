import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DsPage, DsCard, DsEmpty } from '../components/ds';
import { PageSpinner } from '../components/PageSpinner';

const AVATAR_COLORS = ['#0C628D', '#3B6D11', '#993C1D', '#6C5CE7', '#0FADA8'];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function timeAgo(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function StudentDiscussions() {
  const { api } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!api) return;
    api.get('/discussions/mine')
      .then(r => setItems(r.data.comments || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <PageSpinner fullPage />;

  const filtered = items.filter(c =>
    !q || (c.content || '').toLowerCase().includes(q.toLowerCase()) || (c.courseTitle || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <DsPage title="Forum Diskusi" subtitle="Diskusi terbaru dari kursus yang kamu ikuti">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', height: 38, maxWidth: 360, marginBottom: 16 }}>
        <i className="ti ti-search" style={{ fontSize: 15, color: '#9CA3AF' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari diskusi…"
          style={{ border: 'none', background: 'none', fontSize: 13, color: '#111827', outline: 'none', width: '100%' }} />
      </div>

      {filtered.length === 0 ? (
        <DsCard><DsEmpty icon="ti-message-circle">Belum ada diskusi. Mulai bertanya di materi kursusmu!</DsEmpty></DsCard>
      ) : (
        filtered.map((c, i) => (
          <DsCard
            key={c._id}
            style={{ marginBottom: 10, cursor: c.lessonId ? 'pointer' : 'default' }}
            onClick={() => c.lessonId && c.courseId && nav(`/courses/${c.courseId}/lessons/${c.lessonId}`)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initials(c.user?.name)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{c.user?.name || 'Pengguna'}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(c.createdAt)} · {c.courseTitle}{c.lessonTitle ? ` · ${c.lessonTitle}` : ''}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.55 }}>{c.content}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: '#9CA3AF' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-message-reply" /> {c.replies} Balas</span>
            </div>
          </DsCard>
        ))
      )}
    </DsPage>
  );
}
