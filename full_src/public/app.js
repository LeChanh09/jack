'use strict';
// Điều phối trang: vẽ giao diện, chuyển tab, xử lý bấm nút / gửi form, khởi động.
function render() {
  document.querySelectorAll('.tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === S.tab));
  const views = { reading: readingView, vocab: vocabView,grammar: grammarView, quiz: quizView, streak: streakView };
  $('#view').innerHTML = views[S.tab]();
  syncHash();
  const f = $('[data-autofocus]');
  if (f) f.focus();
}

// Ghi vị trí hiện tại lên địa chỉ trang (phần sau dấu #) để tải lại trang vẫn đứng đúng chỗ.
// Ví dụ: #reading?t=<chủ đề>&id=<bài đang đọc>, #vocab?id=<topic đang mở>, #streak
// Dùng replaceState nên không tạo thêm mục trong lịch sử trình duyệt.
const TABS = ['reading', 'vocab','grammar', 'quiz', 'streak'];
function hashFor() {
  const p = new URLSearchParams();
  if (S.tab === 'reading') {
    if (S.reading.topic) p.set('t', S.reading.topic);
    if (S.reading.open) p.set('id', S.reading.open.reading._id);
  } else if (S.tab === 'vocab' && S.vocab.study) {
    p.set('id', S.vocab.study._id);
  }
  const q = p.toString();
  return '#' + S.tab + (q ? '?' + q : '');
}
function syncHash() {
  const h = hashFor();
  if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);
}
function readHash() {
  const [name, qs] = location.hash.slice(1).split('?');
  const p = new URLSearchParams(qs || '');
  const clean = (v) => (/^[\w-]{1,40}$/.test(v || '') ? v : ''); // chỉ nhận ký tự an toàn, bỏ giá trị lạ
  return { tab: TABS.includes(name) ? name : 'reading', t: clean(p.get('t')), id: clean(p.get('id')) };
}

// Khôi phục trang theo địa chỉ khi tải lại. Bài hoặc topic không còn tồn tại thì bỏ qua và về danh sách.
async function restore() {
  const h = readHash();
  S.tab = h.tab;
  $('#view').innerHTML = '<p class="empty">Đang tải…</p>';
  try {
    if (S.tab === 'reading') {
      S.reading.topic = h.t;
      try {
        await loadReading();
      } catch (e) {
        S.reading.topic = '';
        await loadReading();
      }
      if (h.id) {
        try {
          const o = await api('GET', '/reading/' + h.id);
          S.reading.open = o;
          showStreak(o.streak);
        } catch (e) {
          toast('Bài đọc này không còn tồn tại', true);
        }
      }
    } else if (S.tab === 'vocab') {
      if (h.id) S.vocab.study = { _id: h.id };
      try {
        await loadVocab();
      } catch (e) {
        S.vocab.study = null;
        await loadTopics();
        toast('Topic này không còn tồn tại', true);
      }
    } else {
      await loaders[S.tab](); // quiz và streak: đứng đúng tab; bài quiz đang làm dở không khôi phục được
    }
  } finally {
    render();
  }
}

const loaders = {
  reading: () => loadReading(),
  vocab: () => loadVocab(),
  grammar: () => Promise.resolve(), // Ngữ pháp dùng dữ liệu tĩnh grammar-data.js, render được ngay
  quiz: () => loadTopics(),
  streak: () => loadStreak(),
};
actions.tab = (el) => {
  S.tab = el.dataset.tab;
  document.querySelectorAll('.tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === S.tab));
  $('#view').innerHTML = '<p class="empty">Đang tải…</p>';
  run(async () => {
    try { await loaders[S.tab](); } finally { render(); }
  });
};
actions.logout = () => {
  Auth.clear();
  location.href = 'login.html';
};

// Nút có data-confirm: bấm lần 1 chỉ "lên đạn", bấm lần 2 trong 3,5 giây mới chạy thật
let armed = null;
function disarm(el) {
  el.textContent = el.dataset.label;
  el.classList.remove('armed');
  if (armed === el) armed = null;
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  const act = el && actions[el.dataset.act];
  if (!act) return;
  if (el.dataset.confirm && armed !== el) {
    if (armed) disarm(armed);
    armed = el;
    el.dataset.label = el.textContent;
    el.textContent = el.dataset.confirm;
    el.classList.add('armed');
    setTimeout(() => { if (armed === el) disarm(el); }, 3500);
    return;
  }
  armed = null;
  act(el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]');
  const fn = f && forms[f.dataset.form];
  if (!fn) return;
  e.preventDefault();
  run(() => fn(Object.fromEntries(new FormData(f)), f));
});

// Ô tìm kiếm: lọc danh sách ngay khi gõ, không vẽ lại trang nên con trỏ không bị mất
document.addEventListener('input', (e) => {
  const box = e.target.closest('[data-filter]');
  if (!box) return;
  const list = $(box.dataset.filter);
  const q = fold(box.value.trim());
  let shown = 0;
  list.querySelectorAll('li[data-name]').forEach((li) => {
    const hit = li.dataset.name.includes(q);
    li.hidden = !hit;
    if (hit) shown += 1;
  });
  const none = $(box.dataset.none);
  if (none) none.hidden = shown > 0;
  // Topic đang chọn bị ẩn thì chuyển sang topic đầu tiên còn hiện, để không làm bài với topic không nhìn thấy
  const checked = list.querySelector('input[type=radio]:checked');
  if (checked && checked.closest('li').hidden) {
    const first = list.querySelector('li:not([hidden]) input[type=radio]');
    if (first) first.checked = true;
  }
});
// Nhấn Enter trong ô tìm kiếm: chọn kết quả đầu tiên (quiz thì bắt đầu luôn, từ vựng thì mở topic)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const box = e.target.closest('[data-filter]');
  if (!box) return;
  e.preventDefault();
  const first = $(box.dataset.filter).querySelector('li:not([hidden])');
  if (!first) return;
  const radio = first.querySelector('input[type=radio]');
  if (radio) {
    radio.checked = true;
    box.form.requestSubmit();
  } else {
    const open = first.querySelector('.row-link');
    if (open) open.click();
  }
});

function paintUser() {
  const u = Auth.user() || {};
  $('#user-name').textContent = u.nickname || '';
  $('#user-role').hidden = u.role !== 'admin';
  $('#streak-count').textContent = u.currentStreak || 0;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.token() || !Auth.user()) {
    location.href = 'login.html';
    return;
  }
  paintUser();
  run(async () => {
    // Hỏi server để xác nhận token còn hiệu lực và lấy vai trò, chuỗi ngày mới nhất.
    // Chạy song song với việc tải nội dung trang để không phải chờ hai lượt nối đuôi nhau.
    const roleBefore = (Auth.user() || {}).role;
    const meP = api('GET', '/auth/me').then((me) => {
      Auth.setUser({ ...Auth.user(), ...me });
      paintUser();
      return me;
    });
    const [me] = await Promise.all([meP, restore()]);
    // Vai trò đổi (ví dụ vừa được cấp quyền quản trị) thì vẽ lại một lần SAU KHI trang đã tải xong,
    // để hiện hoặc ẩn các nút quản trị. Vẽ lại giữa chừng có thể gặp dữ liệu chưa tải đủ.
    if (me.role !== roleBefore) render();
  });
});
