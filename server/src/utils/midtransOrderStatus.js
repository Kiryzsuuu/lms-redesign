const { getMidtransConfig } = require('./midtransConfig');

function isPaidStatus(transactionStatus) {
  // Unlock course when Midtrans confirms settlement, or capture+accept (credit card).
  return transactionStatus === 'settlement' || transactionStatus === 'capture';
}

function isTerminalFailedStatus(transactionStatus) {
  return transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire' || transactionStatus === 'failure';
}

function safeParseFeeRules(json) {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function computeFeeIdr({ amountIdr, paymentType, mtCfg }) {
  const amt = Math.max(0, Number(amountIdr || 0));
  const rules = safeParseFeeRules(mtCfg.feeRulesJson);

  const rule =
    (rules && paymentType && rules[paymentType]) ||
    (rules && rules.default) ||
    null;

  const percent = Math.max(0, Math.min(100, Number(rule?.percent ?? mtCfg.feePercent ?? 0)));
  const flat = Math.max(0, Math.round(Number(rule?.flat ?? 0)));

  return Math.max(0, Math.round((amt * percent) / 100) + flat);
}

// Shared handler: applies a Midtrans transaction status to the matching order
// (unlocks courses, marks vouchers/coupons used, etc). Used by the webhook,
// the client-side status-sync fallback, the admin manual resync endpoint, and
// the periodic reconciliation job - since the webhook alone is unreliable if
// the notification URL isn't reachable/configured, and the client-side sync
// alone is unreliable for async payment methods (QRIS/bank transfer) where the
// buyer may close the tab before settlement actually happens.
async function applyMidtransStatus({ order, txStatus, paymentType, fraudStatus, rawNotification, settlementTime }) {
  const mtCfg = await getMidtransConfig();
  // Require the sub-models lazily to avoid circular require issues between
  // routes/payments.js, jobs/reconcilePendingOrders.js, and this util.
  const { Order } = require('../models/Order');
  const { User } = require('../models/User');
  const { Cart } = require('../models/Cart');
  const { Voucher } = require('../models/Voucher');
  const { Coupon } = require('../models/Coupon');
  const { Course } = require('../models/Course');
  const { Contract } = require('../models/Contract');
  const { RoyaltyRecord } = require('../models/RoyaltyRecord');
  const { getEnv } = require('./env');
  const { sendPurchaseConfirmation } = require('./emailNotifications');

  const update = {
    'midtrans.transactionStatus': txStatus,
    'midtrans.paymentType': paymentType,
    'midtrans.fraudStatus': fraudStatus,
    'midtrans.rawNotification': rawNotification,
  };

  let newStatus = order.status;
  if (isPaidStatus(txStatus) && fraudStatus !== 'deny') {
    newStatus = 'paid';
    update['midtrans.settlementTime'] = settlementTime ? new Date(settlementTime) : new Date();
    update['midtrans.feeIdr'] = computeFeeIdr({ amountIdr: order.amountIdr, paymentType, mtCfg });
  } else if (isTerminalFailedStatus(txStatus)) {
    newStatus = txStatus === 'expire' ? 'expired' : txStatus === 'cancel' ? 'canceled' : 'failed';
  }

  await Order.updateOne({ _id: order._id }, { $set: { status: newStatus, ...update } });

  if (newStatus === 'paid' && order.status !== 'paid') {
    const courseIds = (order.items || []).map((it) => it.courseId);
    if (courseIds.length) {
      await User.updateOne(
        { _id: order.userId },
        { $addToSet: { purchasedCourseIds: { $each: courseIds } } }
      );

      // Mark first purchase done (untuk disable diskon referral berikutnya)
      const buyer = await User.findById(order.userId).select('referredBy isFirstPurchaseDone royaltyRatio').lean();
      if (buyer?.referredBy && !buyer?.isFirstPurchaseDone) {
        await User.updateOne({ _id: order.userId }, { $set: { isFirstPurchaseDone: true } });
      }

      // Tandai voucher terpakai bila order ini memakai voucher
      if (order.voucherId) {
        await Voucher.updateOne({ _id: order.voucherId, isUsed: false }, { $set: { isUsed: true, usedAt: new Date(), usedOrderId: order._id } });
      }

      // Buat RoyaltyRecord untuk setiap course yang terjual
      const royaltyDocs = [];
      for (const item of order.items) {
        const course = await Course.findById(item.courseId).select('ownerId').lean();
        if (!course?.ownerId) continue;

        // Sumber kebenaran royalti = Kontrak yang accepted untuk course ini.
        // Prioritas: kontrak accepted yang masih berlaku (validUntil >= now),
        // lalu kontrak accepted terbaru, lalu fallback ke User.royaltyRatio.
        const now = new Date();
        const contract =
          (await Contract.findOne({
            courseId: item.courseId,
            teacherId: course.ownerId,
            status: 'accepted',
            validUntil: { $gte: now },
          }).sort({ createdAt: -1 }).select('royaltyRatio').lean()) ||
          (await Contract.findOne({
            courseId: item.courseId,
            teacherId: course.ownerId,
            status: 'accepted',
          }).sort({ createdAt: -1 }).select('royaltyRatio').lean());

        let ratio;
        if (contract && typeof contract.royaltyRatio === 'number') {
          ratio = contract.royaltyRatio;
        } else {
          const owner = await User.findById(course.ownerId).select('royaltyRatio').lean();
          ratio = owner?.royaltyRatio || 0;
        }
        if (ratio <= 0) continue;
        royaltyDocs.push({
          teacherId: course.ownerId,
          studentId: order.userId,
          orderId: order._id,
          courseId: item.courseId,
          courseTitle: item.title,
          grossAmountIdr: item.priceIdr || 0,
          royaltyRatio: ratio,
          royaltyAmountIdr: Math.round((item.priceIdr || 0) * ratio),
          status: 'pending',
        });
      }
      if (royaltyDocs.length) {
        await RoyaltyRecord.insertMany(royaltyDocs);
      }

      // Send purchase confirmation email
      const env = getEnv();
      const user = await User.findById(order.userId).lean();
      try {
        for (const item of order.items) {
          await sendPurchaseConfirmation(env, {
            userEmail: user.email,
            userName: user.fullName || user.name,
            courseName: item.title,
            purchaseDate: new Date(),
          });
        }
      } catch (emailErr) {
        console.error('Failed to send purchase confirmation:', emailErr);
      }
    }

    // Log coupon usage
    if (order.coupon?.couponId) {
      await Coupon.updateOne(
        { _id: order.coupon.couponId },
        {
          $inc: { currentUsageCount: 1 },
          $push: { usageLog: { $each: [{ userId: order.userId, orderId: order._id, usedAt: new Date() }], $slice: -1000 } },
        }
      );
    }

    await Cart.updateOne({ userId: order.userId }, { $set: { items: [] } });
  }

  return newStatus;
}

module.exports = { applyMidtransStatus, isPaidStatus, isTerminalFailedStatus };
