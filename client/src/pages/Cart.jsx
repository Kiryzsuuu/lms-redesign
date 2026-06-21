import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Container } from '../components/ui';
import { useAuth } from '../lib/auth';

function formatIdr(n) {
  try {
    return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
  } catch {
    return String(n || 0);
  }
}

function getSnapUrl(isProduction) {
  return isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
}

function loadSnapScript({ clientKey, isProduction }) {
  return new Promise((resolve, reject) => {
    if (!clientKey) return reject(new Error('Midtrans client key belum diset'));
    if (window.snap) return resolve(window.snap);

    const existing = document.getElementById('midtrans-snap');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.snap));
      existing.addEventListener('error', () => reject(new Error('Gagal load Midtrans Snap')));
      return;
    }

    const s = document.createElement('script');
    s.id = 'midtrans-snap';
    s.src = getSnapUrl(isProduction);
    s.setAttribute('data-client-key', clientKey);
    s.onload = () => resolve(window.snap);
    s.onerror = () => reject(new Error('Gagal load Midtrans Snap'));
    document.body.appendChild(s);
  });
}

export default function Cart() {
  const { api, user, refreshUser } = useAuth();
  const [items, setItems] = useState([]);
  const [totalIdr, setTotalIdr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [paying, setPaying] = useState(false);
  const [midtransConfig, setMidtransConfig] = useState(null);

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validateCouponLoading, setValidateCouponLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/cart');
      setItems(res.data.items || []);
      setTotalIdr(res.data.totalIdr || 0);
    } catch (e) {
      setItems([]);
      setTotalIdr(0);
      setError(e?.response?.data?.error?.message || 'Gagal load cart');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    api
      .get('/payments/config')
      .then((res) => {
        setMidtransConfig(res.data);
      })
      .catch(() => {
        setMidtransConfig({ clientKey: '', isProduction: false });
      });
  }, []);

  async function remove(courseId) {
    setError('');
    try {
      await api.delete(`/cart/items/${courseId}`);
      await refresh();
      window.dispatchEvent(new Event('cart:changed'));
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Gagal hapus item');
    }
  }

  const finalTotalIdr = appliedCoupon ? appliedCoupon.finalAmount : totalIdr;
  const canCheckout = useMemo(() => !loading && items.length > 0 && !paying, [loading, items.length, paying]);

  async function validateCoupon() {
    setCouponError('');
    if (!couponCode.trim()) {
      setCouponError('Masukkan kode kupon');
      return;
    }

    setValidateCouponLoading(true);
    try {
      const hasReferral = user?.referredBy && !user?.isFirstPurchaseDone;
      const referralDiscountAmount = hasReferral ? Math.round(totalIdr * 0.05) : 0;
      const res = await api.post('/coupons/validate', {
        code: couponCode,
        totalAmount: totalIdr,
        referralDiscountAmount,
        courseIds: items.map((it) => it.course._id),
      });

      if (res.data.valid) {
        setAppliedCoupon(res.data);
        setCouponError('');
      }
    } catch (e) {
      setCouponError(e?.response?.data?.error?.message || 'Kupon tidak valid');
      setAppliedCoupon(null);
    } finally {
      setValidateCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
  }

  async function checkout() {
    setPaying(true);
    setError('');
    setSuccessMsg('');
    try {
      const cfg = midtransConfig || (await api.get('/payments/config')).data;
      const res = await api.post('/payments/checkout', {
        couponCode: appliedCoupon?.coupon.code || undefined,
      });

      if (res.data?.paid) {
        await refresh();
        return;
      }

      await loadSnapScript({ clientKey: cfg.clientKey, isProduction: cfg.isProduction });
      if (!window.snap) throw new Error('Midtrans Snap tidak tersedia');

      window.snap.pay(res.data.snapToken, {
        onSuccess: async () => {
          await refresh();
          setError('');
          setSuccessMsg('Pembayaran diterima. Course akan terbuka otomatis setelah status settlement.');
        },
        onPending: () => {
          setSuccessMsg('Pembayaran pending. Silakan selesaikan pembayaran sesuai instruksi yang muncul.');
        },
        onError: () => {
          setError('Pembayaran gagal / dibatalkan');
        },
        onClose: () => {
          setSuccessMsg('');
        },
      });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || 'Gagal checkout');
    } finally {
      setPaying(false);
    }
  }

  return (
    <section className="py-8 sm:py-10" style={{ background: '#F7F8FA' }}>
      <Container className="max-w-6xl space-y-6">
        <Card className="overflow-hidden">
          <div className="px-6 py-8 text-white sm:px-8" style={{ background: 'linear-gradient(135deg, #0A0E1A 0%, #111827 60%, #0C628D 100%)' }}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-100">Midtrans checkout</div>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Keranjang Course</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-100/90">Pembayaran course diproses melalui Midtrans dengan metode QRIS dan virtual account.</p>
              </div>
              <Link to="/courses">
                <Button variant="outline" className="rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/20">Tambah course</Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Jumlah item</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{items.length}</div>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-900">
              <div className="text-xs font-semibold uppercase tracking-[0.16em]">Metode bayar</div>
              <div className="mt-2 text-xl font-extrabold">QRIS / VA</div>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4 text-orange-900">
              <div className="text-xs font-semibold uppercase tracking-[0.16em]">Total sementara</div>
              <div className="mt-2 text-3xl font-extrabold">Rp {formatIdr(totalIdr)}</div>
            </div>
          </div>
        </Card>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {successMsg ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMsg}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
          {loading ? (
            <Card className="p-6 text-sm text-slate-600">Memuat...</Card>
          ) : items.length === 0 ? (
            <Card className="p-6">
              <div className="text-sm text-slate-600">Cart masih kosong.</div>
              <div className="mt-4">
                <Link to="/courses">
                  <Button>Browse course</Button>
                </Link>
              </div>
            </Card>
          ) : (
            items.map((it) => (
              <Card key={it.course._id} className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="w-full sm:w-56">
                    <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                      {it.course.coverImageUrl ? (
                        <img src={it.course.coverImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                          Cover (opsional)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="line-clamp-2 text-lg font-bold leading-snug text-slate-900">{it.course.title}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">Rp {formatIdr(it.course.priceIdr || 0)}</div>

                    <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <Link to={`/courses/${it.course._id}`}>
                        <Button variant="outline">Detail</Button>
                      </Link>
                      <Button variant="ghost" onClick={() => remove(it.course._id)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}

          </div>

          <div>
            <Card className="rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Ringkasan pembayaran</h2>
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">Rp {formatIdr(totalIdr)}</span>
                </div>

                {/* Coupon Section */}
                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Masukkan kode kupon"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                      />
                      <Button
                        variant="outline"
                        onClick={validateCoupon}
                        disabled={validateCouponLoading || !couponCode.trim()}
                        className="min-w-20"
                      >
                        {validateCouponLoading ? 'Loading...' : 'Pakai'}
                      </Button>
                    </div>
                    {couponError && <div className="text-xs text-rose-600">{couponError}</div>}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase text-emerald-700">Kupon diterapkan</div>
                        <div className="mt-1 text-sm font-semibold text-emerald-900">{appliedCoupon.coupon.code}</div>
                        {appliedCoupon.coupon.description && (
                          <div className="text-xs text-emerald-700">{appliedCoupon.coupon.description}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-emerald-700 hover:text-emerald-900"
                        aria-label="Hapus kupon"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">
                    <span>Diskon</span>
                    <span className="font-semibold">-Rp {formatIdr(appliedCoupon.discountAmount)}</span>
                  </div>
                )}

                <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-orange-900">
                  <div className="font-semibold">Informasi Midtrans</div>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                    <li>Pembayaran dibuka melalui Snap Midtrans.</li>
                    <li>Metode yang aktif: QRIS dan Virtual Account.</li>
                    <li>Akses course aktif otomatis setelah status settlement.</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-slate-900 px-5 py-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Total pembayaran</div>
                <div className="mt-2 text-3xl font-extrabold">Rp {formatIdr(finalTotalIdr)}</div>
                <div className="mt-2 text-xs text-slate-300">{items.length} course siap diproses</div>
              </div>
              <Button disabled={!canCheckout} onClick={checkout} className="mt-6 w-full rounded-2xl py-3 text-base">
                {paying ? 'Memproses...' : 'Checkout & Bayar'}
              </Button>
              <div className="mt-3 text-xs text-slate-500">
                Course akan terbuka otomatis setelah status pembayaran <span className="font-semibold">settlement</span>.
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
