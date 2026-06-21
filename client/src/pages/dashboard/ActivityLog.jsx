import { PageSpinner } from '../../components/PageSpinner';
import { useEffect, useState, useCallback } from 'react';
import { SidebarShell } from '../../components/SidebarShell';
import { useAuth } from '../../lib/auth';

const ACTION_LABEL = {
  create:    { text: 'Dibuat',      bg: '#E0F5F5', color: '#0a7a76' },
  update:    { text: 'Diedit',      bg: '#E0F0FA', color: '#0C628D' },
  delete:    { text: 'Dihapus',     bg: '#FFF1F2', color: '#be123c' },
  publish:   { text: 'Dipublish',   bg: '#F0FDE4', color: '#4D7C0F' },
  unpublish: { text: 'Unpublish',   bg: '#FEF9E7', color: '#92400e' },
};

const RESOURCE_LABEL = {
  course:      'Course',
  module:      'Modul',
  lesson:      'Materi',
  quiz:        'Quiz',
  question:    'Soal',
  category:    'Kategori',
  hero:        'Hero',
  user:        'Pengguna',
  coupon:      'Kupon',
  testimonial: 'Testimoni',
};

const RESOURCE_COLORS = {
  course:  '#0C628D',
  module:  '#6C5CE7',
  lesson:  '#0FADA8',
  quiz:    '#E84393',
  user:    '#F3921B',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}d yang lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ActivityLog() {
  const { api, role } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filterResource, setFilterResource] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (filterResource) params.set('resource', filterResource);
      if (filterAction)   params.set('action', filterAction);
      const res = await api.get(`/audit-logs?${params}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [api, filterResource, filterAction]);

  useEffect(() => { load(1); }, [load]);

  return (
    <SidebarShell
      title="Log Aktivitas"
      description="Rekam jejak semua perubahan konten — siapa, apa, kapan."
    >
      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value)}
          className="text-sm border border-gray-200 rounded-[10px] px-3 py-2 bg-white focus:outline-none"
        >
          <option value="">Semua tipe</option>
          {Object.entries(RESOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-sm border border-gray-200 rounded-[10px] px-3 py-2 bg-white focus:outline-none"
        >
          <option value="">Semua aksi</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v.text}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400 self-center">{total} entri</span>
      </div>

      {loading ? (
        <PageSpinner />
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">Belum ada aktivitas tercatat.</div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: '#E5E7EB' }} />

          <div className="space-y-0">
            {logs.map((log, i) => {
              const al = ACTION_LABEL[log.action] || { text: log.action, bg: '#F3F4F6', color: '#374151' };
              const rl = RESOURCE_LABEL[log.resource] || log.resource;
              const rc = RESOURCE_COLORS[log.resource] || '#6B7280';
              return (
                <div key={log._id} className="flex gap-4 pb-5 relative">
                  {/* Dot */}
                  <div
                    className="w-[10px] h-[10px] rounded-full flex-shrink-0 mt-1.5 z-10"
                    style={{ background: al.color, border: `2px solid ${al.bg}`, marginLeft: 14 }}
                  />

                  {/* Card */}
                  <div className="flex-1 bg-white rounded-[14px] px-4 py-3" style={{ border: '1px solid #E5E7EB' }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        {/* Actor + action */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem] font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#0C628D,#2E86B5)' }}
                          >
                            {(log.actorName || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{log.actorName || '—'}</span>
                          <span
                            className="text-[0.7rem] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: al.bg, color: al.color }}
                          >
                            {al.text}
                          </span>
                          <span
                            className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: '#F3F4F6', color: rc }}
                          >
                            {rl}
                          </span>
                          <span className="text-xs font-medium text-gray-400">
                            [{log.actorRole}]
                          </span>
                        </div>

                        {/* Resource name */}
                        <div className="mt-1 text-sm text-gray-700 font-medium">
                          {log.resourceName || '—'}
                          {log.parentName && (
                            <span className="text-gray-400 font-normal"> · dalam <em>{log.parentName}</em></span>
                          )}
                        </div>

                        {/* Changed fields */}
                        {log.changedFields?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {log.changedFields.map((f) => (
                              <span key={f} className="text-[0.68rem] px-1.5 py-0.5 rounded" style={{ background: '#F0F8FD', color: '#0C628D' }}>
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                        {log.notes && <div className="mt-1 text-xs text-gray-400 italic">{log.notes}</div>}
                      </div>

                      {/* Time */}
                      <div className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {timeAgo(log.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex gap-2 mt-4 justify-center">
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1)}
                className="px-4 py-2 text-sm rounded-[10px] border border-gray-200 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">{page} / {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => load(page + 1)}
                className="px-4 py-2 text-sm rounded-[10px] border border-gray-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </SidebarShell>
  );
}
