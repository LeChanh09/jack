'use strict';
// Tab Đọc hiểu. Thêm, sửa, xoá chỉ hiện với quản trị viên (server vẫn kiểm tra lại quyền).
async function loadReading() {
  const r = S.reading;
  // Hai yêu cầu độc lập nên gọi song song, đỡ phải chờ nối đuôi nhau
  [r.topics, r.items] = await Promise.all([
    api('GET', '/reading/topics'),
    api('GET', '/reading' + (r.topic ? '?topic=' + encodeURIComponent(r.topic) : '')),
  ]);
}

function readingView() {
  const r = S.reading;
  const chips = [['', 'Tất cả'], ...r.topics.map((t) => [t._id, t.name])]
    .map(([id, name]) => `<button class="chip" data-act="r-filter" data-id="${esc(id)}" aria-pressed="${r.topic === id}">${esc(name)}</button>`)
    .join('');
  const topicName = (id) => (r.topics.find((t) => t._id === id) || {}).name || '';
  const list = r.items.length
    ? r.items.map((x) => `<li><button class="row-link" data-act="r-open" data-id="${esc(x._id)}" aria-current="${!!r.open && r.open.reading._id === x._id}"><span class="t">${esc(x.title)}</span><span class="m">${esc(topicName(x.topic))}</span></button></li>`).join('')
    : `<li class="empty">Chưa có bài đọc nào trong chủ đề này.${isAdmin() ? ' Thêm bài đầu tiên ở bên dưới.' : ''}</li>`;
  const topicTools = isAdmin() && r.topic
    ? `<p><button class="link" data-act="r-rename-topic">Đổi tên chủ đề này</button>
       <button class="link danger" data-act="r-del-topic" data-confirm="Bấm lần nữa để xoá cả chủ đề">Xoá chủ đề</button></p>` : '';
  return `<div class="cols">
    <section aria-label="Danh sách bài đọc">
      <div class="chips" role="group" aria-label="Lọc theo chủ đề">${chips}</div>
      ${r.renameTopic ? renameTopicForm() : topicTools}
      <ul class="list">${list}</ul>
      ${isAdmin() ? readingForms() : ''}
    </section>
    <article class="page" aria-live="polite">${r.edit ? readingEdit() : readingPage()}</article>
  </div>`;
}

function readingPage() {
  const o = S.reading.open;
  if (!o) return '<p class="empty">Chọn một bài ở bên trái để bắt đầu đọc.</p>';
  const { reading, topic, quiz } = o;
  const paras = reading.content.split(/\n+/).map((p) => `<p class="body serif">${esc(p)}</p>`).join('');
  const tools = isAdmin()
    ? `<p><button class="link" data-act="r-edit">Sửa bài</button>
       <button class="link danger" data-act="r-del" data-confirm="Bấm lần nữa để xoá bài">Xoá bài</button></p>` : '';
  return `<h2>${esc(reading.title)}</h2>
    <p class="by">Chủ đề: ${esc(topic ? topic.name : 'đã bị xoá')}</p>
    ${tools}
    <div style="height:16px"></div>${paras}
    <aside class="stamp" aria-label="Bản ghi quiz">
      <h3>Đã ghi vào collection quiz</h3>
      <dl><dt>Loại</dt><dd>${esc(quiz.type)}</dd><dt>Chủ đề</dt><dd>${esc(topic ? topic.name : '')}</dd><dt>Lượt mở</dt><dd>${quiz.views}</dd></dl>
    </aside>`;
}

function topicOptions(selected) {
  return S.reading.topics.map((t) => `<option value="${esc(t._id)}"${t._id === selected ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
}

function readingEdit() {
  const { reading } = S.reading.open;
  return `<h2>Sửa bài đọc</h2>
    <form data-form="r-save" class="stack wide">
      <label>Chủ đề<select name="topic" required>${topicOptions(reading.topic)}</select></label>
      <label>Tiêu đề<input name="title" value="${esc(reading.title)}" required maxlength="200" data-autofocus></label>
      <label>Nội dung<textarea name="content" rows="10" required>${esc(reading.content)}</textarea></label>
      <div class="inline"><button class="btn">Lưu thay đổi</button><button type="button" class="link" data-act="r-cancel">Huỷ</button></div>
    </form>`;
}

function renameTopicForm() {
  const t = S.reading.topics.find((x) => x._id === S.reading.topic);
  return `<form data-form="r-rename" class="inline" style="margin:8px 0">
    <label class="sr" for="rtn">Tên chủ đề</label><input id="rtn" name="name" value="${esc(t ? t.name : '')}" required maxlength="100" data-autofocus>
    <button class="btn">Lưu tên</button><button type="button" class="link" data-act="r-cancel">Huỷ</button></form>`;
}

function readingForms() {
  return `<details class="add"><summary>Thêm chủ đề</summary>
      <form data-form="r-topic" class="stack"><label>Tên chủ đề<input name="name" required maxlength="100"></label><button class="btn">Tạo chủ đề</button></form>
    </details>
    <details class="add"><summary>Thêm bài đọc</summary>
      <form data-form="r-add" class="stack">
        <label>Chủ đề<select name="topic" required>${topicOptions(S.reading.topic)}</select></label>
        <label>Tiêu đề<input name="title" required maxlength="200"></label>
        <label>Nội dung<textarea name="content" rows="6" required></textarea></label>
        <button class="btn">Lưu bài đọc</button>
      </form>
    </details>`;
}

actions['r-filter'] = (el) => run(async () => {
  S.reading.topic = el.dataset.id;
  S.reading.renameTopic = false;
  await loadReading();
  render();
});
actions['r-open'] = (el) => run(async () => {
  const o = await api('GET', '/reading/' + el.dataset.id);
  S.reading.open = o;
  S.reading.edit = false;
  showStreak(o.streak);
  render();
});
actions['r-edit'] = () => { S.reading.edit = true; render(); };
actions['r-cancel'] = () => { S.reading.edit = false; S.reading.renameTopic = false; render(); };
actions['r-rename-topic'] = () => { S.reading.renameTopic = true; render(); };
actions['r-del'] = () => run(async () => {
  await api('DELETE', '/reading/' + S.reading.open.reading._id);
  S.reading.open = null;
  toast('Đã xoá bài đọc');
  await loadReading();
  render();
});
actions['r-del-topic'] = () => run(async () => {
  await api('DELETE', '/reading/topics/' + S.reading.topic);
  S.reading.topic = '';
  S.reading.open = null;
  toast('Đã xoá chủ đề và các bài đọc bên trong');
  await loadReading();
  render();
});

forms['r-topic'] = async (d) => { await api('POST', '/reading/topics', { name: d.name }); toast('Đã tạo chủ đề'); await loadReading(); render(); };
forms['r-add'] = async (d) => { await api('POST', '/reading', d); toast('Đã lưu bài đọc'); await loadReading(); render(); };
forms['r-rename'] = async (d) => {
  await api('PUT', '/reading/topics/' + S.reading.topic, { name: d.name });
  S.reading.renameTopic = false;
  toast('Đã đổi tên chủ đề');
  await loadReading();
  render();
};
forms['r-save'] = async (d) => {
  const id = S.reading.open.reading._id;
  await api('PUT', '/reading/' + id, d);
  // Mở lại bài để thấy nội dung mới (lượt mở tăng thêm 1, chấp nhận được)
  S.reading.open = await api('GET', '/reading/' + id);
  S.reading.edit = false;
  toast('Đã lưu bài đọc');
  await loadReading();
  render();
};
