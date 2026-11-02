const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  vi: { type: String, required: true },      // "Dưới bàn của tôi có 1 gạt tàn thuốc."
  enAnswers: [{ type: String, required: true }] // ["There is an ashtray under my table.", "Under my table, there is an ashtray."]
}, { _id: true });

const newWordSchema = new mongoose.Schema({
  word: { type: String, required: true },     // "ashtray"
  phonetic: { type: String },                 // "/'æʃtrei/"
  meaning: { type: String, required: true }   // "cái gạt tàn thuốc"
}, { _id: false });

const grammarLessonSchema = new mongoose.Schema({
  lessonNumber: { type: Number, required: true, unique: true }, // Ví dụ: 5 (Lesson Five)
  title: { type: String, required: true },                      // "THERE + TO BE & SỞ HỮU TÍNH TỪ"
  theoryMarkdown: { type: String, required: true },             // Tóm tắt công thức, bài thơ mẹo
  newWords: [newWordSchema],                                    // Danh sách từ mới của bài
  exercises: [
    {
      exerciseCode: { type: String, required: true },           // "BÀI TẬP 5.1"
      sentences: [sentenceSchema]                               // Danh sách các câu bài tập
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('GrammarLesson', grammarLessonSchema);