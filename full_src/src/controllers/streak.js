const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { vnDate } = require('../utils/date');
const { effectiveStreak, touchStreak } = require('../utils/streak');

// GET /api/streak  -> dữ liệu cho trang theo dõi chuỗi ngày
exports.getStreak = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('+activeDays');
  if (!user) throw new HttpError(404, 'Không tìm thấy user');

  const today = vnDate();
  res.json({
    today,
    ...effectiveStreak(user),
    lastActiveDate: user.lastActiveDate,
    todayDone: user.lastActiveDate === today,
    activeDays: user.activeDays,
  });
});

// POST /api/streak/ping  (ghi nhận thủ công; quiz và đọc bài đã tự gọi ở server)
exports.ping = asyncHandler(async (req, res) => {
  const streak = await touchStreak(req.userId);
  if (!streak) throw new HttpError(404, 'Không tìm thấy user');
  res.json(streak);
});
