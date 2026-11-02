const RateLimit = require('../models/RateLimit');
const HttpError = require('../utils/httpError');
const config = require('../config');

// Giới hạn số lần gọi theo IP trong một khung thời gian cố định.
// Khung cố định nên ngay chỗ giao hai khung, một IP có thể gọi tối đa khoảng gấp đôi giới hạn: chấp nhận được cho mục đích chống dò mật khẩu và gửi email hàng loạt.
function rateLimit({ name, windowSec, max, message }) {
  return async (req, res, next) => {
    if (!config.rateLimitEnabled) return next();
    try {
      const windowMs = windowSec * 1000;
      const bucket = Math.floor(Date.now() / windowMs);
      const filter = { key: `${name}:${req.ip}:${bucket}` };
      const update = {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 2) * windowMs) },
      };
      let doc;
      try {
        doc = await RateLimit.findOneAndUpdate(filter, update, { upsert: true, new: true }).lean();
      } catch (e) {
        if (e.code !== 11000) throw e;
        // Hai request cùng lúc cùng tạo bản ghi đầu tiên: thử lại một lần, lần này bản ghi đã tồn tại
        doc = await RateLimit.findOneAndUpdate(filter, update, { upsert: true, new: true }).lean();
      }
      if (doc.count > max) {
        const retry = Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000);
        res.setHeader('Retry-After', String(retry));
        return next(new HttpError(429, message || `Thao tác quá nhanh, hãy thử lại sau ${retry} giây`));
      }
      return next();
    } catch (e) {
      return next(e);
    }
  };
}

module.exports = { rateLimit };
