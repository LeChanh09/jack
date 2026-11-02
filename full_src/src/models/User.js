const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    nickname: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false }, // hash bcrypt
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    timeActive: { type: Number, default: 0, min: 0 }, // tổng số phút học
    // Streak: ngày học gần nhất theo giờ Việt Nam (YYYY-MM-DD), chuỗi hiện tại và dài nhất
    lastActiveDate: { type: String, default: null },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    // Các ngày đã học (tối đa 400 ngày gần nhất) để vẽ lịch; chỉ lấy khi cần
    activeDays: { type: [String], default: [], select: false },
  },
  { timestamps: { createdAt: 'created', updatedAt: false } }
);

module.exports = mongoose.model('User', userSchema);
