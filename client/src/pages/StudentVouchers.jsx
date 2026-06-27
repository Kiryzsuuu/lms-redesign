import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { DsPage, DsCard, DsEmpty } from '../components/ds';
import { PageSpinner } from '../components/PageSpinner';

export default function StudentVouchers() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!api) return;
    api.get('/referral/my-vouchers')
      .then(r => setData(r.data))
      .catch(() => setData({ referralCode: '', vouchers: [], earnedCount: 0, maxVouchers: 3 }))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <PageSpinner fullPage />;

  const { referralCode, vouchers = [], earnedCount = 0, maxVouchers = 3 } = data || {};
  const unused = vouchers.filter(v => !v.isUsed);

  function copyCode() {
    if (!referralCode) return;
    navigator.clipboard?.writeText(referralCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  return (
    <DsPage title="Voucher Saya" subtitle="Bagikan kode referralmu dan dapatkan voucher diskon">
      {/* Kode referral */}
      <DsCard style={{ marginBottom: 16, background: 'linear-gradient(135deg,#0C628D,#0a527a)', color: '#fff', border: 'none' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', opacity: .85 }}>Kode Referral Kamu</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '.12em', fontFamily: 'monospace' }}>{referralCode || '—'}</div>
          <button onClick={copyCode} style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', cursor: 'pointer' }}>
            {copied ? '✓ Tersalin' : 'Salin'}
          </button>
        </div>
        <div style={{ fontSize: 12.5, opacity: .9, marginTop: 10, lineHeight: 1.6 }}>
          Ajak temanmu memasukkan kode ini saat checkout. Setiap teman baru yang memakai kodemu memberimu <strong>voucher diskon 5%</strong> — maksimal {maxVouchers} voucher.
        </div>
        <div style={{ fontSize: 12, marginTop: 8, fontWeight: 700 }}>Voucher diperoleh: {earnedCount} / {maxVouchers}</div>
      </DsCard>

      {vouchers.length === 0 ? (
        <DsCard><DsEmpty icon="ti-ticket">Belum ada voucher. Bagikan kode referralmu untuk mulai mengumpulkan voucher.</DsEmpty></DsCard>
      ) : (
        <DsCard>
          <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>Daftar Voucher ({unused.length} aktif)</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {vouchers.map((v, i) => (
              <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: v.isUsed ? '#F1F5F9' : '#E8FAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-ticket" style={{ fontSize: 18, color: v.isUsed ? '#94A3B8' : '#0BA894' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>{v.code}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Diskon {v.discountPercent}% · {new Date(v.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: v.isUsed ? '#F1F5F9' : '#E8FAF8', color: v.isUsed ? '#64748B' : '#0a7a76' }}>
                  {v.isUsed ? 'Terpakai' : 'Aktif'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 10 }}>Gunakan voucher saat checkout di halaman Keranjang.</div>
        </DsCard>
      )}
    </DsPage>
  );
}
