const router = require('express').Router();
const c = require('../controllers/auth');
const { authRequired } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rateLimit');

// Giới hạn theo IP: chống dò mật khẩu, dò mã OTP và bắt server gửi email hàng loạt
const loginLimit = rateLimit({ name: 'login', windowSec: 15 * 60, max: 10, message: 'Đăng nhập sai quá nhiều lần, hãy thử lại sau ít phút' });
const registerLimit = rateLimit({ name: 'register', windowSec: 60 * 60, max: 8, message: 'Đăng ký quá nhiều lần từ địa chỉ này, hãy thử lại sau' });
const otpLimit = rateLimit({ name: 'otp', windowSec: 15 * 60, max: 15, message: 'Thử mã quá nhiều lần, hãy thử lại sau ít phút' });
const resendLimit = rateLimit({ name: 'resend', windowSec: 60 * 60, max: 10, message: 'Gửi lại mã quá nhiều lần, hãy thử lại sau' });

router.get('/config', c.publicConfig); // frontend hỏi: có bật OTP / Turnstile không
router.post('/register', registerLimit, c.register);
router.post('/verify-otp', otpLimit, c.verifyOtp);
router.post('/resend-otp', resendLimit, c.resendOtp);
router.post('/login', loginLimit, c.login);
router.get('/me', authRequired, c.me);

module.exports = router;
