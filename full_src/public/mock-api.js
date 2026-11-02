'use strict';
// Backend giả chạy trong trình duyệt: cùng đường dẫn, cùng hình dạng JSON, cùng mã lỗi với backend thật.
// Mỗi file mock-*.js đăng ký một handler vào MOCK_HANDLERS. Handler trả { status, data },
// hoặc trả undefined nếu request không thuộc về nó.
let _n = 100;
const uid = () => 'm' + ++_n;
const MOCK = { ...buildSeed(), quiz: {}, sessions: {}, users: [] };
const MOCK_HANDLERS = [];

// Ngày theo giờ Việt Nam (YYYY-MM-DD), giống utils/date.js của backend
const _vnFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
});
const vnDate = (d = new Date()) => _vnFmt.format(d);
const vnYesterday = () => vnDate(new Date(Date.now() - 86400000));

const audioOf = (w) => {
  const s = w.trim().toLowerCase().replace(/\s+/g, '_');
  if (!/^[a-z_-]+$/.test(s)) return null;
  return `https://dictionary.cambridge.org/vi/media/english-chinese-simplified/us_pron/${s[0]}/${s.slice(0, 3).padEnd(3, '_')}/${s}/${s}.mp3`;
};
const norm = (x) => x.trim().toLowerCase().replace(/\s+/g, ' ');
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function mockApi(method, path, body, token) {
  const [p, qs] = path.split('?');
  const c = {
    method,
    key: method + ' ' + p,
    q: new URLSearchParams(qs || ''),
    body: body || {},
    user: mockUserFromToken(token), // định nghĩa trong mock-auth.js
    m: null,
    ok: (data, status = 200) => ({ status, data }),
    err: (status, error) => ({ status, data: { error } }),
    str: (v) => (typeof v === 'string' ? v.trim() : ''),
  };
  c.need = (v, f) => (c.str(v) ? null : c.err(400, f + ' là bắt buộc'));
  c.is = (re) => (c.m = c.key.match(re));
  // Giống middleware adminRequired: 401 nếu chưa đăng nhập, 403 nếu không phải quản trị viên
  c.admin = () => {
    if (!c.user) return c.err(401, 'Chưa đăng nhập');
    if (c.user.role !== 'admin') return c.err(403, 'Chỉ quản trị viên được thực hiện thao tác này');
    return null;
  };
  c.auth = () => (c.user ? null : c.err(401, 'Chưa đăng nhập'));
  for (const h of MOCK_HANDLERS) {
    const r = h(c);
    if (r) return r;
  }
  return c.err(404, 'Route không tồn tại');
}
