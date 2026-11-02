const Topic = require('../models/Topic');
const Reading = require('../models/Reading');
const Quiz = require('../models/Quiz');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { requireString, requireId } = require('../utils/validate');
const { touchStreak } = require('../utils/streak');

// GET /api/reading/topics
exports.listTopics = asyncHandler(async (req, res) => {
  const topics = await Topic.find({ type: 'reading' }).sort('name').lean();
  res.json(topics);
});

// POST /api/reading/topics  { name }
exports.createTopic = asyncHandler(async (req, res) => {
  const name = requireString(req.body.name, 'name');
  const topic = await Topic.create({ name, type: 'reading' });
  res.status(201).json(topic);
});

// PUT /api/reading/topics/:topicId  { name }
exports.updateTopic = asyncHandler(async (req, res) => {
  const name = requireString(req.body.name, 'name');
  const topic = await Topic.findOneAndUpdate(
    { _id: req.params.topicId, type: 'reading' },
    { $set: { name } },
    { new: true, runValidators: true }
  );
  if (!topic) throw new HttpError(404, 'Không tìm thấy topic reading');
  res.json(topic);
});

// DELETE /api/reading/topics/:topicId  (xoá kèm bài đọc và bản ghi quiz của topic)
exports.deleteTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findOne({ _id: req.params.topicId, type: 'reading' });
  if (!topic) throw new HttpError(404, 'Không tìm thấy topic reading');
  await Promise.all([
    Reading.deleteMany({ topic: topic._id }),
    Quiz.deleteMany({ topic: topic._id }),
  ]);
  await Topic.deleteOne({ _id: topic._id });
  res.status(204).end();
});

// GET /api/reading?topic=<topicId>  (không có content, chỉ danh sách)
exports.listReadings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.topic !== undefined) {
    filter.topic = requireId(req.query.topic, 'topic');
  }
  const readings = await Reading.find(filter)
    .select('title topic createdAt')
    .sort('-createdAt')
    .lean();
  res.json(readings);
});

// POST /api/reading  { topic, title, content }
exports.createReading = asyncHandler(async (req, res) => {
  const topicId = requireId(req.body.topic, 'topic');
  const title = requireString(req.body.title, 'title');
  const content = requireString(req.body.content, 'content');

  const topic = await Topic.exists({ _id: topicId, type: 'reading' });
  if (!topic) throw new HttpError(404, 'Không tìm thấy topic reading');

  const reading = await Reading.create({ topic: topicId, title, content });
  res.status(201).json(reading);
});

// PUT /api/reading/:id  { topic?, title?, content? }
exports.updateReading = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body.title !== undefined) update.title = requireString(req.body.title, 'title');
  if (req.body.content !== undefined) update.content = requireString(req.body.content, 'content');
  if (req.body.topic !== undefined) {
    const topicId = requireId(req.body.topic, 'topic');
    if (!(await Topic.exists({ _id: topicId, type: 'reading' }))) {
      throw new HttpError(404, 'Không tìm thấy topic reading');
    }
    update.topic = topicId;
  }
  if (!Object.keys(update).length) {
    throw new HttpError(400, 'Không có dữ liệu để cập nhật');
  }
  const reading = await Reading.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!reading) throw new HttpError(404, 'Không tìm thấy bài đọc');
  // Giữ bản ghi quiz khớp với topic mới của bài
  if (update.topic) {
    await Quiz.updateOne({ reading: reading._id }, { $set: { topic: update.topic } });
  }
  res.json(reading);
});

// DELETE /api/reading/:id
exports.deleteReading = asyncHandler(async (req, res) => {
  const result = await Reading.deleteOne({ _id: req.params.id });
  if (!result.deletedCount) throw new HttpError(404, 'Không tìm thấy bài đọc');
  await Quiz.deleteOne({ reading: req.params.id });
  res.status(204).end();
});

// GET /api/reading/:id
// Trả bài đọc + upsert vào collection quiz (kèm topic). Có đăng nhập thì tính vào chuỗi ngày học.
exports.getReading = asyncHandler(async (req, res) => {
  const reading = await Reading.findById(req.params.id).lean();
  if (!reading) throw new HttpError(404, 'Không tìm thấy bài đọc');

  const [topic, quiz, streak] = await Promise.all([
    Topic.findById(reading.topic).lean(),
    Quiz.findOneAndUpdate(
      { reading: reading._id },
      {
        $set: { topic: reading.topic },
        $setOnInsert: { type: 'reading' },
        $inc: { views: 1 },
      },
      { upsert: true, new: true }
    ).lean(),
    req.userId ? touchStreak(req.userId) : null,
  ]);

  res.json({ reading, topic, quiz, streak });
});
