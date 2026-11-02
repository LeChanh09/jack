const mongoose = require('mongoose');

// Phiên làm quiz từ vựng, tạo khi GET danh sách từ của 1 topic
const itemSchema = new mongoose.Schema(
  {
    word: { type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary', required: true },
    answered: { type: Boolean, default: false },
    correct: { type: Boolean, default: false },
  },
  { _id: false }
);

const quizSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    items: { type: [itemSchema], default: [] },
    answeredCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    finished: { type: Boolean, default: false },
    score: { type: Number, default: null }, // 0-100, có khi finished
    // MongoDB tự xoá phiên hết hạn (TTL index)
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QuizSession', quizSessionSchema);
