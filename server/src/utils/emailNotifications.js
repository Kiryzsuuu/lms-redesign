const { sendMail, hasSmtpConfigured } = require('./mailer');

/**
 * Send purchase notification to user
 */
async function sendPurchaseNotification(env, { userEmail, userName, courseName, coursePrice }) {
  if (!hasSmtpConfigured(env)) return;

  const subject = `Pembayaran Course: ${courseName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #d76810;">Notifikasi Pembayaran Course</h2>
      
      <p>Halo <strong>${userName}</strong>,</p>
      
      <p>Kami ingin memberitahukan bahwa Anda telah memulai proses pembayaran untuk course berikut:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d76810; margin: 15px 0;">
        <p><strong>Course:</strong> ${courseName}</p>
        <p><strong>Harga:</strong> Rp ${coursePrice.toLocaleString('id-ID')}</p>
        <p><strong>Status:</strong> Menunggu Konfirmasi</p>
      </div>
      
      <p>Silakan menyelesaikan proses pembayaran untuk mendapatkan akses penuh ke course ini.</p>
      
      <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 12px; color: #888;">
        Email ini dikirim secara otomatis. Silakan jangan membalas email ini.
      </p>
    </div>
  `;

  await sendMail(env, {
    to: userEmail,
    subject,
    html,
    text: `Notifikasi Pembayaran: ${courseName} - Rp ${coursePrice}`,
  });
}

/**
 * Send purchase confirmation to user
 */
async function sendPurchaseConfirmation(env, { userEmail, userName, courseName, purchaseDate }) {
  if (!hasSmtpConfigured(env)) return;

  const subject = `Konfirmasi Pembelian: ${courseName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #d76810;">✓ Pembelian Berhasil!</h2>
      
      <p>Halo <strong>${userName}</strong>,</p>
      
      <p>Selamat! Pembelian course Anda telah berhasil diproses.</p>
      
      <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0;">
        <p><strong>Course:</strong> ${courseName}</p>
        <p><strong>Tanggal Pembelian:</strong> ${new Date(purchaseDate).toLocaleDateString('id-ID')}</p>
        <p><strong>Status:</strong> ✓ Aktif</p>
      </div>
      
      <p>Anda sekarang memiliki akses penuh ke materi course ini. Mari mulai belajar!</p>
      
      <a href="${env.CLIENT_URL || 'https://inspira.app'}/courses" style="display: inline-block; background-color: #d76810; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">
        Mulai Belajar
      </a>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 12px; color: #888;">
        Email ini dikirim secara otomatis. Silakan jangan membalas email ini.
      </p>
    </div>
  `;

  await sendMail(env, {
    to: userEmail,
    subject,
    html,
    text: `Konfirmasi Pembelian: ${courseName}`,
  });
}

/**
 * Send progress report when user completes a lesson/quiz/task
 */
