import { PageSpinner } from '../../components/PageSpinner';
import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, Container, Button, Input, Label } from '../../components/ui';
import { useAuth } from '../../lib/auth';

function formatIdr(n) {
  try {
    return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
  } catch {
    return String(n || 0);
  }
}

function isoDayStart(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString();
}

function isoDayEnd(d) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt.toISOString();
}

export default function Accounting() {
  const { api } = useAuth();

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState('summary');

  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const from = isoDayStart(fromDate);
    const to = isoDayEnd(toDate);
    const p = { from, to };
    if (status) p.status = status;
    return p;
  }, [fromDate, toDate, status]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sRes, oRes] = await Promise.all([
        api.get('/reports/accounting/summary', { params }),
        api.get('/reports/accounting/orders', { params }),
      ]);
      setSummary(sRes.data);
      setOrders(oRes.data.orders || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat laporan accounting');
      setSummary(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    setLoadingCourses(true);
    try {
      const res = await api.get('/reports/accounting/courses', { params });
      setCourses(res.data.courses || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat data per-course');
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'courses') loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const revenueByDay = useMemo(() => {
    const grouped = {};
    orders
      .filter((o) => o.status === 'paid')
      .forEach((o) => {
        const day = new Date(o.createdAt).toLocaleDateString('id-ID');
        grouped[day] = (grouped[day] || 0) + o.amountIdr;
      });

    return Object.entries(grouped)
      .map(([day, amount]) => ({ day, amount }))
      .sort((a, b) => new Date(a.day) - new Date(b.day));
  }, [orders]);

  const topCoursesChart = useMemo(() => {
    return courses.slice(0, 10).map((c) => ({
      title: c.title.length > 30 ? c.title.slice(0, 27) + '...' : c.title,
      revenue: c.totalRevenueIdr,
    }));
  }, [courses]);

  async function exportCsv(endpoint) {
    setError('');
    try {
      const res = await api.get(endpoint, {
        params,
        responseType: 'blob',
      });

      const filename = endpoint === '/reports/accounting/orders.csv' ? 'accounting-orders.csv' : 'accounting-courses.csv';
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal export CSV');
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}><section className="py-10">
      <Container>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pembukuan / Accounting</h1>
            <p className="mt-1 text-sm text-slate-600">Ringkasan transaksi, revenue per-course, dan ekspor laporan.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {error ? <div className="mt-4 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        <Card className="mt-6 p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Dari</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>Sampai</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full border border-slate-200 bg-white px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Semua</option>
                <option value="paid">paid</option>
                <option value="pending">pending</option>
                <option value="failed">failed</option>
                <option value="expired">expired</option>
                <option value="canceled">canceled</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={load} disabled={loading}>
                Terapkan Filter
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex gap-3 border-b border-slate-200">
          {['summary', 'courses', 'ledger'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 px-4 font-semibold text-sm transition ${
                tab === t ? 'border-b-2 border-primary text-primary' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'summary' ? 'Ringkasan' : t === 'courses' ? 'Per Course' : 'Ledger'}
            </button>
          ))}
        </div>

        {tab === 'summary' && (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Card className="p-6">
                <div className="text-sm text-slate-600">Gross (paid)</div>
                <div className="mt-1 text-2xl font-extrabold">Rp {formatIdr(summary?.paid?.amountIdr || 0)}</div>
                <div className="mt-1 text-sm text-slate-600">{summary?.paid?.count || 0} transaksi</div>
              </Card>
              <Card className="p-6">
                <div className="text-sm text-slate-600">Fee (estimasi)</div>
                <div className="mt-1 text-2xl font-extrabold">Rp {formatIdr(summary?.paid?.feeIdr || 0)}</div>
                <div className="mt-1 text-sm text-slate-600">Berdasarkan Midtrans</div>
              </Card>
              <Card className="p-6">
                <div className="text-sm text-slate-600">Net (paid)</div>
                <div className="mt-1 text-2xl font-extrabold">Rp {formatIdr(summary?.paid?.netIdr || 0)}</div>
                <div className="mt-1 text-sm text-slate-600">Gross - Fee</div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="p-6">
                <div className="text-sm text-slate-600">Orders total (semua status)</div>
                <div className="mt-1 text-2xl font-extrabold">
                  {Object.values(summary?.byStatus || {}).reduce((sum, x) => sum + (x?.count || 0), 0)}
                </div>
                <div className="mt-1 text-sm text-slate-600">Dalam range tanggal</div>
              </Card>
              <Card className="p-6">
                <div className="text-sm text-slate-600">Paid vs Pending</div>
                <div className="mt-1 text-sm text-slate-700">
                  paid: <span className="font-semibold">{summary?.byStatus?.paid?.count || 0}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  pending: <span className="font-semibold">{summary?.byStatus?.pending?.count || 0}</span>
                </div>
              </Card>
            </div>

            <Card className="mt-6 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-bold">Tren Pendapatan</div>
              </div>
              {revenueByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueByDay} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => `Rp ${formatIdr(value)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#F3921B" name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center text-sm text-slate-600">Tidak ada data revenue</div>
              )}
            </Card>

            <div className="mt-4 flex gap-2">
              <Button onClick={() => exportCsv('/reports/accounting/orders.csv')}>Export Ledger CSV</Button>
            </div>
          </>
        )}

        {tab === 'courses' && (
          <>
            {loadingCourses ? (
              <PageSpinner />
            ) : (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <Card className="p-6">
                    <div className="text-sm text-slate-600">Total Course Terjual</div>
                    <div className="mt-1 text-2xl font-extrabold">{courses.length}</div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-sm text-slate-600">Total Pembeli</div>
                    <div className="mt-1 text-2xl font-extrabold">
                      {courses.reduce((sum, c) => sum + (c.purchaseCount || 0), 0)}
                    </div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-sm text-slate-600">Total Revenue</div>
                    <div className="mt-1 text-2xl font-extrabold">
                      Rp {formatIdr(courses.reduce((sum, c) => sum + (c.totalRevenueIdr || 0), 0))}
                    </div>
                  </Card>
                </div>

                {topCoursesChart.length > 0 && (
                  <Card className="mt-6 p-6">
                    <div className="text-lg font-bold mb-4">Revenue Per-Course (Top 10)</div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={topCoursesChart}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 300, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="title" type="category" width={290} />
                        <Tooltip formatter={(value) => `Rp ${formatIdr(value)}`} />
                        <Bar dataKey="revenue" fill="#F3921B" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                <Card className="mt-6 p-6 overflow-auto">
                  <div className="text-lg font-bold mb-4">Daftar Course</div>
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-5 gap-3 border-b border-slate-200 pb-3 text-xs font-bold text-slate-600">
                      <div>Judul Course</div>
                      <div>Pembuat</div>
                      <div className="text-right">Pembeli</div>
                      <div className="text-right">Siswa</div>
                      <div className="text-right">Total Pendapatan</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {courses.map((c) => (
                        <div key={c.courseId} className="grid grid-cols-5 gap-3 py-3 text-sm">
                          <div className="font-medium text-slate-900">{c.title}</div>
                          <div className="text-slate-700">{c.creatorName}</div>
                          <div className="text-right font-semibold">{c.purchaseCount}</div>
                          <div className="text-right">{c.studentCount}</div>
                          <div className="text-right font-semibold">Rp {formatIdr(c.totalRevenueIdr)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <div className="mt-4 flex gap-2">
                  <Button onClick={() => exportCsv('/reports/accounting/courses.csv')}>Export Per-Course CSV</Button>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'ledger' && (
          <>
            <Card className="mt-6 p-6 overflow-auto">
              <div className="text-lg font-bold mb-4">Ledger Transaksi</div>
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200 pb-2 text-xs font-bold text-slate-600">
                  <div className="col-span-2">Order</div>
                  <div className="col-span-2">Tanggal</div>
                  <div className="col-span-2">User</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2 text-right">Gross</div>
                  <div className="col-span-1 text-right">Fee</div>
                  <div className="col-span-1 text-right">Net</div>
                  <div className="col-span-1">Items</div>
                </div>

                {loading ? (
                  <PageSpinner />
                ) : orders.length ? (
                  <div className="divide-y divide-slate-100">
                    {orders.map((o) => (
                      <div key={o.id} className="grid grid-cols-12 gap-2 py-3 text-sm">
                        <div className="col-span-2 font-semibold text-slate-900">{o.orderCode}</div>
                        <div className="col-span-2 text-slate-700">
                          {new Date(o.createdAt).toLocaleString('id-ID')}
                        </div>
                        <div className="col-span-2 text-slate-700">
                          <div className="font-medium">{o.user?.name || '-'}</div>
                          <div className="text-xs text-slate-500">{o.user?.email || ''}</div>
                        </div>
                        <div className="col-span-1">
                          <span className="rounded border border-slate-200 px-2 py-0.5 text-xs font-bold">{o.status}</span>
                        </div>
                        <div className="col-span-2 text-right font-semibold">Rp {formatIdr(o.amountIdr)}</div>
                        <div className="col-span-1 text-right">Rp {formatIdr(o.feeIdr || 0)}</div>
                        <div className="col-span-1 text-right font-semibold">Rp {formatIdr(o.netIdr || 0)}</div>
                        <div className="col-span-3 text-slate-700">
                          <div className="text-xs">
                            {(o.items || []).map((it) => it.title).join(' | ') || '-'}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {o.midtrans?.paymentType ? `pay: ${o.midtrans.paymentType}` : ''}
                            {o.midtrans?.transactionStatus ? ` • tx: ${o.midtrans.transactionStatus}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-sm text-slate-600">Tidak ada data.</div>
                )}
              </div>
            </Card>

            <div className="mt-4 flex gap-2">
              <Button onClick={() => exportCsv('/reports/accounting/orders.csv')}>Export Ledger CSV</Button>
            </div>
          </>
        )}
      </Container>
    </section></div>
  );
}
