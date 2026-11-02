'use strict';
// Tab Làm quiz. Điểm và chuỗi ngày do server tính; ở đây chỉ hiển thị.
// S.quiz = { sid, topic, meanings:{wordId: nghĩa}, ids[], i, fb, history[], final, result } hoặc null

const quizView = () => (!S.quiz ? quizPicker() : S.quiz.result ? quizResult(S.quiz) : quizQuestion(S.quiz));

function quizPicker() {
  const ts = S.vocab.topics.filter((t) => t.wordCount > 0);
  if (!ts.length) return `<p class="empty">Chưa có topic nào có từ vựng.${isAdmin() ? ' Thêm từ ở tab Từ vựng rồi quay lại.' : ''}</p>`;
  const pick = ts.some((t) => t._id === S.quizTopic) ? S.quizTopic : ts[0]._id;
  const items = ts.map((t) => `<li data-name="${esc(fold(t.name))}"><label class="topt"><input type="radio" name="topic" value="${esc(t._id)}"${t._id === pick ? ' checked' : ''}><span class="box"><span class="n serif">${esc(t.name)}</span><span class="c">${t.wordCount} từ</span></span></label></li>`).join('');
  return `<section class="narrow">
    <h2>Viết lại từ tiếng Anh</h2>
    <p class="lead">Mỗi câu hiện nghĩa tiếng Việt, bạn viết từ tiếng Anh tương ứng. Mỗi từ chỉ trả lời được một lần, điểm do server chấm. Làm xong một bài là tính một ngày học. Nếu bạn rời sang tab khác khi đang làm, bài sẽ tự động nộp khi bạn quay lại.</p>
    <form data-form="q-start" class="picker">
      <label class="lbl" for="tsearch">Chọn topic</label>
      <input id="tsearch" type="search" placeholder="Tìm topic, gõ không dấu cũng được" autocomplete="off" data-filter="#tlist" data-none="#tnone">
      <ul id="tlist" class="tlist">${items}</ul>
      <p id="tnone" class="empty" hidden>Không có topic nào khớp. Thử gõ ngắn hơn.</p>
      <div><button class="btn">Bắt đầu làm bài</button></div>
    </form>
  </section>`;
}

