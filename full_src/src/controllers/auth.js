const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { requireString } = require('../utils/validate');
const { effectiveStreak } = require('../utils/streak');
const { makeOtp, hashOtp, safeEqual } = require('../utils/otp');
const { sendOtpMail } = require('../utils/mailer');
const { verifyTurnstile } = require('../utils/turnstile');
const config = require('../config');

const MAX_SENDS = 5; // tối đa số lần gửi mã cho một lượt đăng ký

const sign = (user) =>
  jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '30d' });

const publicUser = (user) => ({
  id: user._id,
  nickname: user.nickname,
  email: user.email,
  role: user.role,
  ...effectiveStreak(user),
});

// GET /api/auth/config  -> frontend biết có cần hiện ô captcha / bước nhập OTP không
exports.publicConfig = (req, res) => {
  res.json({
    otpEnabled: config.otp.enabled,
    otpTtlMinutes: config.otp.ttlMinutes,
    otpResendSeconds: config.otp.resendSeconds,
    turnstileEnabled: config.turnstile.enabled,
    turnstileSiteKey: config.turnstile.enabled ? config.turnstile.siteKey : '',
  });
};

// Tạo tài khoản thật. Người đăng ký đầu tiên hoặc email trong ADMIN_EMAILS là quản trị viên.
async function createUser({ nickname, email, passwordHash }) {
  // Khi chạy thật không cho "người đăng ký đầu tiên" thành quản trị viên, vì ai vào trước cũng chiếm được quyền.
  // Email trong ADMIN_EMAILS chỉ được cấp quyền khi bật OTP, tức là người đăng ký đã chứng minh sở hữu email đó.
  const firstUserIsAdmin = !config.isProd && (await User.estimatedDocumentCount()) === 0;
  const listed = config.adminEmails.includes(email) && (!config.isProd || config.otp.enabled);
  const role = firstUserIsAdmin || listed ? 'admin' : 'user';
  return User.create({ nickname, email, password: passwordHash, role });
}

function readEmail(body) {
  const email = requireString(body.email, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'Email không hợp lệ');
  }
  return email;
}

// Sinh mã mới, lưu bản băm, gửi email. Gửi lỗi thì trả về false để bên gọi dọn dẹp.
async function issueOtp(email, nickname) {
  const code = makeOtp();
  const now = new Date();
  try {
    await sendOtpMail({ to: email, nickname, code });
  } catch (e) {
    console.error('Gửi email OTP lỗi:', e.message);
    return null;
  }
  return {
    otpHash: hashOtp(email, code),
    lastSentAt: now,
    expiresAt: new Date(now.getTime() + config.otp.ttlMinutes * 60000),
  };
}

const waitSeconds = (p) =>
  Math.ceil((config.otp.resendSeconds * 1000 - (Date.now() - p.lastSentAt.getTime())) / 1000);

// POST /api/auth/register  { nickname, email, password, turnstileToken? }
// Tắt OTP: tạo tài khoản và trả token ngay. Bật OTP: gửi mã về email, trả 202 và chờ /verify-otp.
exports.register = asyncHandler(async (req, res) => {
  const nickname = requireString(req.body.nickname, 'nickname');
  const email = readEmail(req.body);
  const password = requireString(req.body.password, 'password');

  if (password.length < 6) {
    throw new HttpError(400, 'Mật khẩu phải có ít nhất 6 ký tự');
  }
  // bcrypt chỉ dùng 72 byte đầu, nên chặn mật khẩu dài hơn để không bị cắt âm thầm
  if (Buffer.byteLength(password) > 72) {
    throw new HttpError(400, 'Mật khẩu tối đa 72 ký tự');
  }

  // Captcha trước mọi việc tốn tài nguyên (hash mật khẩu, gửi email)
  await verifyTurnstile(req.body.turnstileToken, req.ip);

  if (await User.exists({ email })) {
    throw new HttpError(409, 'Email đã được đăng ký');
  }
  const passwordHash = await bcrypt.hash(password, 10);

  if (!config.otp.enabled) {
    const user = await createUser({ nickname, email, passwordHash });
    return res.status(201).json({ token: sign(user), user: publicUser(user) });
  }

  // Đang có lượt đăng ký chờ xác thực cho email này thì KHÔNG ghi đè nhân danh người khác:
  // nếu cho ghi đè, kẻ lạ có thể đặt mật khẩu của họ rồi người thật nhập mã vừa nhận sẽ tạo ra
  // tài khoản mang mật khẩu của kẻ đó. Người đăng ký thật dùng "Gửi lại mã" hoặc chờ hết hạn.
  const existing = await PendingRegistration.findOne({ email });
  if (existing && existing.expiresAt.getTime() > Date.now()) {
    const mins = Math.max(1, Math.ceil((existing.expiresAt.getTime() - Date.now()) / 60000));
    throw new HttpError(
      409,
      `Email này đang chờ xác thực. Hãy kiểm tra hộp thư để lấy mã, hoặc thử đăng ký lại sau ${mins} phút`
    );
  }
  if (existing) await PendingRegistration.deleteOne({ _id: existing._id });

  const sent = await issueOtp(email, nickname);
  if (!sent) {
    throw new HttpError(502, 'Không gửi được email xác thực. Kiểm tra địa chỉ email hoặc thử lại sau');
  }
  // Hai request đăng ký cùng lúc: index duy nhất theo email khiến request đến sau bị từ chối (409)
  await PendingRegistration.create({ email, nickname, passwordHash, sends: 1, ...sent });
  res.status(202).json({
    otpRequired: true,
    email,
    expiresInMinutes: config.otp.ttlMinutes,
    resendSeconds: config.otp.resendSeconds,
  });
});

