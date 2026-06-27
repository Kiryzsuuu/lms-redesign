// One-off: give every user a referralCode if they don't have one.
// Run: node server/scripts/backfillReferralCodes.js  (from project root)
const dotenv = require('dotenv');
const { connectDb } = require('../src/db');
const { getEnv } = require('../src/utils/env');
const { User } = require('../src/models/User');
const { ensureUniqueReferralCode } = require('../src/utils/referral');

async function main() {
  dotenv.config();
  const env = getEnv();
  await connectDb(env.MONGO_URI);

  const users = await User.find({ $or: [{ referralCode: { $exists: false } }, { referralCode: null }, { referralCode: '' }] }).select('_id');
  let updated = 0;
  for (const u of users) {
    const code = await ensureUniqueReferralCode();
    await User.updateOne({ _id: u._id }, { $set: { referralCode: code } });
    updated += 1;
  }
  console.log(`Done. ${updated} of ${users.length} users updated.`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
