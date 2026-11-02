const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/reading', require('./reading'));
router.use('/vocabulary', require('./vocabulary'));
router.use('/streak', require('./streak'));

module.exports = router;
