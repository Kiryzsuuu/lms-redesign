const midtransClient = require('midtrans-client');
const { Order } = require('../models/Order');
const { getMidtransConfig } = require('../utils/midtransConfig');
const { applyMidtransStatus } = require('../utils/midtransOrderStatus');

const MIN_AGE_MS = 5 * 60 * 1000; // beri jeda 5 menit - hindari bentrok dengan sync client saat checkout masih berlangsung
const MAX_AGE_DAYS = 14; // order pending lebih tua dari ini dianggap mati, tidak perlu terus dicek ke Midtrans

// Menutup celah: webhook Midtrans bisa gagal sampai (URL notifikasi salah/tidak
// bisa diakses), dan client-side sync (dipanggil setelah Snap onSuccess/onClose)
// bisa terlewat kalau pembeli menutup tab sebelum pembayaran QRIS/transfer bank
// benar-benar settlement. Job ini mem-poll status asli ke Midtrans untuk semua
// order yang masih 'pending' supaya course tetap ke-unlock walau kedua jalur di atas gagal.
async function reconcilePendingOrders() {
  const mtCfg = await getMidtransConfig();
  if (!mtCfg.serverKey) return { checked: 0, updated: 0, skipped: 'no-server-key' };

  const now = Date.now();
  const orders = await Order.find({
    status: 'pending',
    createdAt: { $lte: new Date(now - MIN_AGE_MS), $gte: new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000) },
  }).limit(200);

  if (!orders.length) return { checked: 0, updated: 0 };

  const core = new midtransClient.CoreApi({
    isProduction: Boolean(mtCfg.isProduction),
    serverKey: mtCfg.serverKey,
    clientKey: mtCfg.clientKey,
  });

  let updated = 0;
  for (const order of orders) {
    try {
      const status = await core.transaction.status(order.orderCode);
      const newStatus = await applyMidtransStatus({
        order,
        txStatus: String(status.transaction_status || ''),
        paymentType: String(status.payment_type || ''),
        fraudStatus: String(status.fraud_status || ''),
        rawNotification: status,
        settlementTime: status.settlement_time,
      });
      if (newStatus !== 'pending') updated++;
    } catch (err) {
      // Midtrans 404 = transaksi belum/tidak pernah dibuat di sisi mereka (mis. Snap
      // ditutup sebelum sempat generate transaksi) - bukan error, lewati saja.
      if (err?.httpStatusCode !== '404' && err?.httpStatusCode !== 404) {
        // eslint-disable-next-line no-console
        console.error(`reconcilePendingOrders: gagal cek order ${order.orderCode}`, err?.message || err);
      }
    }
  }

  return { checked: orders.length, updated };
}

function startReconcilePendingOrdersJob({ intervalMs = 10 * 60 * 1000 } = {}) {
  const timer = setInterval(() => {
    reconcilePendingOrders().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('reconcilePendingOrders job failed', err);
    });
  }, intervalMs);
  timer.unref?.(); // jangan sampai job ini menahan proses tetap hidup saat shutdown
  return timer;
}

module.exports = { reconcilePendingOrders, startReconcilePendingOrdersJob };