async function sendProgressReport(env, { userEmail, userName, courseName, taskName, progress, completedAt }) {
  if (!hasSmtpConfigured(env)) return;

  const subject = `Progress Update: ${courseName} - ${progress}% Selesai`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #d76810;">📊 Laporan Progress Belajar</h2>
      
      <p>Halo <strong>${userName}</strong>,</p>
      
      <p>Anda telah menyelesaikan:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d76810; margin: 15px 0;">
        <p><strong>Course:</strong> ${courseName}</p>
        <p><strong>Task Selesai:</strong> ${taskName}</p>
        <p><strong>Progress:</strong> ${progress}% Selesai</p>
        <p><strong>Waktu:</strong> ${new Date(completedAt).toLocaleString('id-ID')}</p>
      </div>
      
      ${progress === 100 ? `
        <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0;">
          <h3 style="color: #10b981; margin-top: 0;">🎉 Selamat Anda Menyelesaikan Course!</h3>
          <p>Anda telah berhasil menyelesaikan course ini. Sertifikat Anda sudah siap untuk diunduh.</p>
        </div>
      ` : `
        <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0;">
          <p>Terus semangat! Anda sedang dalam perjalanan yang baik. Lanjutkan belajar untuk mencapai 100%.</p>
        </div>
      `}
      
      <a href="${env.CLIENT_URL || 'https://inspira.app'}/courses" style="display: inline-block; background-color: #d76810; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">
        Lihat Progress Saya
      </a>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 12px; color: #888;">
        Email ini dikirim secara otomatis. Silakan jangan membalas email ini.
      </p>
    </div>
  `;

  await sendMail(env, {
    to: userEmail,
    subject,
    html,
    text: `Progress Update: ${courseName} - ${taskName} - ${progress}% Selesai`,
  });
}

/**
 * Send welcome email to new user
 */
async function sendWelcomeEmail(env, { userEmail, userName }) {
  if (!hasSmtpConfigured(env)) return;

  const subject = 'Selamat Datang di Inspira Innovation!';
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #d76810;">Selamat Datang di Inspira Innovation! 🚀</h2>
      
      <p>Halo <strong>${userName}</strong>,</p>
      
      <p>Terima kasih telah mendaftar di platform pembelajaran kami. Kami dengan senang hati menyambut Anda sebagai bagian dari komunitas Inspira Innovation.</p>
      
      <h3 style="color: #d76810;">Langkah Selanjutnya:</h3>
      <ol>
        <li>Login ke akun Anda di platform</li>
        <li>Lengkapi profil Anda</li>
        <li>Jelajahi berbagai course yang tersedia</li>
        <li>Mulai belajar dan berkembang bersama kami</li>
      </ol>
      
      <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0;">
        <p><strong>Tautan Penting:</strong></p>
        <ul>
          <li><a href="${env.CLIENT_URL || 'https://inspira.app'}/courses" style="color: #d76810;">Lihat Semua Course</a></li>
          <li><a href="${env.CLIENT_URL || 'https://inspira.app'}/my-profile" style="color: #d76810;">Edit Profil Saya</a></li>
        </ul>
      </div>
      
      <p>Jika Anda memiliki pertanyaan atau butuh bantuan, jangan ragu untuk menghubungi kami melalui WhatsApp atau email support.</p>
      
      <p>Selamat belajar! 📚</p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 12px; color: #888;">
        Email ini dikirim secara otomatis. Silakan jangan membalas email ini.
      </p>
    </div>
  `;

  await sendMail(env, {
    to: userEmail,
    subject,
    html,
    text: `Selamat Datang di Inspira Innovation, ${userName}!`,
  });
}

/**
 * Send OTP code to user email
 */
async function sendOTP(env, { userEmail, code, type }) {
  // Jangan gate di sini: sendMail() membaca config dari DB lebih dulu, baru env,
  // dan akan melempar error sendiri jika benar-benar belum dikonfigurasi.

  const typeLabel = {
    register: 'Registrasi Akun',
    login: 'Login Akun',
    email: 'Ubah Email',
    password: 'Reset Password',
  }[type] || 'Verifikasi';

  const subject = `${code} adalah kode verifikasi Edulyfe Anda`;
  const html = `
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <title>Kode Verifikasi Edulyfe</title>
  </head>
  <body style="margin:0; padding:0; background-color:#F4F6F9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F9; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #E5E9F0;">
            <tr>
              <td style="background-color:#0C628D; padding:24px 32px;">
                <span style="font-family:'Segoe UI',Arial,sans-serif; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">Edulyfe</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px; font-family:'Segoe UI',Arial,sans-serif; font-size:18px; font-weight:700; color:#1B2B3A;">Verifikasi ${typeLabel}</p>
                <p style="margin:0 0 24px; font-family:'Segoe UI',Arial,sans-serif; font-size:14px; line-height:1.6; color:#5A6B7B;">
                  Gunakan kode di bawah ini untuk melanjutkan. Kode berlaku selama <strong>10 menit</strong>.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#F4F8FB; border:1px solid #DCE7F0; border-radius:12px; padding:20px;">
                      <span style="font-family:'Segoe UI',Arial,sans-serif; font-size:34px; font-weight:800; letter-spacing:10px; color:#0C628D;">${code}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0; font-family:'Segoe UI',Arial,sans-serif; font-size:13px; line-height:1.6; color:#8090A0;">
                  Demi keamanan, jangan bagikan kode ini kepada siapa pun. Jika Anda tidak meminta kode ini, cukup abaikan email ini.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; border-top:1px solid #EEF2F6; background-color:#FBFCFD;">
                <p style="margin:0; font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#9AA8B6;">
                  &copy; ${new Date().getFullYear()} Edulyfe. Email otomatis, mohon tidak membalas.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
  const text = [
    `Kode verifikasi Edulyfe Anda: ${code}`,
    '',
    'Kode berlaku selama 10 menit.',
    'Jangan bagikan kode ini kepada siapa pun.',
    'Jika Anda tidak meminta kode ini, abaikan email ini.',
  ].join('\n');

  await sendMail(env, { to: userEmail, subject, html, text });
}

module.exports = {
  sendPurchaseNotification,
  sendPurchaseConfirmation,
  sendProgressReport,
  sendWelcomeEmail,
  sendOTP,
};
