'use strict';

// 1. Hàm vẽ toàn bộ giao diện tab Ngữ pháp
function grammarView() {
  const g = S.grammar;
  const lesson = GRAMMAR_DATA.find((l) => l.id === g.lessonId) || GRAMMAR_DATA[0];
  const exercise = lesson.exercises.find((e) => e.code === g.exCode) || lesson.exercises[0];

  // Menu bên trái: Chọn bài học & Chọn bài tập con
  const lessonButtons = GRAMMAR_DATA.map((l) => `
    <li>
      <button class="row-link" data-act="g-select-lesson" data-id="${esc(l.id)}" aria-current="${l.id === lesson.id}">
        <span class="t serif">${esc(l.title)}</span>
      </button>
    </li>
  `).join('');

  const exChips = lesson.exercises.map((e) => `
    <button class="chip" data-act="g-select-ex" data-code="${esc(e.code)}" aria-pressed="${e.code === exercise.code}">
      ${esc(e.name)}
    </button>
  `).join('');

  // Danh sách từ vựng bổ trợ của bài
  const vocabTable = lesson.vocab.map((v) => `
    <tr>
      <td class="w serif">${esc(v.word)}</td>
      <td>${esc(v.meaning)}</td>
      <td class="ops">${speakBtn(v.word, '')}</td>
    </tr>
  `).join('');

  // Danh sách câu hỏi dịch
  const sentenceList = exercise.sentences.map((s, idx) => {
    const res = g.results[s.id];
    let feedback = '';
    if (res) {
      feedback = res.correct
        ? `<div class="answer ok" style="margin-top:8px"><p class="written serif" style="font-size:18px">✓ Chính xác: ${esc(res.given)}</p></div>`
        : `<div class="answer bad" style="margin-top:8px">
             <p class="written serif" style="font-size:18px">✗ Chưa đúng: ${esc(res.given)}</p>
             <p>Đáp án gợi ý: <strong class="key serif">${esc(s.ans[0])}</strong></p>
           </div>`;
    }

    return `
      <li style="margin-bottom:24px;list-style:none;border-bottom:1px solid var(--rule);padding-bottom:16px">
        <p style="font-weight:600;margin-bottom:8px">Câu ${idx + 1}: ${esc(s.vi)}</p>
        <form data-form="g-check-sentence" class="inline" style="gap:8px" autocomplete="off">
          <input type="hidden" name="sid" value="${s.id}">
          <input name="userAns" value="${res ? esc(res.given) : ''}" placeholder="Gõ câu dịch tiếng Anh..." style="flex:1" required>
          <button class="btn" style="min-height:42px">Kiểm tra</button>
        </form>
        ${feedback}
      </li>
    `;
  }).join('');

  return `
    <div class="cols">
      <!-- Cột trái: Danh sách các bài -->
      <section aria-label="Danh mục giáo trình">
        <h3>Giáo trình ngữ pháp</h3>
        <ul class="list">${lessonButtons}</ul>
      </section>

      <!-- Cột phải: Lý thuyết, Từ vựng & Bài tập -->
      <article class="page">
        <h2>${esc(lesson.title)}</h2>
        
        <!-- Phần Lý thuyết -->
        <details class="add" open style="margin-bottom:20px">
          <summary style="font-size:18px;color:var(--blue)"><b>📖 Xem tóm tắt ngữ pháp</b></summary>
          <div style="padding:12px 0">${lesson.theory}</div>
        </details>

        <!-- Bảng Từ mới -->
        <details class="add" open style="margin-bottom:24px">
          <summary style="font-size:18px;color:var(--blue)"><b>📝 Từ vựng trong bài (${lesson.vocab.length} từ)</b></summary>
          <table>
            <thead><tr><th>Từ</th><th>Nghĩa</th><th style="text-align:right">Nghe</th></tr></thead>
            <tbody>${vocabTable}</tbody>
          </table>
        </details>

        <!-- Phần Làm bài tập dịch -->
        <h3>Luyện dịch câu</h3>
        <div class="chips" style="margin:12px 0 20px">${exChips}</div>
        <ul style="padding:0">${sentenceList}</ul>
      </article>
    </div>
  `;
}

// 2. Chuẩn hóa chuỗi (loại bỏ dấu câu .,?! và khoảng cách thừa)
function normalizeInput(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[.,?!;:'"()]/g, '')
    .replace(/\s+/g, ' ');
}

// 3. Sự kiện chuyển bài & chuyển bài tập
actions['g-select-lesson'] = (el) => {
  S.grammar.lessonId = el.dataset.id;
  const lesson = GRAMMAR_DATA.find((l) => l.id === el.dataset.id);
  S.grammar.exCode = lesson.exercises[0].code;
  S.grammar.results = {}; // Làm bài mới thì reset kết quả
  render();
};

actions['g-select-ex'] = (el) => {
  S.grammar.exCode = el.dataset.code;
  S.grammar.results = {};
  render();
};

// 4. Xử lý form nộp câu dịch & kiểm tra
forms['g-check-sentence'] = async (data) => {
  const g = S.grammar;
  const sid = Number(data.sid);
  const lesson = GRAMMAR_DATA.find((l) => l.id === g.lessonId);
  const ex = lesson.exercises.find((e) => e.code === g.exCode);
  const item = ex.sentences.find((s) => s.id === sid);

  const cleanAns = normalizeInput(data.userAns);
  const isMatch = item.ans.some((valid) => normalizeInput(valid) === cleanAns);

  g.results[sid] = { correct: isMatch, given: data.userAns.trim() };

  // Nếu người dùng làm đúng và đã đăng nhập: Gọi API /streak/ping để tự cộng chuỗi ngày học!
  if (isMatch && Auth.token()) {
    try {
      const streakRes = await api('POST', '/streak/ping');
      showStreak(streakRes);
    } catch (e) { /* Bỏ qua lỗi streak nếu mạng chập chờn */ }
  }

  render();
};