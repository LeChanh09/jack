const config = require('../config');
const HttpError = require('./httpError');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Kiểm tra token Turnstile ở server. Tắt TURNSTILE_ENABLED thì bỏ qua.
// Token chỉ dùng được một lần và hết hạn sau vài phút, nên luôn phải xác minh ở đây, không tin client.
async function verifyTurnstile(token, ip) {
  const t = config.turnstile;
  if (!t.enabled) return;
  if (typeof token !== 'string' || !token || token.length > 2048) {
    throw new HttpError(400, 'Hãy hoàn thành bước xác minh "Tôi không phải người máy"');
  }
  let data;
  try {
    const body = new URLSearchParams({ secret: t.secretKey, response: token });
    if (ip) body.set('remoteip', ip);
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    data = await res.json();
  } catch (e) {
    // Không liên lạc được Cloudflare thì từ chối (fail closed), không cho qua
    throw new HttpError(503, 'Không kết nối được dịch vụ xác minh, hãy thử lại sau');
  }
  if (!data || data.success !== true) {
    throw new HttpError(400, 'Xác minh không thành công, hãy thử lại');
  }
}

module.exports = { verifyTurnstile };
