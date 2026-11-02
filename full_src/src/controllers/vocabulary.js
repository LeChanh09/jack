const Topic = require('../models/Topic');
const Vocabulary = require('../models/Vocabulary');
const UserTopic = require('../models/UserTopic');
const QuizSession = require('../models/QuizSession');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { requireString } = require('../utils/validate');

async function findTopic(id) {
  const topic = await Topic.findOne({ _id: id, type: 'vocabulary' }).lean();
  if (!topic) throw new HttpError(404, 'Không tìm thấy topic từ vựng');
  return topic;
}

// GET /api/vocabulary/topics
exports.listTopics = asyncHandler(async (req, res) => {
  const [topics, counts] = await Promise.all([
    Topic.find({ type: 'vocabulary' }).sort('name').lean(),
    Vocabulary.aggregate([{ $group: { _id: '$topic', count: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json(
    topics.map((t) => ({ ...t, wordCount: countMap.get(String(t._id)) || 0 }))
  );
});

// GET /api/vocabulary/topics/:topicId  (chế độ học: có word, meaning, audio)
exports.getTopic = asyncHandler(async (req, res) => {
  const topic = await findTopic(req.params.topicId);
  const words = await Vocabulary.find({ topic: topic._id }).sort('word');
  res.json({ ...topic, words });
});

// POST /api/vocabulary/topics  { name }
exports.createTopic = asyncHandler(async (req, res) => {
  const name = requireString(req.body.name, 'name');
  const topic = await Topic.create({ name, type: 'vocabulary' });
  res.status(201).json(topic);
});

// PUT /api/vocabulary/topics/:topicId  { name }
exports.updateTopic = asyncHandler(async (req, res) => {
  const name = requireString(req.body.name, 'name');
  const topic = await Topic.findOneAndUpdate(
    { _id: req.params.topicId, type: 'vocabulary' },
    { $set: { name } },
    { new: true, runValidators: true }
  );
  if (!topic) throw new HttpError(404, 'Không tìm thấy topic từ vựng');
  res.json(topic);
});

// DELETE /api/vocabulary/topics/:topicId  (xoá kèm từ vựng, tiến độ, phiên quiz)
exports.deleteTopic = asyncHandler(async (req, res) => {
  const topic = await findTopic(req.params.topicId);
  await Promise.all([
    Vocabulary.deleteMany({ topic: topic._id }),
    UserTopic.deleteMany({ topic: topic._id }),
    QuizSession.deleteMany({ topic: topic._id }),
  ]);
  await Topic.deleteOne({ _id: topic._id });
  res.status(204).end();
});

// POST /api/vocabulary/topics/:topicId/words  { word, meaning }
exports.addWord = asyncHandler(async (req, res) => {
  const topic = await findTopic(req.params.topicId);
  const word = requireString(req.body.word, 'word');
  const meaning = requireString(req.body.meaning, 'meaning');
  const doc = await Vocabulary.create({ topic: topic._id, word, meaning });
  res.status(201).json(doc);
});

// PUT /api/vocabulary/topics/:topicId/words/:wordId  { word?, meaning? }
exports.updateWord = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.word !== undefined) {
    update.word = requireString(req.body.word, 'word');
  }
  if (req.body.meaning !== undefined) {
    update.meaning = requireString(req.body.meaning, 'meaning');
  }
  if (!Object.keys(update).length) {
    throw new HttpError(400, 'Không có dữ liệu để cập nhật');
  }
  const doc = await Vocabulary.findOneAndUpdate(
    { _id: req.params.wordId, topic: req.params.topicId },
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!doc) throw new HttpError(404, 'Không tìm thấy từ vựng');
  res.json(doc);
});

// DELETE /api/vocabulary/topics/:topicId/words/:wordId
exports.deleteWord = asyncHandler(async (req, res) => {
  const result = await Vocabulary.deleteOne({
    _id: req.params.wordId,
    topic: req.params.topicId,
  });
  if (!result.deletedCount) throw new HttpError(404, 'Không tìm thấy từ vựng');
  res.status(204).end();
});

exports.findTopic = findTopic;
