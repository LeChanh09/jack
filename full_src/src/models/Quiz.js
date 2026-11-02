const mongoose = require('mongoose');

// Mỗi lần mở 1 bài reading sẽ upsert 1 bản ghi quiz đi kèm topic của bài đó
const quizSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['reading'], default: 'reading' },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    reading: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reading',
      required: true,
      unique: true,
    },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
