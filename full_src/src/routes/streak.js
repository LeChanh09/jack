const router = require('express').Router();
const c = require('../controllers/streak');
const { authRequired } = require('../middlewares/auth');

router.use(authRequired);
router.post('/ping', c.ping);
router.get('/', c.getStreak);

module.exports = router;