// POST /api/auth/verify-otp  { email, code }
exports.verifyOtp = asyncHandler(async (req, res) => {
  if (!config.otp.enabled) throw new HttpError(400, 'Xác thực OTP đang tắt');
  const email = readEmail(req.body);
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'Mã gồm 6 chữ số');

  const bad = () => new HttpError(400, 'Mã không đúng hoặc đã hết hạn. Hãy gửi lại mã mới');

  // Tăng số lần thử trước khi so sánh, và chỉ khi còn lượt: nhiều request song song cũng không vượt giới hạn
  const p = await PendingRegistration.findOneAndUpdate(
    { email, attempts: { $lt: config.otp.maxAttempts } },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (!p) {
    if (await PendingRegistration.exists({ email })) {
      await PendingRegistration.deleteOne({ email });
      throw new HttpError(429, 'Nhập sai quá nhiều lần. Hãy đăng ký lại');
    }
    throw bad();
  }
  if (p.expiresAt.getTime() < Date.now()) {
    await PendingRegistration.deleteOne({ _id: p._id });
    throw bad();
  }
  if (!safeEqual(hashOtp(email, code), p.otpHash)) {
    const left = config.otp.maxAttempts - p.attempts;
    throw new HttpError(400, left > 0 ? `Mã không đúng. Còn ${left} lần thử` : 'Mã không đúng. Hãy đăng ký lại');
  }

  // Xoá bản ghi chờ nguyên tử: chỉ một request được phép tạo tài khoản
  const taken = await PendingRegistration.findOneAndDelete({ _id: p._id });
  if (!taken) throw bad();
  const user = await createUser({ nickname: p.nickname, email, passwordHash: p.passwordHash });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

// POST /api/auth/resend-otp  { email }
exports.resendOtp = asyncHandler(async (req, res) => {
  if (!config.otp.enabled) throw new HttpError(400, 'Xác thực OTP đang tắt');
  const email = readEmail(req.body);
  const p = await PendingRegistration.findOne({ email });
  if (!p) throw new HttpError(404, 'Không tìm thấy đăng ký đang chờ. Hãy đăng ký lại');
  if (p.sends >= MAX_SENDS) {
    throw new HttpError(429, 'Đã gửi mã quá nhiều lần cho email này, hãy thử lại sau ít phút');
  }
  if (waitSeconds(p) > 0) {
    throw new HttpError(429, `Hãy đợi ${waitSeconds(p)} giây rồi gửi lại`);
  }
  const sent = await issueOtp(email, p.nickname);
  if (!sent) throw new HttpError(502, 'Không gửi được email. Hãy thử lại sau');
  await PendingRegistration.updateOne(
    { _id: p._id },
    { $set: { attempts: 0, ...sent }, $inc: { sends: 1 } }
  );
  res.json({
    otpRequired: true,
    email,
    expiresInMinutes: config.otp.ttlMinutes,
    resendSeconds: config.otp.resendSeconds,
  });
});

// POST /api/auth/login  { email, password }
exports.login = asyncHandler(async (req, res) => {
  const email = requireString(req.body.email, 'email').toLowerCase();
  const password = requireString(req.body.password, 'password');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'Email hoặc mật khẩu không đúng');
  }
  res.json({ token: sign(user), user: publicUser(user) });
});

// GET /api/auth/me  (header Authorization: Bearer <token>)
exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, 'Tài khoản không còn tồn tại');
  res.json({ ...publicUser(user), timeActive: user.timeActive });
});
