'use strict';
// Trang theo dõi chuỗi ngày học: số liệu, lịch tháng, 7 ngày gần nhất.
const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m tính từ 0

async function loadStreak() {
  const data = await api('GET', '/streak');
  const [y, m] = data.today.split('-').map(Number);
  const keep = S.streak && S.streak.shown;
  S.streak = { data, y: keep ? S.streak.y : y, m: keep ? S.streak.m : m - 1, shown: true };
  showStreak({ currentStreak: data.currentStreak, longestStreak: data.longestStreak });
}

function streakView() {
  const st = S.streak;
  if (!st) return '<p class="empty">Chưa có dữ liệu chuỗi ngày.</p>';
  const d = st.data;
  const days = new Set(d.activeDays);
  const msg = d.todayDone
    ? 'Hôm nay bạn đã học xong. Hẹn gặp lại vào ngày mai.'
    : d.currentStreak > 0
      ? `Học một bài đọc hoặc một bài quiz hôm nay để giữ chuỗi ${d.currentStreak} ngày.`
      : 'Học một bài đọc hoặc một bài quiz để bắt đầu chuỗi mới.';

  return `<section class="narrow">
    <h2>Chuỗi ngày học</h2>
    <div class="stats">
      <p class="big"><b>${d.currentStreak}</b><span>ngày liên tiếp</span></p>
      <p class="big"><b>${d.longestStreak}</b><span>chuỗi dài nhất</span></p>
      <p class="big"><b>${days.size}</b><span>ngày đã học</span></p>
    </div>
    <p class="lead ${d.todayDone ? 'done' : ''}">${esc(msg)}</p>
    ${weekStrip(days, d.today)}
    ${calendar(days, d.today, st)}
    <p class="hint">Ngày tính theo giờ Việt Nam. Đọc một bài hoặc kết thúc một bài quiz khi đã đăng nhập là tính một ngày học.</p>
  </section>`;
}

function weekStrip(days, today) {
  const [y, m, dd] = today.split('-').map(Number);
  const cells = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, dd - i));
    const key = ymd(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
    const on = days.has(key);
    cells.push(`<li class="${on ? 'on' : ''}${key === today ? ' today' : ''}">
      <span class="dow">${THU[(dt.getUTCDay() + 6) % 7]}</span>
      <span class="dot" aria-hidden="true">${on ? '✓' : ''}</span>
      <span class="sr">${key}: ${on ? 'đã học' : 'chưa học'}</span></li>`);
  }
  return `<h3>7 ngày gần nhất</h3><ol class="week">${cells.join('')}</ol>`;
}

function calendar(days, today, st) {
  const { y, m } = st;
  const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // thứ Hai = 0
  const len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const [ty, tm] = today.split('-').map(Number);
  const atNow = y === ty && m === tm - 1;
  let cells = THU.map((t) => `<div class="cal-h" aria-hidden="true">${t}</div>`).join('');
  for (let i = 0; i < first; i++) cells += '<div></div>';
  for (let d = 1; d <= len; d++) {
    const key = ymd(y, m, d);
    const on = days.has(key);
    const cls = (on ? 'on ' : '') + (key === today ? 'today ' : '') + (key > today ? 'future' : '');
    cells += `<div class="cal-d ${cls}"><span aria-hidden="true">${d}</span><span class="sr">${key}: ${on ? 'đã học' : key > today ? 'chưa tới' : 'chưa học'}</span></div>`;
  }
  return `<div class="cal-head">
      <button class="btn ghost" data-act="s-prev" aria-label="Tháng trước">‹</button>
      <h3>Tháng ${m + 1} năm ${y}</h3>
      <button class="btn ghost" data-act="s-next" aria-label="Tháng sau"${atNow ? ' disabled' : ''}>›</button>
    </div>
    <div class="cal">${cells}</div>`;
}

const shiftMonth = (n) => {
  const st = S.streak;
  const dt = new Date(Date.UTC(st.y, st.m + n, 1));
  st.y = dt.getUTCFullYear();
  st.m = dt.getUTCMonth();
  render();
};
actions['s-prev'] = () => shiftMonth(-1);
actions['s-next'] = () => shiftMonth(1);