function quizQuestion(z) {
  const id = z.ids[z.i], n = z.ids.length, done = z.i + (z.fb ? 1 : 0);
  return `<section class="sheet">
    <div class="prog" role="progressbar" aria-label="Tiến độ" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}"><i style="width:${Math.round((done / n) * 100)}%"></i></div>
    <p class="count">Câu ${z.i + 1} trên ${n}, topic ${esc(z.topic)}</p>
    <p class="prompt serif">${esc(z.meanings[id])}</p>
    ${z.fb ? feedback(z) : `<form data-form="q-check" class="write"><label class="sr" for="ans">Từ tiếng Anh</label><input id="ans" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false" required data-autofocus><button class="btn">Kiểm tra</button></form>`}
    <p class="foot"><button class="link" data-act="q-finish">Nộp bài sớm</button></p>
    <p class="hint">Rời sang tab khác khi đang làm thì bài sẽ tự động nộp khi bạn quay lại.</p>
  </section>`;
}

function feedback(z) {
  const fb = z.fb, last = z.history[z.history.length - 1];
  const next = fb.finished
    ? '<button class="btn" data-act="q-result" data-autofocus>Xem kết quả</button>'
    : '<button class="btn" data-act="q-next" data-autofocus>Câu tiếp theo</button>';
  const verdict = fb.correct
    ? '<p>Chính xác.</p>'
    : `<p>Chưa đúng, đáp án là <strong class="serif key">${esc(fb.correctAnswer)}</strong></p>`;
  return `<div class="answer ${fb.correct ? 'ok' : 'bad'}"><p class="written serif">${esc(last.given || '(bỏ trống)')}</p>${verdict}${speakBtn(fb.correctAnswer, fb.audio)}</div>${next}`;
}

function quizResult(z) {
  const r = z.result, skipped = r.total - z.history.length;
  const rows = z.history.map((h) => `<tr class="${h.correct ? 'ok' : 'bad'}"><td>${esc(h.meaning)}</td><td class="serif">${esc(h.given || '(bỏ trống)')}</td><td class="serif">${esc(h.answer)}</td></tr>`).join('');
  const streak = r.streak ? `<p class="lead">Chuỗi ngày học của bạn: <b>${r.streak.currentStreak} ngày</b>.</p>` : '';
  return `<section class="sheet">
    <p class="count">Topic ${esc(z.topic)}</p>
    ${z.auto ? '<p class="notice">Bạn đã rời khỏi tab khi đang làm bài nên bài được nộp tự động. Các câu chưa trả lời tính là sai.</p>' : ''}
    <p class="mark" role="img" aria-label="Điểm ${r.score} trên 100">${r.score}</p>
    <p class="lead">Đúng ${r.correctCount} trên ${r.total} câu${skipped ? `, ${skipped} câu bỏ qua tính là sai` : ''}. Điểm đã được lưu.</p>
    ${streak}
    ${rows ? `<table><thead><tr><th scope="col">Nghĩa</th><th scope="col">Bạn viết</th><th scope="col">Đáp án</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
    <button class="btn" data-act="q-again" data-autofocus>Làm bài khác</button>
  </section>`;
}

forms['q-start'] = async (d) => {
  if (!d.topic) throw new Error('Hãy chọn một topic trước khi bắt đầu');
  S.quizTopic = d.topic;
  const r = await api('GET', `/vocabulary/topics/${d.topic}/words`);
  S.quiz = { sid: r.sessionId, topic: r.topic.name, meanings: r.words, ids: Object.keys(r.words), i: 0, fb: null, history: [], final: null, result: null };
  render();
};
forms['q-check'] = async (d) => {
  const z = S.quiz, id = z.ids[z.i];
  const fb = await api('POST', `/vocabulary/quiz/${z.sid}/check`, { wordId: id, answer: d.answer });
  z.fb = fb;
  z.history.push({ meaning: z.meanings[id], given: d.answer.trim(), correct: fb.correct, answer: fb.correctAnswer });
  if (fb.finished) {
    z.final = { score: fb.score, correctCount: fb.correctCount, total: fb.total, streak: fb.streak };
    showStreak(fb.streak); // server đã tự ghi nhận chuỗi ngày khi chốt điểm
  }
  render();
};
actions['q-next'] = () => { S.quiz.i += 1; S.quiz.fb = null; render(); };
actions['q-result'] = () => { S.quiz.result = S.quiz.final; render(); };
actions['q-finish'] = () => run(async () => {
  const z = S.quiz, r = await api('POST', `/vocabulary/quiz/${z.sid}/finish`);
  z.result = { score: r.score, correctCount: r.correctCount, total: r.total, streak: r.streak };
  showStreak(r.streak);
  render();
});
actions['q-again'] = () => run(async () => { S.quiz = null; await loadTopics(); render(); });

// Tự nộp bài khi người dùng rời tab giữa chừng.
// visibilitychange chỉ báo khi chuyển tab, thu nhỏ cửa sổ hoặc khoá màn hình. Nó không báo khi
// bạn bấm sang cửa sổ khác đặt cạnh nhau (muốn bắt cả trường hợp đó phải dùng sự kiện blur,
// nhưng blur cũng nổ khi mở DevTools hay bấm thanh địa chỉ nên dễ nộp nhầm).
function autoSubmitQuiz(z) {
  z.submitting = true;
  run(async () => {
    try {
      if (z.final) {
        z.result = z.final; // phiên đã được chốt điểm ở lần trả lời cuối
      } else {
        const r = await api('POST', `/vocabulary/quiz/${z.sid}/finish`);
        z.result = { score: r.score, correctCount: r.correctCount, total: r.total, streak: r.streak };
        showStreak(r.streak);
      }
      z.auto = true;
      S.tab = 'quiz';
      render();
      toast('Bạn đã rời khỏi tab nên bài làm được nộp tự động', true);
    } finally {
      z.submitting = false;
    }
  });
}

document.addEventListener('visibilitychange', () => {
  const z = S.quiz;
  if (document.hidden) {
    if (z && !z.result) z.left = true; // chỉ đánh dấu, việc nộp bài làm khi quay lại
    return;
  }
  if (!z || z.result || !z.left || z.submitting) return;
  z.left = false;
  autoSubmitQuiz(z);
});
