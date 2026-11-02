const mongoose = require('mongoose');

// Bộ đếm số lần gọi theo (tên giới hạn, IP, khung thời gian). Lưu trong MongoDB vì trên Vercel
// các lần gọi chạy ở nhiều instance khác nhau, bộ đếm trong bộ nhớ sẽ không dùng chung được.
const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  // MongoDB tự xoá bản ghi hết hạn (TTL index, có thể trễ tới khoảng 1 phút)
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

module.exports = mongoose.model('RateLimit', rateLimitSchema);
