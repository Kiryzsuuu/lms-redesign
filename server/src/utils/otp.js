/**
 * Generate random 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get OTP expiration time (10 minutes from now)
 */
function getOTPExpiration() {
  const now = new Date();
  return new Date(now.getTime() + 10 * 60 * 1000);
}

module.exports = {
  generateOTP,
  getOTPExpiration,
};
