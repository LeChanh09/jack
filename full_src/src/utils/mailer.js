const config = require('../config');

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let transport;
function getTransport() {
  if (!transport) {
    // Nạp khi cần để server vẫn chạy được lúc OTP tắt, kể cả khi chưa cài nodemailer
    const nodemailer = require('nodemailer');
    const { host, port, secure, user, pass } = config.mail;
    transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
  }
  return transport;
}

// Gửi mã OTP. Chưa cấu hình SMTP_HOST thì khi phát triển chỉ in mã ra console (production thì báo lỗi).
async function sendOtpMail({ to, nickname, code }) {
  const { mail, otp, isProd } = config;
  if (!mail.host) {
    if (isProd) throw new Error('Chưa cấu hình SMTP_HOST');
    console.log(`[DEV] Chưa cấu hình SMTP nên không gửi email. Mã OTP của ${to} là: ${code}`);
    return;
  }
  const text =
    `Chào ${nickname},\n\nMã xác thực tài khoản Vở tiếng Anh của bạn là: ${code}\n` +
    `Mã có hiệu lực trong ${otp.ttlMinutes} phút. Nếu bạn không đăng ký, hãy bỏ qua email này.`;
  const html =
    `<div style="font-family:Segoe UI,Arial,sans-serif;color:#17233f;max-width:420px">` +
    `<p>Chào ${esc(nickname)},</p><p>Mã xác thực tài khoản Vở tiếng Anh của bạn là:</p>` +
    `<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:12px 0">${esc(code)}</p>` +
    `<p>Mã có hiệu lực trong ${otp.ttlMinutes} phút. Nếu bạn không đăng ký, hãy bỏ qua email này.</p></div>`;
  await getTransport().sendMail({
    from: mail.from,
    to,
    subject: 'Mã xác thực tài khoản Vở tiếng Anh',
    text,
    html,
  });
}

module.exports = { sendOtpMail };
