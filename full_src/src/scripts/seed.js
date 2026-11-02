// Nạp dữ liệu mẫu vào MongoDB: npm run seed
// Chỉ thêm những gì chưa có (so theo tên/tiêu đề/từ), nên chạy lại nhiều lần vẫn an toàn.
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Topic = require('../models/Topic');
const Reading = require('../models/Reading');
const Vocabulary = require('../models/Vocabulary');
const { SEED } = require('../../public/mock-data.js');

async function upsertTopic(name, type) {
  return Topic.findOneAndUpdate(
    { name, type },
    { $setOnInsert: { name, type } },
    { upsert: true, new: true }
  );
}

async function main() {
  await connectDB();
  const count = { topics: 0, readings: 0, words: 0 };

  const readingTopics = [];
  for (const name of SEED.readingTopics) {
    readingTopics.push(await upsertTopic(name, 'reading'));
    count.topics += 1;
  }
  for (const [ti, title, content] of SEED.readings) {
    const r = await Reading.updateOne(
      { title },
      { $setOnInsert: { topic: readingTopics[ti]._id, title, content } },
      { upsert: true }
    );
    count.readings += r.upsertedCount;
  }

  for (const [name, list] of SEED.vocab) {
    const topic = await upsertTopic(name, 'vocabulary');
    count.topics += 1;
    for (const pair of list.split('; ')) {
      const [word, meaning] = pair.split('=');
      const r = await Vocabulary.updateOne(
        { topic: topic._id, word },
        { $setOnInsert: { topic: topic._id, word, meaning } },
        { upsert: true }
      );
      count.words += r.upsertedCount;
    }
  }

  console.log(`Đã thêm mới: ${count.readings} bài đọc, ${count.words} từ vựng (topic đã đảm bảo đủ).`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Seed lỗi:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
