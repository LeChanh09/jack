const mongoose = require('mongoose');

// Tỉ lệ hoàn thành / điểm gần nhất của user trên 1 topic (0-100)
const userTopicSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    ratio: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

userTopicSchema.index({ user: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('UserTopic', userTopicSchema);
