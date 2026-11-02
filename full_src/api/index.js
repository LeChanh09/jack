// Điểm vào cho Vercel: mọi yêu cầu /api/* được chuyển về đây (xem vercel.json).
// Chạy local vẫn dùng src/server.js như cũ.
const app = require('../src/app');
const connectDB = require('../src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Không kết nối được MongoDB:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Không kết nối được cơ sở dữ liệu' }));
    return;
  }
  app(req, res);
};
