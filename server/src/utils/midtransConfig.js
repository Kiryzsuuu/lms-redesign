/**
 * getMidtransConfig - Load Midtrans configuration.
 *
 * Priority:
 *   1. Database (admin-configured via /api/settings/admin/midtrans)
 *   2. Environment variables (.env fallback for legacy deployments)
 *
 * Never throws — always returns an object (with possibly empty keys).
 */
const { Setting } = require('../models/Setting');

async function getMidtransConfig() {
  try {
    const doc = await Setting.findOne({ key: 'midtrans' }).lean();
    if (doc?.value?.serverKey || doc?.value?.clientKey) {
      return {
        serverKey:      doc.value.serverKey      || '',
        clientKey:      doc.value.clientKey      || '',
        isProduction:   Boolean(doc.value.isProduction),
        feePercent:     Number(doc.value.feePercent ?? 0),
        feeRulesJson:   doc.value.feeRulesJson   || '',
        enabledPayments: Array.isArray(doc.value.enabledPayments)
          ? doc.value.enabledPayments
          : ['qris', 'bank_transfer'],
      };
    }
  } catch {
    // DB not available yet — fall through to env
  }

  // Env fallback
  return {
    serverKey:      process.env.MIDTRANS_SERVER_KEY  || '',
    clientKey:      process.env.MIDTRANS_CLIENT_KEY  || '',
    isProduction:   process.env.MIDTRANS_IS_PRODUCTION === 'true' || process.env.MIDTRANS_IS_PRODUCTION === '1',
    feePercent:     Number(process.env.MIDTRANS_FEE_PERCENT ?? 0),
    feeRulesJson:   process.env.MIDTRANS_FEE_RULES_JSON || '',
    enabledPayments: ['qris', 'bank_transfer'],
  };
}

module.exports = { getMidtransConfig };
