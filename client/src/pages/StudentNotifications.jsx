import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { DsPage, DsCard, DsEmpty } from '../components/ds';
import { PageSpinner } from '../components/PageSpinner';

function timeAgo(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 0) {
    const f = Math.abs(diff);
    if (f < 3600) return `dalam ${Math.floor(f / 60)} menit`;
    if (f < 86400) return `dalam ${Math.floor(f / 3600)} jam`;
    return `dalam ${Math.floor(f / 86400)} hari`;
  }
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function StudentNotifications() {
  const { api } = useAuth();
  const nav = useNavigate();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    Promise.allSettled([api.get('/assignments/mine'), api.get('/discussions/mine'), api.get('/notifications/me')])
      .then(([aRes, dRes, nRes]) => {
        const assignments = aRes.status === 'fulfilled' ? (aRes.value.data.assignments || []) : [];
        const discussions = dRes.status === 'fulfilled' ? (dRes.value.data.comments || []) : [];
        const notifs = nRes.status === 'fulfilled' ? (nRes.value.data.notifications || []) : [];
        const now = Date.now();

        const items = [];
        notifs.forEach(n => {
          const isCourse = n.type === 'new_course';
          items.push({
            key: `n-${n._id}`,
            icon: isCourse ? 'ti-sparkles' : 'ti-bell',
            color: '#0C628D',
            bg: '#EBF6FC',
            title: n.title,
            text: n.body || '',
            time: n.createdAt,
            sortTime: new Date(n.createdAt).getTime(),
            unread: !n.isRead,
            onClick: () => {
              api.post(`/notifications/${n._id}/read`).catch(() => {});
              window.dispatchEvent(new Event('notifications:changed'));
              if (n.link) nav(n.link);
            },
          });
        });
        assignments.forEach(a => {
          if (a.status === 'done' || !a.dueDate) return;
          const due = new Date(a.dueDate).getTime();
          const overdue = a.status === 'late';
          // only show due within 14 days or overdue
          if (!overdue && due - now > 14 * 86400 * 1000) return;
          items.push({
            key: `a-${a._id}`,
            icon: overdue ? 'ti-alert-triangle' : 'ti-clock',
            color: overdue ? '#A32D2D' : '#F3921B',
            bg: overdue ? '#FCEBEB' : '#FEF3E2',
            title: overdue ? 'Tugas kadaluarsa' : 'Pengingat tugas',
            text: `${a.title} — ${a.courseTitle}`,
            time: a.dueDate,
            sortTime: due,
            onClick: () => nav(`/assignment/${a._id}`),
          });
        });
        discussions.slice(0, 15).forEach(c => {
          items.push({
            key: `d-${c._id}`,
            icon: 'ti-message-circle',
            color: '#0FADA8',
            bg: '#E0F5F5',
            title: `${c.user?.name || 'Seseorang'} menulis diskusi`,
            text: `${c.content?.slice(0, 90) || ''}${(c.content || '').length > 90 ? '…' : ''} · ${c.courseTitle}`,
            time: c.createdAt,
            sortTime: new Date(c.createdAt).getTime(),
            onClick: () => c.lessonId && c.courseId && nav(`/courses/${c.courseId}/lessons/${c.lessonId}`),
          });
        });

        items.sort((x, y) => y.sortTime - x.sortTime);
        setFeed(items);
      })
      .finally(() => setLoading(false));
  }, [api, nav]);

  if (loading) return <PageSpinner fullPage />;

  return (
    <DsPage title="Notifikasi" subtitle="Pengingat tugas & aktivitas diskusi terbaru">
      {feed.length === 0 ? (
        <DsCard><DsEmpty icon="ti-bell-off">Tidak ada notifikasi baru. Kamu sudah up to date!</DsEmpty></DsCard>
      ) : (
        <DsCard>
          {feed.map((n, i) => (
            <div
              key={n.key}
              onClick={n.onClick}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: i < feed.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: n.onClick ? 'pointer' : 'default' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 99, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${n.icon}`} style={{ fontSize: 16, color: n.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.45 }}>
                  <strong style={{ color: '#111827' }}>{n.title}{n.text ? ':' : ''}</strong> {n.text}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{timeAgo(n.time)}</div>
              </div>
              {n.unread && <span style={{ width: 8, height: 8, borderRadius: 99, background: '#0C628D', flexShrink: 0, marginTop: 6 }} />}
            </div>
          ))}
        </DsCard>
      )}
    </DsPage>
  );
}
