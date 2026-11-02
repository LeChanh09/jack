'use strict';
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let view = 'login'; // 'login' | 'register' | 'otp'
const served = /^https?:$/.test(location.protocol); // mở qua Express thì có backend thật cùng nguồn

// Cấu hình bật/tắt do server quyết định (GET /api/auth/config). Dữ liệu mẫu thì luôn tắt.
const OFF = { otpEnabled: false, turnstileEnabled: false, turnstileSiteKey: '', otpTtlMinutes: 10, otpResendSeconds: 60 };
let cfg = { ...OFF };
let pending = null; // { email, expiresInMinutes } khi đang chờ nhập mã OTP
let tsId = null;    // id widget Turnstile đang hiển thị
let tsToken = '';   // token Turnstile hiện tại (dùng được một lần)
let timer = null;   // bộ đếm ngược nút "Gửi lại mã"

let _t;
function toast(msg, bad) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('err', !!bad);
  el.classList.add('show');
  clearTimeout(_t);
  _t = setTimeout(() => el.classList.remove('show'), 4500);
}

// Mở qua web hoặc server thì dùng backend cùng địa chỉ; mở file trực tiếp thì dùng dữ liệu mẫu trong trình duyệt
const mode = () => (served ? 'live' : 'mock');
const base = () => (served ? location.origin : '');

// Gọi auth ở nguồn đang chọn (dữ liệu mẫu hoặc backend thật)
async function authApi(method, path, body) {
  let status, data;
  if (mode() === 'live') {
    try {
      const res = await fetch(base() + '/api' + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      status = res.status;
      data = await res.json().catch(() => null);
    } catch (e) {
      throw new Error('Không kết nối được backend. Kiểm tra server đang chạy và địa chỉ ở mục Nguồn dữ liệu.');
    }
  } else {
    ({ status, data } = mockApi(method, path, body, null));
  }
  if (status >= 400) throw new Error((data && data.error) || 'Lỗi ' + status);
  return { status, data };
}

async function loadConfig() {
  cfg = { ...OFF };
  if (mode() === 'live') {
    try {
      cfg = { ...OFF, ...(await authApi('GET', '/auth/config')).data };
    } catch (e) {
      toast(e.message, true);
    }
  }
}

// ---- Turnstile ----
let tsScript;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!tsScript) {
    tsScript = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => { tsScript = null; reject(new Error('Không tải được khung xác minh Turnstile. Kiểm tra kết nối mạng.')); };
      document.head.appendChild(s);
    });
  }
  return tsScript;
}
function dropTurnstile() {
  if (tsId !== null && window.turnstile) { try { window.turnstile.remove(tsId); } catch (e) { /* đã gỡ */ } }
  tsId = null;
  tsToken = '';
}
function showTurnstile() {
  const box = $('#ts');
  if (!box) return;
  loadTurnstile().then(() => {
    if (!box.isConnected) return; // người dùng đã chuyển màn hình
    tsId = window.turnstile.render(box, {
      sitekey: cfg.turnstileSiteKey,
      callback: (token) => { tsToken = token; },
      'expired-callback': () => { tsToken = ''; },
      'error-callback': () => { tsToken = ''; },
    });
  }).catch((e) => toast(e.message, true));
}
const resetTurnstile = () => { tsToken = ''; if (tsId !== null && window.turnstile) window.turnstile.reset(tsId); };

// ---- Giao diện ----
function startCountdown(seconds) {
  clearInterval(timer);
  let left = seconds;
  const tick = () => {
    const b = $('#resend');
    if (!b) { clearInterval(timer); return; }
    b.disabled = left > 0;
    b.textContent = left > 0 ? `Gửi lại mã sau ${left} giây` : 'Gửi lại mã';
    left -= 1;
    if (left < -1) clearInterval(timer);
  };
  tick();
  timer = setInterval(tick, 1000);
}

