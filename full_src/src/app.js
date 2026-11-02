const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();
app.disable('x-powered-by');
// Đứng sau proxy của Vercel: lấy IP thật của người dùng từ X-Forwarded-For (dùng cho captcha và giới hạn truy cập)
app.set('trust proxy', 1);

// Header bảo mật cơ bản. Chưa đặt Content-Security-Policy vì trang dùng Google Fonts và script Turnstile của Cloudflare,
// cần khai báo từng nguồn cẩn thận trước khi bật.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (config.isProd) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
});

// Khi chạy thật: chỉ cho các tên miền trong CORS_ORIGIN gọi API từ trình duyệt.
// Frontend và API cùng một tên miền (như trên Vercel) thì không cần đặt gì, cùng nguồn vẫn hoạt động.
app.use(cors(config.isProd ? { origin: config.corsOrigins.length ? config.corsOrigins : false } : undefined));
app.use(express.json({ limit: '100kb' }));
// Giao diện demo: http://localhost:<PORT>/ (thư mục public). Trên Vercel, thư mục public do CDN phục vụ.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
