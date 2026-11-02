const crypto = require('crypto');
const config = require('../config');

// Mã 6 chữ số sinh bằng bộ sinh số ngẫu nhiên mật mã
const makeOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

// Chỉ lưu bản băm (HMAC có khoá bí mật + email) nên lộ database cũng không đọc được mã
const hashOtp = (email, code) =>
  crypto.createHmac('sha256', config.jwtSecret).update(`${email}:${code}`).digest('hex');

// So sánh thời gian không đổi để tránh dò mã qua chênh lệch thời gian phản hồi
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = { makeOtp, hashOtp, safeEqual };
