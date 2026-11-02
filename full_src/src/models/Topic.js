const mongoose = require('mongoose');

// Dùng chung cho reading và vocabulary, phân biệt bằng field `type`
const topicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, enum: ['reading', 'vocabulary'] },
  },
  { timestamps: true }
);

topicSchema.index({ type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Topic', topicSchema);
