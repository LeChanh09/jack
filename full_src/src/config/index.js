require('dotenv').config();

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const bool = (v, def = false) =>
  v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(String(v).trim().toLowerCase());
const num = (v, def) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def);

if (isProd && !env.JWT_SECRET) {
  throw new Error('Thiếu JWT_SECRET trong môi trường production');
}

const config = {
  isProd,
  // Giới hạn số lần gọi theo IP cho đăng nhập, đăng ký, OTP, mở quiz. Chỉ tắt khi thử nghiệm: RATE_LIMIT_ENABLED=false
  rateLimitEnabled: bool(env.RATE_LIMIT_ENABLED, true),
  port: env.PORT || 3000,
  mongoUri: env.MONGO_URI || 'mongodb://127.0.0.1:27017/webtienganh',
  // Các tên miền được phép gọi API từ trình duyệt khi chạy thật (cách nhau bằng dấu phẩy). Để trống = chỉ cùng nguồn.
  corsOrigins: (env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Email được cấp quyền quản trị khi đăng ký (cách nhau bằng dấu phẩy).
  // Khi phát triển, người đăng ký đầu tiên cũng là quản trị viên. Khi chạy thật thì không (xem controllers/auth.js).
  adminEmails: (env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // Khoá ký token. Mặc định chỉ dùng khi phát triển trên máy cá nhân.
  jwtSecret: env.JWT_SECRET || 'dev-secret-change-in-production',
  // Thời gian sống của 1 phiên làm quiz từ vựng (phút)
  quizSessionTtlMinutes: 120,
  // Nguồn audio phát âm (Cambridge, giọng Mỹ)
  audioBaseUrl:
    'https://dictionary.cambridge.org/vi/media/english-chinese-simplified/us_pron',

  // Gửi email qua SMTP (dùng cho mã OTP). Để trống SMTP_HOST thì khi phát triển mã OTP chỉ in ra console.
  mail: {
    host: env.SMTP_HOST || '',
    port: num(env.SMTP_PORT, 587),
    secure: bool(env.SMTP_SECURE), // true khi dùng cổng 465
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || env.SMTP_USER || 'no-reply@localhost',
  },
  // Xác thực email bằng mã OTP khi đăng ký
  otp: {
    enabled: bool(env.OTP_ENABLED),
    ttlMinutes: num(env.OTP_TTL_MINUTES, 10),
    maxAttempts: num(env.OTP_MAX_ATTEMPTS, 5),
    resendSeconds: num(env.OTP_RESEND_SECONDS, 60),
  },
  // Captcha Cloudflare Turnstile ở form đăng ký
  turnstile: {
    enabled: bool(env.TURNSTILE_ENABLED),
    siteKey: env.TURNSTILE_SITE_KEY || '',
    secretKey: env.TURNSTILE_SECRET_KEY || '',
  },
};

if (config.turnstile.enabled && (!config.turnstile.siteKey || !config.turnstile.secretKey)) {
  throw new Error('Bật TURNSTILE_ENABLED thì cần có cả TURNSTILE_SITE_KEY và TURNSTILE_SECRET_KEY');
}
if (config.otp.enabled && isProd && !config.mail.host) {
  throw new Error('Bật OTP_ENABLED ở production thì cần cấu hình SMTP_HOST');
}

module.exports = config;
