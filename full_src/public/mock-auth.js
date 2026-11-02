'use strict';
// Đăng nhập và streak giả. Người dùng giả lưu trong localStorage (khóa mockUsers) để còn nguyên
// khi chuyển giữa login.html và index.html. Chỉ dùng để demo: mật khẩu băm kiểu đơn giản, KHÔNG an toàn.
const DEMO_ACCOUNT = { email: 'demo@example.com', password: 'demo123' };

function mockHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return 'h' + h.toString(36);
}
const dayOffset = (n) => vnDate(new Date(Date.now() - n * 86400000));

function seedDemoUser() {
  // Quá khứ có sẵn: chuỗi dài 14 ngày, nghỉ 2 ngày, rồi chuỗi hiện tại 9 ngày (đến hôm qua)
  const days = [];
  for (let i = 25; i >= 12; i--) days.push(dayOffset(i));
  for (let i = 9; i >= 1; i--) days.push(dayOffset(i));
  return {
    _id: 'u1', nickname: 'Học viên demo', email: DEMO_ACCOUNT.email, pass: mockHash(DEMO_ACCOUNT.password),
    role: 'admin', timeActive: 0, lastActiveDate: dayOffset(1), currentStreak: 9, longestStreak: 14, activeDays: days,
  };
}
function loadUsers() {
  try {
    const raw = localStorage.getItem('mockUsers');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* dữ liệu hỏng thì tạo lại */ }
  const users = [seedDemoUser()];
  localStorage.setItem('mockUsers', JSON.stringify(users));
  return users;
}
const saveUsers = (users) => localStorage.setItem('mockUsers', JSON.stringify(users));

function mockUserFromToken(token) {
  if (!token || !token.startsWith('mock.')) return null;
  return loadUsers().find((u) => u._id === token.slice(5)) || null;
}

// Giống utils/streak.js: chuỗi chỉ còn hiệu lực nếu lần học gần nhất là hôm nay hoặc hôm qua
function mockEffective(u) {
  const alive = u.lastActiveDate === vnDate() || u.lastActiveDate === vnYesterday();
  return { currentStreak: alive ? u.currentStreak : 0, longestStreak: u.longestStreak };
}
function mockTouch(userId) {
  const users = loadUsers();
  const u = users.find((x) => x._id === userId);
  if (!u) return null;
  const today = vnDate();
  if (u.lastActiveDate === today) return { ...mockEffective(u), alreadyPinged: true };
  u.currentStreak = u.lastActiveDate === vnYesterday() ? u.currentStreak + 1 : 1;
  u.longestStreak = Math.max(u.longestStreak, u.currentStreak);
  u.lastActiveDate = today;
  u.activeDays = [...u.activeDays, today].slice(-400);
  saveUsers(users);
  return { currentStreak: u.currentStreak, longestStreak: u.longestStreak, alreadyPinged: false };
}
const mockPublicUser = (u) => ({ id: u._id, nickname: u.nickname, email: u.email, role: u.role, ...mockEffective(u) });

MOCK_HANDLERS.push((c) => {
  // Dữ liệu mẫu không gửi email thật và không có server kiểm tra captcha nên luôn tắt cả hai
  if (c.key === 'GET /auth/config') {
    return c.ok({ otpEnabled: false, turnstileEnabled: false, turnstileSiteKey: '', otpTtlMinutes: 10, otpResendSeconds: 60 });
  }
  if (c.key === 'POST /auth/register') {
    const nickname = c.str(c.body.nickname);
    const email = c.str(c.body.email).toLowerCase();
    const password = typeof c.body.password === 'string' ? c.body.password.trim() : '';
    const e = c.need(nickname, 'nickname') || c.need(email, 'email') || c.need(password, 'password');
    if (e) return e;
    if (password.length < 6) return c.err(400, 'Mật khẩu phải có ít nhất 6 ký tự');
    if (new TextEncoder().encode(password).length > 72) return c.err(400, 'Mật khẩu tối đa 72 ký tự');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.err(400, 'Email không hợp lệ');
    const users = loadUsers();
    if (users.some((u) => u.email === email)) return c.err(409, 'Email đã được đăng ký');
    const u = {
      _id: 'u' + (Date.now().toString(36)), nickname: nickname.slice(0, 50), email, pass: mockHash(password),
      role: users.length === 0 ? 'admin' : 'user', timeActive: 0,
      lastActiveDate: null, currentStreak: 0, longestStreak: 0, activeDays: [],
    };
    users.push(u);
    saveUsers(users);
    return c.ok({ token: 'mock.' + u._id, user: mockPublicUser(u) }, 201);
  }
  if (c.key === 'POST /auth/login') {
    const email = c.str(c.body.email).toLowerCase();
    const password = typeof c.body.password === 'string' ? c.body.password.trim() : '';
    const e = c.need(email, 'email') || c.need(password, 'password');
    if (e) return e;
    const u = loadUsers().find((x) => x.email === email);
    if (!u || u.pass !== mockHash(password)) return c.err(401, 'Email hoặc mật khẩu không đúng');
    return c.ok({ token: 'mock.' + u._id, user: mockPublicUser(u) });
  }
  if (c.key === 'GET /auth/me') {
    const e = c.auth(); if (e) return e;
    return c.ok({ ...mockPublicUser(c.user), timeActive: c.user.timeActive });
  }
  if (c.key === 'GET /streak') {
    const e = c.auth(); if (e) return e;
    const u = c.user;
    return c.ok({
      today: vnDate(), ...mockEffective(u), lastActiveDate: u.lastActiveDate,
      todayDone: u.lastActiveDate === vnDate(), activeDays: u.activeDays,
    });
  }
  if (c.key === 'POST /streak/ping') {
    const e = c.auth(); if (e) return e;
    return c.ok(mockTouch(c.user._id));
  }
  return undefined;
});
