import { useEffect, useRef, useState } from 'react';
import { Card, Container, Button, Input, Label, Textarea } from '../../components/ui';
import { SidebarShell } from '../../components/SidebarShell';
import { useAuth } from '../../lib/auth';
import { ConfirmDialog } from '../../components/ConfirmDialog';

function formatIdr(n) {
  try {
    return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
  } catch {
    return String(n || 0);
  }
}

export default function CouponManager() {
  const { api } = useAuth();

  const [coupons, setCoupons] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    maxUsagePerUser: 1,
    maxTotalUsage: null,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: null,
    minPurchaseAmount: 0,
  });

  const confirmActionRef = useRef(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Konfirmasi',
    message: '',
    confirmText: 'OK',
    confirmVariant: 'primary',
  });

  function askConfirm({ title, message, confirmText, confirmVariant, onConfirm }) {
    confirmActionRef.current = onConfirm;
    setConfirmState({
      open: true,
      title: title || 'Konfirmasi',
      message: message || '',
      confirmText: confirmText || 'OK',
      confirmVariant: confirmVariant || 'primary',
    });
  }

  async function loadCoupons() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data.coupons || []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal memuat kupon');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function createCoupon(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!couponForm.code.trim()) {
      setError('Kode kupon harus diisi');
      return;
    }

    if (couponForm.discountValue <= 0) {
      setError('Nilai diskon harus lebih dari 0');
      return;
    }

    try {
      await api.post('/coupons', {
        code: couponForm.code.toUpperCase().trim(),
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        maxUsagePerUser: Number(couponForm.maxUsagePerUser) || 1,
        maxTotalUsage: couponForm.maxTotalUsage ? Number(couponForm.maxTotalUsage) : null,
        validFrom: couponForm.validFrom,
        validUntil: couponForm.validUntil || null,
        minPurchaseAmount: Number(couponForm.minPurchaseAmount) || 0,
      });

      setSuccess('Kupon berhasil dibuat');
      setCouponForm({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        maxUsagePerUser: 1,
        maxTotalUsage: null,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: null,
        minPurchaseAmount: 0,
      });
      setShowForm(false);
      await loadCoupons();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal membuat kupon');
    }
  }

  async function deleteCoupon(couponId, code) {
    askConfirm({
      title: 'Hapus Kupon',
      message: `Apakah Anda yakin ingin menghapus kupon "${code}"?`,
      confirmText: 'Hapus',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setError('');
        setSuccess('');
        try {
          await api.delete(`/coupons/${couponId}`);
          setSuccess('Kupon berhasil dihapus');
          await loadCoupons();
        } catch (e) {
          setError(e?.response?.data?.error?.message || 'Gagal menghapus kupon');
        }
      },
    });
  }

  async function toggleCouponStatus(coupon) {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/coupons/${coupon._id}`, {
        isActive: !coupon.isActive,
      });
      setSuccess(`Kupon ${!coupon.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      await loadCoupons();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal update kupon');
    }
  }

  return (
    <SidebarShell>
      <section className="bg-slate-50 py-10">
        <Container>
          <div className="grid gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900">Kelola Kupon</h1>
                <p className="mt-2 text-sm text-slate-600">Buat dan kelola kupon diskon untuk course</p>
              </div>
              <Button onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Batal' : 'Buat Kupon Baru'}
              </Button>
            </div>

            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

            {/* Form */}
            {showForm && (
              <Card className="p-6">
                <div className="font-bold text-lg mb-4">Buat Kupon Baru</div>
                <form onSubmit={createCoupon} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Kode Kupon</Label>
                    <Input
                      value={couponForm.code}
                      onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="Contoh: DISKON50"
                      required
                    />
                  </div>

                  <div>
                    <Label>Tipe Diskon</Label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm((f) => ({ ...f, discountType: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed">Nominal Tetap (Rp)</option>
                      <option value="free">Gratis Course</option>
                    </select>
                  </div>

                  <div>
                    <Label>Nilai Diskon {couponForm.discountType === 'percentage' ? '(%)' : '(Rp)'}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm((f) => ({ ...f, discountValue: e.target.value }))}
                      placeholder={couponForm.discountType === 'percentage' ? '50' : '100000'}
                      required
                    />
                  </div>

                  <div>
                    <Label>Max Penggunaan Per User</Label>
                    <Input
                      type="number"
                      min="0"
                      value={couponForm.maxUsagePerUser}
                      onChange={(e) => setCouponForm((f) => ({ ...f, maxUsagePerUser: e.target.value }))}
                      placeholder="0 untuk unlimited"
                    />
                  </div>

                  <div>
                    <Label>Max Penggunaan Total</Label>
                    <Input
                      type="number"
                      min="0"
                      value={couponForm.maxTotalUsage || ''}
                      onChange={(e) => setCouponForm((f) => ({ ...f, maxTotalUsage: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="0 untuk unlimited"
                    />
                  </div>

                  <div>
                    <Label>Minimum Pembelian (Rp)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="10000"
                      value={couponForm.minPurchaseAmount}
                      onChange={(e) => setCouponForm((f) => ({ ...f, minPurchaseAmount: e.target.value }))}
                      placeholder="0 tanpa minimum"
                    />
                  </div>

                  <div>
                    <Label>Tanggal Berlaku Dari</Label>
                    <Input
                      type="date"
                      value={couponForm.validFrom}
                      onChange={(e) => setCouponForm((f) => ({ ...f, validFrom: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>Tanggal Berlaku Sampai</Label>
                    <Input
                      type="date"
                      value={couponForm.validUntil || ''}
                      onChange={(e) => setCouponForm((f) => ({ ...f, validUntil: e.target.value || null }))}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Deskripsi (Opsional)</Label>
                    <Textarea
                      value={couponForm.description}
                      onChange={(e) => setCouponForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Deskripsi kupon, misal: Diskon untuk member baru"
                      rows={2}
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-2">
                    <Button type="submit">Buat Kupon</Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Batal
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Coupons List */}
            <div>
              {loading ? (
                <Card className="p-6 text-center text-slate-600">Memuat...</Card>
              ) : coupons.length === 0 ? (
                <Card className="p-6 text-center text-slate-600">Belum ada kupon. Buat yang pertama!</Card>
              ) : (
                <div className="grid gap-4">
                  {coupons.map((coupon) => (
                    <Card key={coupon._id} className="p-4 md:p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-lg text-slate-900">{coupon.code}</div>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded ${
                                coupon.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {coupon.isActive ? 'Aktif' : 'Tidak Aktif'}
                            </span>
                          </div>

                          {coupon.description && (
                            <div className="mt-1 text-sm text-slate-600">{coupon.description}</div>
                          )}

                          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 text-sm">
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Diskon</div>
                              <div className="font-semibold text-slate-900">
                                {coupon.discountType === 'percentage'
                                  ? `${coupon.discountValue}%`
                                  : coupon.discountType === 'fixed'
                                  ? `Rp ${formatIdr(coupon.discountValue)}`
                                  : 'Gratis'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Penggunaan</div>
                              <div className="font-semibold text-slate-900">
                                {coupon.currentUsageCount}
                                {coupon.maxTotalUsage ? `/${coupon.maxTotalUsage}` : ''}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Per User</div>
                              <div className="font-semibold text-slate-900">{coupon.maxUsagePerUser}x</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-600">Min. Belanja</div>
                              <div className="font-semibold text-slate-900">
                                {coupon.minPurchaseAmount > 0
                                  ? `Rp ${formatIdr(coupon.minPurchaseAmount)}`
                                  : 'Tidak ada'}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-500">
                            Berlaku:{' '}
                            {new Date(coupon.validFrom).toLocaleDateString('id-ID')}
                            {coupon.validUntil && ` - ${new Date(coupon.validUntil).toLocaleDateString('id-ID')}`}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant={coupon.isActive ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => toggleCouponStatus(coupon)}
                          >
                            {coupon.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCoupon(coupon._id, coupon.code)}
                            className="text-rose-600"
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmVariant={confirmState.confirmVariant}
        onConfirm={() => {
          confirmActionRef.current?.();
          setConfirmState((s) => ({ ...s, open: false }));
        }}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />
    </SidebarShell>
  );
}
