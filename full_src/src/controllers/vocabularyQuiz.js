const Vocabulary = require('../models/Vocabulary');
const UserTopic = require('../models/UserTopic');
const QuizSession = require('../models/QuizSession');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { requireId } = require('../utils/validate');
const { buildAudioUrl } = require('../utils/audio');
const { touchStreak } = require('../utils/streak');
const config = require('../config');
const { findTopic } = require('./vocabulary');

// Phiên gắn với user nào thì chỉ user đó được trả lời / nộp bài.
// Phiên của khách (không có user) thì ai biết sessionId cũng dùng được.
function assertOwner(session, userId) {
  if (session.user && String(session.user) !== String(userId || '')) {
    throw new HttpError(403, 'Phiên quiz này thuộc về tài khoản khác');
  }
}

const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Chốt phiên: tính điểm 0-100 (từ chưa trả lời tính là sai), chỉ chốt đúng 1 lần.
async function finalize(sessionId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const s = await QuizSession.findById(sessionId).lean();
    if (!s) throw new HttpError(404, 'Không tìm thấy phiên quiz');
    if (s.finished) return s;

    const score = Math.round((s.correctCount / s.items.length) * 100);
    // Điều kiện correctCount đảm bảo không chốt nhầm khi có request check chạy song song
    const done = await QuizSession.findOneAndUpdate(
      { _id: sessionId, finished: false, correctCount: s.correctCount },
      { $set: { finished: true, score } },
      { new: true }
    ).lean();

    if (done) {
      if (done.user) {
        await UserTopic.updateOne(
          { user: done.user, topic: done.topic },
          { $set: { ratio: done.score } },
          { upsert: true }
        );
        // Xong một bài quiz (kể cả nộp sớm) thì tính là đã học hôm nay
        done.streak = await touchStreak(done.user);
      }
      return done;
    }
  }
  throw new HttpError(409, 'Phiên đang được cập nhật, vui lòng thử lại');
}

const summary = (s) => ({
  sessionId: s._id,
  finished: s.finished,
  score: s.score,
  correctCount: s.correctCount,
  answeredCount: s.answeredCount,
  total: s.items.length,
});

// GET /api/vocabulary/topics/:topicId/words  (có token thì gắn phiên với user)
// Tạo phiên quiz, trả { sessionId, words: { <wordId>: "nghĩa tiếng Việt" } }
// Không trả từ tiếng Anh/audio vì audio URL chứa luôn đáp án.
exports.startQuiz = asyncHandler(async (req, res) => {
  const topic = await findTopic(req.params.topicId);
  const words = await Vocabulary.find({ topic: topic._id })
    .select('meaning')
    .lean();
  if (!words.length) throw new HttpError(404, 'Topic chưa có từ vựng');

  // User lấy từ token, không nhận từ client nên không giả danh được
  const user = req.userId || null;

  const ordered = shuffle(words);
  const session = await QuizSession.create({
    user,
    topic: topic._id,
    items: ordered.map((w) => ({ word: w._id })),
    expiresAt: new Date(Date.now() + config.quizSessionTtlMinutes * 60000),
  });

  const wordMap = {};
  ordered.forEach((w) => {
    wordMap[String(w._id)] = w.meaning;
  });

  res.status(201).json({
    sessionId: session._id,
    topic: { id: topic._id, name: topic.name },
    total: ordered.length,
    words: wordMap,
  });
});

// POST /api/vocabulary/quiz/:sessionId/check  { wordId, answer } -> { correct, ... }
// Mỗi từ chỉ được trả lời 1 lần/phiên. Trả lời hết từ cuối cùng thì tự chốt điểm.
exports.checkAnswer = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const wordId = requireId(req.body.wordId, 'wordId');
  if (typeof req.body.answer !== 'string') {
    throw new HttpError(400, 'answer phải là chuỗi');
  }

  // Hai lượt đọc database độc lập nhau nên chạy song song (mỗi lượt đi qua mạng tới Atlas)
  const [session, word] = await Promise.all([
    QuizSession.findById(sessionId).lean(),
    Vocabulary.findById(wordId).lean(),
  ]);
  if (!session) throw new HttpError(404, 'Không tìm thấy phiên quiz');
  assertOwner(session, req.userId);
  if (!session.items.some((i) => String(i.word) === wordId)) {
    throw new HttpError(404, 'Từ này không thuộc phiên quiz');
  }
  if (!word) throw new HttpError(404, 'Từ vựng đã bị xoá');

  const correct = normalize(req.body.answer) === normalize(word.word);

  // Cập nhật nguyên tử: chặn trả lời trùng / phiên đã xong / hết hạn
  const updated = await QuizSession.findOneAndUpdate(
    {
      _id: sessionId,
      finished: false,
      expiresAt: { $gt: new Date() },
      items: { $elemMatch: { word: wordId, answered: false } },
    },
    {
      $set: { 'items.$.answered': true, 'items.$.correct': correct },
      $inc: { answeredCount: 1, correctCount: correct ? 1 : 0 },
    },
    { new: true }
  ).lean();

  if (!updated) {
    if (session.finished) throw new HttpError(409, 'Phiên quiz đã kết thúc');
    if (session.expiresAt <= new Date()) {
      throw new HttpError(410, 'Phiên quiz đã hết hạn');
    }
    throw new HttpError(409, 'Từ này đã được trả lời');
  }

  const result =
    updated.answeredCount >= updated.items.length
      ? await finalize(updated._id)
      : null;

  res.json({
    correct,
    correctAnswer: word.word,
    audio: buildAudioUrl(word.word),
    answeredCount: updated.answeredCount,
    total: updated.items.length,
    finished: Boolean(result),
    ...(result && {
      score: result.score,
      correctCount: result.correctCount,
      streak: result.streak || null,
    }),
  });
});

// POST /api/vocabulary/quiz/:sessionId/finish  (kết thúc sớm, chưa trả lời = sai)
exports.finishQuiz = asyncHandler(async (req, res) => {
  const existing = await QuizSession.findById(req.params.sessionId)
    .select('user')
    .lean();
  if (!existing) throw new HttpError(404, 'Không tìm thấy phiên quiz');
  assertOwner(existing, req.userId);
  const result = await finalize(req.params.sessionId);
  res.json({ ...summary(result), streak: result.streak || null });
});
