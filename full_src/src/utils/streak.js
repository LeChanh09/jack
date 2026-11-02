const User = require('../models/User');
const { vnDate, vnYesterday } = require('./date');

// Chuỗi chỉ còn hiệu lực nếu lần học gần nhất là hôm nay hoặc hôm qua
function effectiveStreak(user) {
  const last = user.lastActiveDate;
  const alive = last === vnDate() || last === vnYesterday();
  return {
    currentStreak: alive ? user.currentStreak : 0,
    longestStreak: user.longestStreak,
  };
}

// Ghi nhận user đã học hôm nay (đọc bài hoặc xong quiz). Gọi nhiều lần trong ngày vẫn chỉ tính 1.
// Điều kiện lastActiveDate trong updateOne chặn hai request song song cùng cộng chuỗi.
async function touchStreak(userId) {
  const today = vnDate();
  for (let i = 0; i < 3; i += 1) {
    const user = await User.findById(userId).select(
      'lastActiveDate currentStreak longestStreak'
    );
    if (!user) return null;
    if (user.lastActiveDate === today) {
      return { ...effectiveStreak(user), alreadyPinged: true };
    }

    const current =
      user.lastActiveDate === vnYesterday() ? user.currentStreak + 1 : 1;
    const longest = Math.max(user.longestStreak, current);

    const res = await User.updateOne(
      { _id: userId, lastActiveDate: user.lastActiveDate },
      {
        $set: {
          lastActiveDate: today,
          currentStreak: current,
          longestStreak: longest,
        },
        $push: { activeDays: { $each: [today], $slice: -400 } },
      }
    );
    if (res.modifiedCount === 1) {
      return { currentStreak: current, longestStreak: longest, alreadyPinged: false };
    }
  }
  const user = await User.findById(userId).select(
    'lastActiveDate currentStreak longestStreak'
  );
  return user ? { ...effectiveStreak(user), alreadyPinged: true } : null;
}

module.exports = { effectiveStreak, touchStreak };
