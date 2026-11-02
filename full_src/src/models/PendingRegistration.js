const mongoose = require('mongoose');

// Đăng ký đang chờ xác thực OTP. Chỉ khi nhập đúng mã mới tạo User thật.
// Mật khẩu và mã OTP đều chỉ lưu dạng băm.
const pendingSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  nickname: { type: String, required: true, trim: true, maxlength: 50 },
  passwordHash: { type: String, required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 }, // số lần đã nhập mã cho mã hiện tại
  sends: { type: Number, default: 1 }, // tổng số lần đã gửi mã (chống gửi email liên tục)
  lastSentAt: { type: Date, required: true },
  // MongoDB tự xoá bản ghi hết hạn (TTL index, có thể trễ tới khoảng 1 phút)
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

module.exports = mongoose.model('PendingRegistration', pendingSchema);
