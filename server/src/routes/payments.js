const express = require('express');
const crypto = require('crypto');
const midtransClient = require('midtrans-client');
const { getMidtransConfig } = require('../utils/midtransConfig');
const { applyMidtransStatus } = require('../utils/midtransOrderStatus');
const { Cart } = require('../models/Cart');
const { Course } = require('../models/Course');
const { Order } = require('../models/Order');
const { User } = require('../models/User');
const { Coupon } = require('../models/Coupon');
const { Voucher } = require('../models/Voucher');
const { asyncHandler } = require('../utils/asyncHandler');
const { HttpError } = require('../utils/errors');
const { getEnv } = require('../utils/env');
const { sendPurchaseNotification } = require('../utils/emailNotifications');

function makeOrderCode() {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  return `ORD-${ts}-${rand}`;
}

function computeMidtransSignature({ orderId, statusCode, grossAmount, serverKey }) {
  return crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

function paymentsRouter({ requireAuth, requireRole, midtrans }) {
  const router = express.Router();

  router.get(
    '/config',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const cfg = await getMidtransConfig();
      res.json({
        clientKey: cfg.clientKey || '',
        isProduction: Boolean(cfg.isProduction),
      });
    })
  );

  // Create Midtrans Snap transaction from current cart
  router.post(
    '/checkout',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      if (!midtrans.serverKey || !midtrans.clientKey) {
        throw new HttpError(500, 'Midtrans belum dikonfigurasi (server key/client key)');
      }

      const { couponCode, voucherCode } = req.body;
      const cart = await Cart.findOne({ userId: req.user.sub }).lean();
      const ids = (cart?.items || []).map((i) => i.courseId);
      if (!ids.length) throw new HttpError(400, 'Cart kosong');

      const courses = await Course.find({ _id: { $in: ids }, isPublished: true }).lean();
      if (!courses.length) throw new HttpError(400, 'Cart kosong');
      if (courses.length !== ids.length) {
        // Some courses were unpublished or deleted — remove them from cart
        const foundIds = new Set(courses.map((c) => String(c._id)));
        const validItems = (cart.items || []).filter((i) => foundIds.has(String(i.courseId)));
        await Cart.updateOne({ userId: req.user.sub }, { $set: { items: validItems } });
        throw new HttpError(400, 'Beberapa course di cart sudah tidak tersedia. Cart telah diperbarui, silakan cek kembali.');
      }

      const user = await User.findById(req.user.sub).lean();
      if (!user) throw new HttpError(401, 'Unauthorized');

      // filter already purchased
      const purchasedSet = new Set((user.purchasedCourseIds || []).map((x) => String(x)));
      const payable = courses.filter((c) => !purchasedSet.has(String(c._id)) && (c.priceIdr || 0) > 0);
      const freeToGrant = courses.filter((c) => !purchasedSet.has(String(c._id)) && (c.priceIdr || 0) === 0);

      if (freeToGrant.length) {
        await User.updateOne(
          { _id: req.user.sub },
          { $addToSet: { purchasedCourseIds: { $each: freeToGrant.map((c) => c._id) } } }
        );
      }

      if (!payable.length) {
        // Clear cart and return
        await Cart.updateOne({ userId: req.user.sub }, { $set: { items: [] } });
        return res.json({ ok: true, paid: true, message: 'Semua course di cart sudah gratis / sudah terbeli', courseIds: courses.map((c) => String(c._id)) });
      }

      const orderCode = makeOrderCode();
      const amountIdr = payable.reduce((sum, c) => sum + (c.priceIdr || 0), 0);

      // Referral discount: 5% untuk pembelian pertama jika user didaftarkan dengan referral code
      let referralDiscountAmount = 0;
      const hasReferral = user.referredBy && !user.isFirstPurchaseDone;
      if (hasReferral) {
        referralDiscountAmount = Math.round(amountIdr * 0.05);
      }

      // Validate and apply coupon
      let couponData = null;
      let discountAmount = referralDiscountAmount;
      let finalAmountIdr = Math.max(0, amountIdr - referralDiscountAmount);

      if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });
        if (!coupon) throw new HttpError(404, 'Coupon tidak ditemukan');
        if (!coupon.isActive) throw new HttpError(400, 'Coupon tidak aktif');

        const now = new Date();
        if (coupon.validFrom && now < coupon.validFrom) throw new HttpError(400, 'Coupon belum berlaku');
        if (coupon.validUntil && now > coupon.validUntil) throw new HttpError(400, 'Coupon sudah kadaluarsa');
        if (coupon.maxTotalUsage && coupon.currentUsageCount >= coupon.maxTotalUsage) {
          throw new HttpError(400, 'Coupon sudah mencapai batas penggunaan');
        }

        const userUsageCount = (coupon.usageLog || []).filter((log) => String(log.userId) === String(req.user.sub)).length;
        if (userUsageCount >= coupon.maxUsagePerUser) {
          throw new HttpError(400, 'Anda sudah mencapai batas penggunaan coupon ini');
        }

        if (amountIdr < coupon.minPurchaseAmount) {
          throw new HttpError(400, `Minimum pembelian adalah Rp ${coupon.minPurchaseAmount}`);
        }

        if (coupon.applicableCourseIds.length > 0) {
          const applicableSet = new Set(coupon.applicableCourseIds.map((id) => String(id)));
          const isApplicable = payable.some((c) => applicableSet.has(String(c._id)));
          if (!isApplicable) throw new HttpError(400, 'Coupon tidak berlaku untuk course yang dipilih');
        }

        // Apply coupon on amount after referral discount
        const baseAfterReferral = Math.max(0, amountIdr - referralDiscountAmount);
        let couponDiscount = 0;
        if (coupon.discountType === 'percentage') {
          couponDiscount = Math.round((baseAfterReferral * coupon.discountValue) / 100);
        } else if (coupon.discountType === 'fixed') {
          couponDiscount = coupon.discountValue;
        } else if (coupon.discountType === 'free') {
          couponDiscount = baseAfterReferral;
        }

        discountAmount = referralDiscountAmount + couponDiscount;
        finalAmountIdr = Math.max(0, amountIdr - discountAmount);
        couponData = {
          couponId: coupon._id,
          code: coupon.code,
          discountAmount: couponDiscount,
          finalAmountIdr,
        };
      }

      // Voucher referral milik user (5% dari subtotal)
      let voucher = null;
      if (voucherCode) {
        voucher = await Voucher.findOne({ code: voucherCode.toUpperCase().trim(), userId: req.user.sub, isUsed: false });
        if (!voucher) throw new HttpError(400, 'Voucher tidak valid atau sudah dipakai');
        const voucherDiscount = Math.round(amountIdr * ((voucher.discountPercent || 5) / 100));
        discountAmount += voucherDiscount;
        finalAmountIdr = Math.max(0, amountIdr - discountAmount);
      }

      // If coupon/referral brings total to 0, grant access directly without Midtrans
      if (finalAmountIdr === 0) {
        await User.updateOne(
          { _id: req.user.sub },
          { $addToSet: { purchasedCourseIds: { $each: payable.map((c) => c._id) } } }
        );
        if (hasReferral) {
          await User.updateOne({ _id: req.user.sub }, { $set: { isFirstPurchaseDone: true } });
        }
        if (couponData?.couponId) {
          await Coupon.updateOne(
            { _id: couponData.couponId },
            {
              $inc: { currentUsageCount: 1 },
              $push: { usageLog: { $each: [{ userId: req.user.sub, usedAt: new Date() }], $slice: -1000 } },
            }
          );
        }
        if (voucher) {
          await Voucher.updateOne({ _id: voucher._id, isUsed: false }, { $set: { isUsed: true, usedAt: new Date() } });
        }
        await Cart.updateOne({ userId: req.user.sub }, { $set: { items: [] } });
        return res.json({ ok: true, paid: true, finalAmountIdr: 0, message: 'Course berhasil diperoleh dengan diskon 100%', courseIds: payable.map((c) => String(c._id)) });
      }

      const items = payable.map((c) => ({
        courseId: c._id,
        title: c.title,
        priceIdr: c.priceIdr || 0,
      }));

      const order = await Order.create({
        userId: req.user.sub,
        orderCode,
        status: 'pending',
        items,
        amountIdr,
        referralDiscount: hasReferral ? referralDiscountAmount : undefined,
        coupon: couponData || undefined,
        voucherId: voucher?._id || undefined,
        midtrans: {
          orderId: orderCode,
        },
      });

      // Send purchase notification email
      const env = getEnv();
      try {
        for (const course of payable) {
          await sendPurchaseNotification(env, {
            userEmail: user.email,
            userName: user.fullName || user.name,
            courseName: course.title,
            coursePrice: course.priceIdr || 0,
          });
        }
      } catch (emailErr) {
        console.error('Failed to send purchase notification:', emailErr);
        // Don't fail checkout if email fails
      }

      const snap = new midtransClient.Snap({
        isProduction: Boolean(midtrans.isProduction),
        serverKey: midtrans.serverKey,
        clientKey: midtrans.clientKey,
      });

      // Load enabled_payments from DB config (with env fallback)
      const mtCfg = await getMidtransConfig();
      const enabledPayments = mtCfg.enabledPayments?.length ? mtCfg.enabledPayments : ['qris', 'bank_transfer'];

      const transaction = await snap.createTransaction({
        transaction_details: {
          order_id: orderCode,
          gross_amount: finalAmountIdr,
        },
        item_details: items.map((it) => ({
          id: String(it.courseId),
          price: it.priceIdr,
          quantity: 1,
          name: it.title.slice(0, 50),
        })),
        customer_details: {
          first_name: (user.name || 'User').slice(0, 50),
          email: user.email,
        },
        enabled_payments: enabledPayments,
      });

      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            'midtrans.snapToken': transaction.token,
            'midtrans.redirectUrl': transaction.redirect_url,
          },
        }
      );

      res.json({
        ok: true,
        orderId: String(order._id),
        orderCode,
        amountIdr,
        referralDiscountAmount,
        discountAmount,
        finalAmountIdr,
        snapToken: transaction.token,
        redirectUrl: transaction.redirect_url,
        courseIds: payable.map((c) => String(c._id)),
      });
    })
  );

  // Midtrans payment notification (webhook)
  router.post(
    '/midtrans/notification',
    asyncHandler(async (req, res) => {
      // Load config dynamically from DB (with env fallback)
      const mtCfg = await getMidtransConfig();
      if (!mtCfg.serverKey) throw new HttpError(500, 'Midtrans belum dikonfigurasi (server key)');

      const n = req.body || {};
      const orderId = n.order_id;
      if (!orderId) throw new HttpError(400, 'Invalid notification');

      const expected = computeMidtransSignature({
        orderId: String(n.order_id || ''),
        statusCode: String(n.status_code || ''),
        grossAmount: String(n.gross_amount || ''),
        serverKey: mtCfg.serverKey,
      });

      const signatureOk = String(n.signature_key || '').toLowerCase() === expected.toLowerCase();
      if (!signatureOk) throw new HttpError(401, 'Invalid signature');

      const order = await Order.findOne({ orderCode: orderId });
      if (!order) throw new HttpError(404, 'Order not found');

      await applyMidtransStatus({
        order,
        txStatus: String(n.transaction_status || ''),
        paymentType: String(n.payment_type || ''),
        fraudStatus: String(n.fraud_status || ''),
        rawNotification: n,
        settlementTime: n.settlement_time,
      });

      res.json({ ok: true });
    })
  );

  // Client-side status sync fallback: called right after Snap onSuccess/redirect,
  // in case the Midtrans server-to-server webhook hasn't arrived yet (e.g. notification
  // URL not reachable/configured). Queries Midtrans directly for the real status.
  router.post(
    '/orders/:orderCode/sync',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const mtCfg = await getMidtransConfig();
      if (!mtCfg.serverKey) throw new HttpError(500, 'Midtrans belum dikonfigurasi (server key)');

      const order = await Order.findOne({ orderCode: req.params.orderCode, userId: req.user.sub });
      if (!order) throw new HttpError(404, 'Order not found');

      if (order.status === 'paid') {
        return res.json({ ok: true, status: 'paid', courseIds: (order.items || []).map((it) => String(it.courseId)) });
      }

      const core = new midtransClient.CoreApi({
        isProduction: Boolean(mtCfg.isProduction),
        serverKey: mtCfg.serverKey,
        clientKey: mtCfg.clientKey,
      });

      const status = await core.transaction.status(order.orderCode);

      const newStatus = await applyMidtransStatus({
        order,
        txStatus: String(status.transaction_status || ''),
        paymentType: String(status.payment_type || ''),
        fraudStatus: String(status.fraud_status || ''),
        rawNotification: status,
        settlementTime: status.settlement_time,
      });

      res.json({ ok: true, status: newStatus, courseIds: (order.items || []).map((it) => String(it.courseId)) });
    })
  );

  // Student: list own orders
  router.get(
    '/orders',
    requireAuth,
    requireRole('student'),
    asyncHandler(async (req, res) => {
      const orders = await Order.find({ userId: req.user.sub }).sort({ createdAt: -1 }).limit(50);
      res.json({ orders });
    })
  );

  // Admin: manually re-check an order's real status with Midtrans and apply it.
  // For when the webhook never arrived (misconfigured/unreachable notification URL)
  // and the buyer closed the tab before the client-side sync could catch settlement
  // (common with QRIS/bank transfer, which settle asynchronously outside the Snap popup).
  router.post(
    '/admin/orders/:orderCode/sync',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const mtCfg = await getMidtransConfig();
      if (!mtCfg.serverKey) throw new HttpError(500, 'Midtrans belum dikonfigurasi (server key)');

      const order = await Order.findOne({ orderCode: req.params.orderCode });
      if (!order) throw new HttpError(404, 'Order not found');

      if (order.status === 'paid') {
        return res.json({ ok: true, status: 'paid', courseIds: (order.items || []).map((it) => String(it.courseId)) });
      }

      const core = new midtransClient.CoreApi({
        isProduction: Boolean(mtCfg.isProduction),
        serverKey: mtCfg.serverKey,
        clientKey: mtCfg.clientKey,
      });

      const status = await core.transaction.status(order.orderCode);

      const newStatus = await applyMidtransStatus({
        order,
        txStatus: String(status.transaction_status || ''),
        paymentType: String(status.payment_type || ''),
        fraudStatus: String(status.fraud_status || ''),
        rawNotification: status,
        settlementTime: status.settlement_time,
      });

      res.json({ ok: true, status: newStatus, courseIds: (order.items || []).map((it) => String(it.courseId)) });
    })
  );

  return router;
}

module.exports = { paymentsRouter };
