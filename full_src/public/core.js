'use strict';
// Phần lõi dùng chung: tiện ích, trạng thái, đăng nhập, gọi API, phát âm.
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Bỏ dấu tiếng Việt và hạ chữ thường để tìm kiếm không cần gõ dấu ("Gia đình" khớp với "gia dinh")
const fold = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();

// Thông tin đăng nhập do login.js lưu: token, user, nguồn dữ liệu (mock | live) và địa chỉ backend
const Auth = {
  token: () => localStorage.getItem('token'),
  user() {
    try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; }
  },
  mode: () => localStorage.getItem('authMode') || 'mock',
  base: () => localStorage.getItem('authBase') || '',
  setUser: (u) => localStorage.setItem('user', JSON.stringify(u)),
  clear() {
    ['token', 'user', 'authMode', 'authBase'].forEach((k) => localStorage.removeItem(k));
  },
};
const isLive = () => Auth.mode() === 'live';
const isAdmin = () => (Auth.user() || {}).role === 'admin';

// Trạng thái toàn trang
const S = {
  tab: 'reading',
  reading: { topics: [], items: [], topic: '', open: null, edit: false },
  vocab: { topics: [], study: null, editTopic: false, editWord: null },
  quiz: null,
  quizTopic: '',
  streak: null, // { data, y, m }

  // Thêm trạng thái cho ngữ pháp:
  grammar: {
    lessonId: 'lesson-5',
    exCode: '5.1',
    results: {} // Lưu trạng thái làm đúng/sai từng câu { "sentenceId": { correct: true, given: '...' } } 
  }
  };
const actions = {}; // data-act  -> hàm xử lý khi bấm
const forms = {};   // data-form -> hàm xử lý khi gửi form

let _t;
function toast(msg, bad) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('err', !!bad);
  el.classList.add('show');
  clearTimeout(_t);
  _t = setTimeout(() => el.classList.remove('show'), 4000);
}
const run = (fn) => Promise.resolve().then(fn).catch((e) => toast(e.message, true));

// Một cửa duy nhất gọi API: dữ liệu mẫu hoặc backend thật, luôn kèm token
async function api(method, path, body) {
  let status, data;
  try {
    if (isLive()) {
      const headers = {};
      if (body) headers['Content-Type'] = 'application/json';
      if (Auth.token()) headers.Authorization = 'Bearer ' + Auth.token();
      const res = await fetch(Auth.base().replace(/\/+$/, '') + '/api' + path, {
        method, headers, body: body ? JSON.stringify(body) : undefined,
      });
      status = res.status;
      data = status === 204 ? null : await res.json().catch(() => null);
    } else {
      ({ status, data } = mockApi(method, path, body, Auth.token()));
    }
  } catch (e) {
    throw new Error('Không kết nối được backend. Kiểm tra server đang chạy rồi đăng nhập lại.');
  }
  if (status === 401) {
    Auth.clear();
    location.href = 'login.html';
    throw new Error('Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');
  }
  if (status >= 400) throw new Error((data && data.error) || 'Lỗi ' + status);
  return data;
}

// Cập nhật số chuỗi ngày ở đầu trang và trong bộ nhớ khi server trả về thông tin streak
function showStreak(s) {
  if (!s || typeof s.currentStreak !== 'number') return;
  const u = Auth.user();
  if (u) {
    u.currentStreak = s.currentStreak;
    u.longestStreak = s.longestStreak;
    Auth.setUser(u);
  }
  const el = $('#streak-count');
  if (el) el.textContent = s.currentStreak;
  if (s.alreadyPinged === false) toast(`Chuỗi ngày học: ${s.currentStreak} ngày liên tiếp`);
}

// Phát âm: dùng audio Cambridge khi chạy backend thật, không có thì đọc bằng giọng trình duyệt
function speak(word, url) {
  const fallback = () => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  if (!url || !isLive()) return fallback();
  new Audio(url).play().catch(fallback);
}
const SPK = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
const speakBtn = (word, audio) =>
  `<button class="icon" data-act="speak" data-word="${esc(word)}" data-audio="${esc(audio || '')}" aria-label="Nghe phát âm từ ${esc(word)}">${SPK}</button>`;
actions.speak = (el) => speak(el.dataset.word, el.dataset.audio);
