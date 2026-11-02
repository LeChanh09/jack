const mongoose = require('mongoose');
const { buildAudioUrl } = require('../utils/audio');

const vocabularySchema = new mongoose.Schema(
  {
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    word: { type: String, required: true, trim: true, maxlength: 100 },
    meaning: { type: String, required: true, trim: true, maxlength: 300 }, // nghĩa tiếng Việt
  },
  { timestamps: true, toJSON: { virtuals: true }, id: false }
);

vocabularySchema.index({ topic: 1, word: 1 }, { unique: true });

// Chỉ trả ra ở chế độ học. KHÔNG đưa vào danh sách quiz vì URL chứa luôn đáp án.
vocabularySchema.virtual('audio').get(function audio() {
  return buildAudioUrl(this.word);
});

module.exports = mongoose.model('Vocabulary', vocabularySchema);
