const router = require('express').Router();
const c = require('../controllers/vocabulary');
const q = require('../controllers/vocabularyQuiz');
const { idParam } = require('../utils/validate');
const { authOptional, adminRequired } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rateLimit');

// Mỗi lần mở bài quiz tạo một bản ghi phiên trong database nên cần giới hạn để không bị làm đầy
const quizStartLimit = rateLimit({ name: 'quiz-start', windowSec: 10 * 60, max: 60 });

router.param('topicId', idParam);
router.param('wordId', idParam);
router.param('sessionId', idParam);

// Topic: xem công khai, thêm sửa xoá chỉ quản trị viên
router.get('/topics', c.listTopics);
router.post('/topics', adminRequired, c.createTopic);
router.get('/topics/:topicId', c.getTopic);
router.put('/topics/:topicId', adminRequired, c.updateTopic);
router.delete('/topics/:topicId', adminRequired, c.deleteTopic);

// Từ vựng trong topic
router.post('/topics/:topicId/words', adminRequired, c.addWord);
router.put('/topics/:topicId/words/:wordId', adminRequired, c.updateWord);
router.delete('/topics/:topicId/words/:wordId', adminRequired, c.deleteWord);

// Quiz: GET words tạo session (có token thì gắn phiên với user), rồi check từng đáp án, finish
router.get('/topics/:topicId/words', authOptional, quizStartLimit, q.startQuiz);
router.post('/quiz/:sessionId/check', authOptional, q.checkAnswer);
router.post('/quiz/:sessionId/finish', authOptional, q.finishQuiz);

module.exports = router;
