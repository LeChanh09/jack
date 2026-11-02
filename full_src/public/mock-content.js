'use strict';
// Nội dung học giả: reading, từ vựng, quiz. Cùng đường dẫn, cùng quyền (quản trị mới được thêm, sửa, xoá) với backend thật.
MOCK_HANDLERS.push((c) => {
  const vtopic = (id) => MOCK.vt.find((t) => t._id === id);
  const { key, q, body } = c;
  let e;

  // ---- Reading ----
  if (key === 'GET /reading/topics') return c.ok(MOCK.rt);
  if (key === 'POST /reading/topics') {
    if ((e = c.admin())) return e;
    if ((e = c.need(body.name, 'name'))) return e;
    if (MOCK.rt.some((t) => t.name === c.str(body.name))) return c.err(409, 'Dữ liệu đã tồn tại');
    const t = { _id: uid(), name: c.str(body.name) };
    MOCK.rt.push(t);
    return c.ok(t, 201);
  }
  if (c.is(/^(PUT|DELETE) \/reading\/topics\/([\w-]+)$/)) {
    if ((e = c.admin())) return e;
    const t = MOCK.rt.find((x) => x._id === c.m[2]);
    if (!t) return c.err(404, 'Không tìm thấy topic reading');
    if (c.m[1] === 'PUT') {
      if ((e = c.need(body.name, 'name'))) return e;
      t.name = c.str(body.name);
      return c.ok(t);
    }
    MOCK.reads.filter((r) => r.topic === t._id).forEach((r) => delete MOCK.quiz[r._id]);
    MOCK.reads = MOCK.reads.filter((r) => r.topic !== t._id);
    MOCK.rt = MOCK.rt.filter((x) => x !== t);
    return { status: 204, data: null };
  }
  if (key === 'GET /reading') {
    const t = q.get('topic');
    return c.ok(MOCK.reads.filter((r) => !t || r.topic === t).sort((a, b) => b.createdAt - a.createdAt).map(({ content, ...r }) => r));
  }
  if (key === 'POST /reading') {
    if ((e = c.admin())) return e;
    if ((e = c.need(body.title, 'title') || c.need(body.content, 'content'))) return e;
    if (!MOCK.rt.some((t) => t._id === body.topic)) return c.err(404, 'Không tìm thấy topic reading');
    const r = { _id: uid(), topic: body.topic, title: c.str(body.title), content: c.str(body.content), createdAt: Date.now() };
    MOCK.reads.push(r);
    return c.ok(r, 201);
  }
  if (c.is(/^(GET|PUT|DELETE) \/reading\/([\w-]+)$/)) {
    const method = c.m[1];
    if (method !== 'GET' && (e = c.admin())) return e;
    const r = MOCK.reads.find((x) => x._id === c.m[2]);
    if (!r) return c.err(404, 'Không tìm thấy bài đọc');
    if (method === 'DELETE') {
      MOCK.reads = MOCK.reads.filter((x) => x !== r);
      delete MOCK.quiz[r._id];
      return { status: 204, data: null };
    }
    if (method === 'PUT') {
      const upd = {};
      for (const f of ['title', 'content']) {
        if (body[f] === undefined) continue;
        if ((e = c.need(body[f], f))) return e;
        upd[f] = c.str(body[f]);
      }
      if (body.topic !== undefined) {
        if (!MOCK.rt.some((t) => t._id === body.topic)) return c.err(404, 'Không tìm thấy topic reading');
        upd.topic = body.topic;
        if (MOCK.quiz[r._id]) MOCK.quiz[r._id].topic = body.topic;
      }
      if (!Object.keys(upd).length) return c.err(400, 'Không có dữ liệu để cập nhật');
      Object.assign(r, upd);
      return c.ok(r);
    }
    const z = MOCK.quiz[r._id] || (MOCK.quiz[r._id] = { _id: uid(), type: 'reading', topic: r.topic, reading: r._id, views: 0 });
    z.views += 1; // giống upsert $inc ở backend thật
    z.topic = r.topic;
    const streak = c.user ? mockTouch(c.user._id) : null;
    return c.ok({ reading: r, topic: MOCK.rt.find((t) => t._id === r.topic) || null, quiz: { ...z }, streak });
  }

  // ---- Từ vựng: topic ----
  if (key === 'GET /vocabulary/topics') {
    return c.ok(MOCK.vt.map((t) => ({ ...t, wordCount: MOCK.words.filter((w) => w.topic === t._id).length })));
  }
  if (key === 'POST /vocabulary/topics') {
    if ((e = c.admin())) return e;
    if ((e = c.need(body.name, 'name'))) return e;
    if (MOCK.vt.some((t) => t.name === c.str(body.name))) return c.err(409, 'Dữ liệu đã tồn tại');
    const t = { _id: uid(), name: c.str(body.name) };
    MOCK.vt.push(t);
    return c.ok(t, 201);
  }
  if (c.is(/^(GET|PUT|DELETE) \/vocabulary\/topics\/([\w-]+)$/)) {
    const method = c.m[1];
    if (method !== 'GET' && (e = c.admin())) return e;
    const t = vtopic(c.m[2]);
    if (!t) return c.err(404, 'Không tìm thấy topic từ vựng');
    if (method === 'GET') {
      const words = MOCK.words.filter((w) => w.topic === t._id).sort((a, b) => a.word.localeCompare(b.word));
      return c.ok({ ...t, words: words.map((w) => ({ ...w, audio: audioOf(w.word) })) });
    }
    if (method === 'PUT') {
      if ((e = c.need(body.name, 'name'))) return e;
      t.name = c.str(body.name);
      return c.ok(t);
    }
    MOCK.words = MOCK.words.filter((w) => w.topic !== t._id);
    MOCK.vt = MOCK.vt.filter((x) => x !== t);
    return { status: 204, data: null };
  }

  // ---- Từ vựng: từ ----
  if (c.is(/^POST \/vocabulary\/topics\/([\w-]+)\/words$/)) {
    if ((e = c.admin())) return e;
    if (!vtopic(c.m[1])) return c.err(404, 'Không tìm thấy topic từ vựng');
    if ((e = c.need(body.word, 'word') || c.need(body.meaning, 'meaning'))) return e;
    if (MOCK.words.some((w) => w.topic === c.m[1] && w.word === c.str(body.word))) return c.err(409, 'Dữ liệu đã tồn tại');
    const w = { _id: uid(), topic: c.m[1], word: c.str(body.word), meaning: c.str(body.meaning) };
    MOCK.words.push(w);
    return c.ok({ ...w, audio: audioOf(w.word) }, 201);
  }
  if (c.is(/^(PUT|DELETE) \/vocabulary\/topics\/([\w-]+)\/words\/([\w-]+)$/)) {
    if ((e = c.admin())) return e;
    const w = MOCK.words.find((x) => x._id === c.m[3] && x.topic === c.m[2]);
    if (!w) return c.err(404, 'Không tìm thấy từ vựng');
    if (c.m[1] === 'DELETE') {
      MOCK.words = MOCK.words.filter((x) => x !== w);
      return { status: 204, data: null };
    }
    for (const f of ['word', 'meaning']) {
      if (body[f] === undefined) continue;
      if ((e = c.need(body[f], f))) return e;
      w[f] = c.str(body[f]);
    }
    return c.ok({ ...w, audio: audioOf(w.word) });
  }

  // ---- Quiz từ vựng ----
  const finish = (s) => {
    s.finished = true;
    s.score = Math.round((s.correctCount / s.items.length) * 100);
    s.streak = s.user ? mockTouch(s.user) : null;
  };
  const ownerErr = (s) => (s.user && (!c.user || s.user !== c.user._id)
    ? c.err(403, 'Phiên quiz này thuộc về tài khoản khác') : null);

  if (c.is(/^GET \/vocabulary\/topics\/([\w-]+)\/words$/)) {
    const t = vtopic(c.m[1]);
    if (!t) return c.err(404, 'Không tìm thấy topic từ vựng');
    const ws = shuffle(MOCK.words.filter((w) => w.topic === t._id));
    if (!ws.length) return c.err(404, 'Topic chưa có từ vựng');
    const s = {
      _id: uid(), topic: t._id, user: c.user ? c.user._id : null,
      items: ws.map((w) => ({ word: w._id, answered: false, correct: false })),
      answeredCount: 0, correctCount: 0, finished: false, score: null, streak: null,
    };
    MOCK.sessions[s._id] = s;
    // Không có từ tiếng Anh và không có audio, vì audio chứa luôn đáp án
    return c.ok({ sessionId: s._id, topic: { id: t._id, name: t.name }, total: ws.length,
      words: Object.fromEntries(ws.map((w) => [w._id, w.meaning])) }, 201);
  }
  if (c.is(/^POST \/vocabulary\/quiz\/([\w-]+)\/check$/)) {
    const s = MOCK.sessions[c.m[1]];
    if (!s) return c.err(404, 'Không tìm thấy phiên quiz');
    if ((e = ownerErr(s))) return e;
    if (typeof body.answer !== 'string') return c.err(400, 'answer phải là chuỗi');
    const it = s.items.find((i) => i.word === body.wordId);
    const w = MOCK.words.find((x) => x._id === body.wordId);
    if (!it) return c.err(404, 'Từ này không thuộc phiên quiz');
    if (!w) return c.err(404, 'Từ vựng đã bị xoá');
    if (s.finished) return c.err(409, 'Phiên quiz đã kết thúc');
    if (it.answered) return c.err(409, 'Từ này đã được trả lời');
    const correct = norm(body.answer) === norm(w.word);
    it.answered = true; it.correct = correct; s.answeredCount++;
    if (correct) s.correctCount++;
    const done = s.answeredCount >= s.items.length;
    if (done) finish(s);
    return c.ok({ correct, correctAnswer: w.word, audio: audioOf(w.word), answeredCount: s.answeredCount,
      total: s.items.length, finished: done,
      ...(done && { score: s.score, correctCount: s.correctCount, streak: s.streak }) });
  }
  if (c.is(/^POST \/vocabulary\/quiz\/([\w-]+)\/finish$/)) {
    const s = MOCK.sessions[c.m[1]];
    if (!s) return c.err(404, 'Không tìm thấy phiên quiz');
    if ((e = ownerErr(s))) return e;
    if (!s.finished) finish(s);
    return c.ok({ sessionId: s._id, finished: true, score: s.score, correctCount: s.correctCount,
      answeredCount: s.answeredCount, total: s.items.length, streak: s.streak });
  }
  return undefined;
});
