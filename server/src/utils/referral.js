const crypto = require('crypto');
const { User } = require('../models/User');

function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F7B2C1"
}

async function ensureUniqueReferralCode() {
  let tries = 0;
  do {
    const code = generateReferralCode();
    const existing = await User.findOne({ referralCode: code }).select('_id');
    if (!existing) return code;
    tries++;
  } while (tries < 10);
  throw new Error('Gagal generate referral code unik');
}

// Make sure a user has a referral code; assigns one if missing. Returns the code.
async function ensureUserReferralCode(user) {
  if (user.referralCode) return user.referralCode;
  user.referralCode = await ensureUniqueReferralCode();
  await user.save();
  return user.referralCode;
}

module.exports = { generateReferralCode, ensureUniqueReferralCode, ensureUserReferralCode };
