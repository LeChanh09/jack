'use strict';
// Tab Từ vựng. Ai cũng xem và nghe phát âm; thêm, sửa, xoá chỉ hiện với quản trị viên.
async function loadTopics() { S.vocab.topics = await api('GET', '/vocabulary/topics'); }
async function refreshStudy() { S.vocab.study = await api('GET', '/vocabulary/topics/' + S.vocab.study._id); }
async function loadVocab() {
  await loadTopics();
  if (S.vocab.study) await refreshStudy();
}

const vocabView = () => (S.vocab.study ? studyView() : topicsView());

function topicsView() {
  const items = S.vocab.topics.map((t) => `<li class="topic" data-name="${esc(fold(t.name))}">
      <button class="row-link" data-act="v-open" data-id="${esc(t._id)}"><span class="t serif">${esc(t.name)}</span><span class="m">${t.wordCount} từ</span></button>
      <button class="btn ghost" data-act="v-quiz" data-id="${esc(t._id)}"${t.wordCount ? '' : ' disabled'}>Làm quiz</button>
    </li>`).join('');
  const empty = `<li class="empty">Chưa có topic nào.${isAdmin() ? ' Tạo topic đầu tiên ở bên dưới.' : ''}</li>`;
  const create = isAdmin()
    ? `<form data-form="v-topic" class="stack"><label>Tên topic mới<input name="name" required maxlength="100"></label><button class="btn">Tạo topic</button></form>` : '';
  return `<section class="narrow">
    <h2>Chủ đề từ vựng</h2>
    ${items ? `<label class="sr" for="vsearch">Tìm topic</label>
    <input id="vsearch" class="search" type="search" placeholder="Tìm topic, gõ không dấu cũng được" autocomplete="off" data-filter="#vlist" data-none="#vnone">` : ''}
    <ul class="list" id="vlist">${items || empty}</ul>
    <p id="vnone" class="empty" hidden>Không có topic nào khớp. Thử gõ ngắn hơn.</p>
    ${create}
  </section>`;
}

function wordRow(w) {
  const tools = isAdmin()
    ? `<button class="link" data-act="v-edit-word" data-id="${esc(w._id)}">Sửa</button>
       <button class="link danger" data-act="v-del-word" data-id="${esc(w._id)}" data-confirm="Bấm lần nữa để xoá">Xoá</button>` : '';
  return `<tr><td class="w serif">${esc(w.word)}</td><td>${esc(w.meaning)}</td><td class="ops">${speakBtn(w.word, w.audio)}${tools}</td></tr>`;
}
function editRow(w) {
  return `<tr><td colspan="3"><form data-form="v-word-save" class="inline">
    <input name="word" value="${esc(w.word)}" required maxlength="100" aria-label="Từ tiếng Anh" data-autofocus>
    <input name="meaning" value="${esc(w.meaning)}" required maxlength="300" aria-label="Nghĩa tiếng Việt">
    <button class="btn">Lưu từ</button><button type="button" class="link" data-act="v-cancel">Huỷ</button></form></td></tr>`;
}

function studyView() {
  const v = S.vocab, t = v.study;
  const head = v.editTopic
    ? `<form data-form="v-rename" class="inline"><label class="sr" for="tn">Tên topic</label><input id="tn" name="name" value="${esc(t.name)}" required maxlength="100" data-autofocus><button class="btn">Lưu tên</button><button type="button" class="link" data-act="v-cancel">Huỷ</button></form>`
    : `<h2>${esc(t.name)}</h2>${isAdmin() ? `<p><button class="link" data-act="v-edit-topic">Đổi tên</button><button class="link danger" data-act="v-del-topic" data-confirm="Bấm lần nữa để xoá cả topic">Xoá topic</button></p>` : ''}`;
  const rows = t.words.map((w) => (v.editWord === w._id ? editRow(w) : wordRow(w))).join('');
  const add = isAdmin()
    ? `<form data-form="v-word-add" class="inline">
      <label class="sr" for="nw">Từ tiếng Anh</label><input id="nw" name="word" placeholder="Từ tiếng Anh" required maxlength="100">
      <label class="sr" for="nm">Nghĩa tiếng Việt</label><input id="nm" name="meaning" placeholder="Nghĩa tiếng Việt" required maxlength="300">
      <button class="btn">Thêm từ</button>
    </form>` : '';
  return `<section class="narrow">
    <p><button class="link" data-act="v-back">Quay lại danh sách topic</button></p>
    ${head}
    <table><thead><tr><th scope="col">Từ</th><th scope="col">Nghĩa</th><th scope="col"><span class="sr">Thao tác</span></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="3" class="empty">Topic này chưa có từ nào.${isAdmin() ? ' Thêm từ đầu tiên ở bên dưới.' : ''}</td></tr>`}</tbody></table>
    ${add}
  </section>`;
}

actions['v-open'] = (el) => run(async () => {
  S.vocab.study = await api('GET', '/vocabulary/topics/' + el.dataset.id);
  S.vocab.editTopic = false; S.vocab.editWord = null;
  render();
});
actions['v-back'] = () => run(async () => { S.vocab.study = null; await loadTopics(); render(); });
actions['v-quiz'] = (el) => { S.quizTopic = el.dataset.id; S.quiz = null; actions.tab({ dataset: { tab: 'quiz' } }); };
actions['v-edit-topic'] = () => { S.vocab.editTopic = true; render(); };
actions['v-edit-word'] = (el) => { S.vocab.editWord = el.dataset.id; render(); };
actions['v-cancel'] = () => { S.vocab.editTopic = false; S.vocab.editWord = null; render(); };
actions['v-del-topic'] = () => run(async () => {
  await api('DELETE', '/vocabulary/topics/' + S.vocab.study._id);
  S.vocab.study = null; toast('Đã xoá topic'); await loadTopics(); render();
});
actions['v-del-word'] = (el) => run(async () => {
  await api('DELETE', `/vocabulary/topics/${S.vocab.study._id}/words/${el.dataset.id}`);
  toast('Đã xoá từ'); await refreshStudy(); render();
});

forms['v-topic'] = async (d) => { await api('POST', '/vocabulary/topics', { name: d.name }); toast('Đã tạo topic'); await loadTopics(); render(); };
forms['v-rename'] = async (d) => {
  await api('PUT', '/vocabulary/topics/' + S.vocab.study._id, { name: d.name });
  S.vocab.editTopic = false; toast('Đã đổi tên topic'); await refreshStudy(); render();
};
forms['v-word-add'] = async (d) => {
  await api('POST', `/vocabulary/topics/${S.vocab.study._id}/words`, d);
  toast('Đã thêm từ'); await refreshStudy(); render();
};
forms['v-word-save'] = async (d) => {
  await api('PUT', `/vocabulary/topics/${S.vocab.study._id}/words/${S.vocab.editWord}`, d);
  S.vocab.editWord = null; toast('Đã lưu từ'); await refreshStudy(); render();
};
