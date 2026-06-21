import { useEffect, useState } from 'react';
import { Button, Card, Label } from '../../components/ui';
import { SidebarShell } from '../../components/SidebarShell';
import { useAuth } from '../../lib/auth';

function fmtRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RoyaltyManager() {
  const { api, role } = useAuth();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [pendingAmt, setPendingAmt] = useState(0);
  const [paidAmt, setPaidAmt] = useState(0);

  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [payingId, setPayingId] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payModalId, setPayModalId] = useState('');
  const [activeTab, setActiveTab] = useState('records');

  async function loadRecords() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterTeacher) params.set('teacherId', filterTeacher);
      if (filterStatus) params.set('status', filterStatus);
      const res = await api.get(`/royalties?${params}`);
      setRecords(res.data.records || []);
      setTotal(res.data.total || 0);
      setPendingAmt(res.data.pendingAmountIdr || 0);
      setPaidAmt(res.data.paidAmountIdr || 0);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Gagal memuat data royalti');
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    if (role !== 'admin') return;
    try {
      const res = await api.get('/royalties/summary');
      setSummary(res.data.summary || []);
    } catch (_) {}
  }

  async function loadTeachers() {
    if (role !== 'admin') return;
    try {
      const res = await api.get('/admin/users');
      setTeachers((res.data.users || []).filter((u) => u.role === 'teacher' || u.role === 'admin'));
    } catch (_) {}
  }

  useEffect(() => {
    loadRecords();
    loadSummary();
    loadTeachers();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [filterTeacher, filterStatus]);

  async function markPaid(id) {
    setPayingId(id);
    setError('');
    try {
      await api.put(`/royalties/${id}/pay`, { paidNote: payNote });
      setPayModalId('');
      setPayNote('');
      await loadRecords();
      await loadSummary();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Gagal memperbarui status royalti');
    } finally {
      setPayingId('');
    }
  }

  const renderSidebar = () => (
    <div className="space-y-4">
      <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Ringkasan</div>
        <div className="grid gap-2">
          <div className="rounded-xl bg-amber-50 p-3">
            <div className="text-xs text-amber-700 font-medium">Royalti Belum Dibayar</div>
            <div className="mt-1 text-xl font-extrabold text-amber-900">{fmtRp(pendingAmt)}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700 font-medium">Royalti Sudah Dibayar</div>
            <div className="mt-1 text-xl font-extrabold text-emerald-900">{fmtRp(paidAmt)}</div>
          </div>
          <div className="rounded-xl bg-slate-100 p-3">
            <div className="text-xs text-slate-600 font-medium">Total Transaksi</div>
            <div className="mt-1 text-xl font-extrabold text-slate-900">{total}</div>
          </div>
        </div>
      </Card>

      {role === 'admin' && (
        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Filter</div>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Teacher</Label>
              <select
                className="mt-1 w-full border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
              >
                <option value="">Semua teacher</option>
                {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <select
                className="mt-1 w-full border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Semua</option>
                <option value="pending">Belum Dibayar</option>
                <option value="paid">Sudah Dibayar</option>
              </select>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <>
      {/* Pay modal */}
      {payModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="text-lg font-bold mb-3">Tandai Sudah Dibayar</div>
            <div className="mb-3">
              <Label className="text-xs">Catatan (no. transfer, dll) — opsional</Label>
              <textarea
                className="mt-1 w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                rows={2}
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="BCA 1234 atas nama Inspira..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setPayModalId(''); setPayNote(''); }}>Batal</Button>
              <Button onClick={() => markPaid(payModalId)} disabled={payingId === payModalId}>
                {payingId === payModalId ? 'Menyimpan...' : 'Konfirmasi Bayar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SidebarShell
        title="Royalti"
        description="Lacak dan kelola royalti pengajar atas setiap penjualan course."
        actions={
          <div className="flex gap-2">
            {role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('records')}
                  className={`px-4 py-2 text-sm font-semibold border ${activeTab === 'records' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  Transaksi
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-2 text-sm font-semibold border ${activeTab === 'summary' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                >
                  Per Teacher
                </button>
              </>
            )}
            <Button variant="outline" onClick={() => { loadRecords(); loadSummary(); }} disabled={loading}>Refresh</Button>
          </div>
        }
        renderSidebar={renderSidebar}
        sidebarWidth="w-72"
      >
        {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        {activeTab === 'summary' && role === 'admin' ? (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Teacher</th>
                  <th className="px-4 py-3 text-right">Ratio</th>
                  <th className="px-4 py-3 text-right">Total Penjualan</th>
                  <th className="px-4 py-3 text-right">Belum Dibayar</th>
                  <th className="px-4 py-3 text-right">Sudah Dibayar</th>
                  <th className="px-4 py-3 text-right">Transaksi</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.teacherName || '-'}</div>
                      <div className="text-xs text-slate-500">{row.teacherEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{Math.round((row.royaltyRatio || 0) * 100)}%</td>
                    <td className="px-4 py-3 text-right">{fmtRp(row.totalGross)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">{fmtRp(row.pendingRoyalty)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{fmtRp(row.paidRoyalty)}</td>
                    <td className="px-4 py-3 text-right">{row.transactionCount}</td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Belum ada data royalti.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-slate-600">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Course</th>
                    {role === 'admin' && <th className="px-4 py-3 text-left">Teacher</th>}
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-right">Royalti</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    {role === 'admin' && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r._id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium max-w-[180px] truncate">{r.courseTitle}</div>
                        <div className="text-xs text-slate-400">{Math.round((r.royaltyRatio || 0) * 100)}% rasio</div>
                      </td>
                      {role === 'admin' && (
                        <td className="px-4 py-3 text-slate-700">{r.teacherId?.name || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-slate-700">{r.studentId?.name || '-'}</td>
                      <td className="px-4 py-3 text-right">{fmtRp(r.grossAmountIdr)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-700">{fmtRp(r.royaltyAmountIdr)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status === 'paid' ? 'Dibayar' : 'Belum'}
                        </span>
                        {r.paidNote && <div className="mt-0.5 text-xs text-slate-400 max-w-[120px] truncate">{r.paidNote}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <div>{fmtDate(r.createdAt)}</div>
                        {r.paidAt && <div className="text-emerald-600">Bayar: {fmtDate(r.paidAt)}</div>}
                      </td>
                      {role === 'admin' && (
                        <td className="px-4 py-3">
                          {r.status === 'pending' && (
                            <Button
                              variant="outline"
                              className="text-xs"
                              onClick={() => { setPayModalId(r._id); setPayNote(''); }}
                            >
                              Bayar
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">Belum ada data royalti.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </SidebarShell>
    </>
  );
}
