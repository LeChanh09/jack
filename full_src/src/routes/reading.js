const router = require('express').Router();
const c = require('../controllers/reading');
const { idParam } = require('../utils/validate');
const { authOptional, adminRequired } = require('../middlewares/auth');

router.param('id', idParam);
router.param('topicId', idParam);

// '/topics' phải khai báo trước '/:id'
router.get('/topics', c.listTopics);
router.post('/topics', adminRequired, c.createTopic);
router.put('/topics/:topicId', adminRequired, c.updateTopic);
router.delete('/topics/:topicId', adminRequired, c.deleteTopic);

router.get('/', c.listReadings);
router.post('/', adminRequired, c.createReading);
router.get('/:id', authOptional, c.getReading);
router.put('/:id', adminRequired, c.updateReading);
router.delete('/:id', adminRequired, c.deleteReading);

module.exports = router;
