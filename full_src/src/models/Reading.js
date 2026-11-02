const mongoose = require('mongoose');

// Gắn topic trực tiếp vào bài đọc (thay cho bảng nối reading_ id_topic | id_reading)
const readingSchema = new mongoose.Schema(
  {
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 20000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reading', readingSchema);