function paint() {
  clearInterval(timer);
  dropTurnstile();
  const lead = $('#lead');

  if (view === 'otp') {
    lead.textContent = 'Xác thực email';
    $('#view').innerHTML = `<form class="stack" id="form" novalidate>
        <p class="note">Mã gồm 6 chữ số đã được gửi tới <b>${esc(pending.email)}</b>. Mã có hiệu lực trong ${esc(pending.expiresInMinutes)} phút. Nếu không thấy, hãy xem cả thư rác.</p>
        <label for="code">Mã xác thực</label>
        <input id="code" class="otp" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" required>
        <button class="btn" type="submit">Xác nhận</button>
      </form>
      <p class="foot"><button class="link" id="resend" type="button"></button>
      <button class="link" id="back" type="button">Đổi email</button></p>`;
    $('#code').focus();
    startCountdown(cfg.otpResendSeconds);
    return;
  }

  const login = view === 'login';
  lead.textContent = login ? 'Đăng nhập để tiếp tục học' : 'Tạo tài khoản để lưu điểm và chuỗi ngày học';
  const demo = mode() === 'mock' && login
    ? `<p class="hint">Tài khoản demo: <code>${DEMO_ACCOUNT.email}</code> / <code>${DEMO_ACCOUNT.password}</code>
        <button type="button" class="link" id="fill-demo">Điền sẵn</button></p>` : '';
  const captcha = !login && cfg.turnstileEnabled ? '<div id="ts" class="ts" aria-label="Xác minh không phải người máy"></div>' : '';
  $('#view').innerHTML = `<form class="stack" id="form" novalidate>
      ${login ? '' : '<label>Biệt danh<input name="nickname" autocomplete="nickname" required maxlength="50"></label>'}
      <label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label>Mật khẩu<input name="password" type="password" autocomplete="${login ? 'current-password' : 'new-password'}" required${login ? '' : ' minlength="6" maxlength="72"'}></label>
      ${captcha}
      <button class="btn" type="submit">${login ? 'Đăng nhập' : 'Đăng ký'}</button>
    </form>${demo}
    <p class="foot">${login ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
      <button class="link" id="switch" type="button">${login ? 'Đăng ký' : 'Đăng nhập'}</button></p>`;
  const first = $('#form input');
  if (first) first.focus();
  if (captcha) showTurnstile();
}

function finish(r) {
  localStorage.setItem('token', r.token);
  localStorage.setItem('user', JSON.stringify(r.user));
  localStorage.setItem('authMode', mode());
  localStorage.setItem('authBase', mode() === 'live' ? base() : '');
  location.href = 'index.html';
}

document.addEventListener('click', async (e) => {
  const id = e.target.id;
  if (id === 'switch') {
    view = view === 'login' ? 'register' : 'login';
    paint();
  } else if (id === 'fill-demo') {
    $('#form [name=email]').value = DEMO_ACCOUNT.email;
    $('#form [name=password]').value = DEMO_ACCOUNT.password;
  } else if (id === 'back') {
    pending = null;
    view = 'register';
    paint();
  } else if (id === 'resend') {
    const b = e.target;
    b.disabled = true;
    try {
      const r = (await authApi('POST', '/auth/resend-otp', { email: pending.email })).data;
      pending.expiresInMinutes = r.expiresInMinutes;
      toast('Đã gửi lại mã, hãy kiểm tra email');
      startCountdown(r.resendSeconds || cfg.otpResendSeconds);
    } catch (err) {
      toast(err.message, true);
      startCountdown(5);
    }
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form') return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('button[type=submit]');

  if (view === 'otp') {
    if (!/^\d{6}$/.test(String(d.code || '').trim())) { toast('Mã gồm đúng 6 chữ số', true); return; }
    btn.disabled = true;
    try {
      finish((await authApi('POST', '/auth/verify-otp', { email: pending.email, code: d.code.trim() })).data);
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
    }
    return;
  }

  if (!String(d.email || '').trim() || !String(d.password || '')) {
    toast('Hãy nhập email và mật khẩu', true);
    return;
  }
  const register = view === 'register';
  if (register && cfg.turnstileEnabled && !tsToken) {
    toast('Hãy hoàn thành bước xác minh "Tôi không phải người máy"', true);
    return;
  }
  btn.disabled = true;
  try {
    const body = register && cfg.turnstileEnabled ? { ...d, turnstileToken: tsToken } : d;
    const { status, data } = await authApi('POST', register ? '/auth/register' : '/auth/login', body);
    if (register && status === 202 && data.otpRequired) {
      pending = { email: data.email, expiresInMinutes: data.expiresInMinutes };
      cfg.otpResendSeconds = data.resendSeconds || cfg.otpResendSeconds;
      view = 'otp';
      paint();
      toast('Đã gửi mã xác thực tới email của bạn');
      return;
    }
    finish(data);
  } catch (err) {
    toast(err.message, true);
    if (register && cfg.turnstileEnabled) resetTurnstile(); // token chỉ dùng được một lần
    btn.disabled = false;
  }
});

// Đã đăng nhập thì vào thẳng app
if (localStorage.getItem('token') && localStorage.getItem('user')) {
  location.href = 'index.html';
} else {
  loadConfig().then(paint);
}
