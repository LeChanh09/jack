const mongoose = require('mongoose');
const config = require('./index');

// Giữ một kết nối dùng lại giữa các lần gọi. Trên Vercel (serverless) mỗi lần "khởi động nguội"
// chạy lại module, còn các lần gọi sau trên cùng instance dùng lại kết nối này nên không mở kết nối mới liên tục.
const cache = global.__mongoose || (global.__mongoose = { conn: null, promise: null });

module.exports = async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
      .catch((err) => {
        cache.promise = null; // lần sau thử kết nối lại thay vì giữ lỗi cũ
        throw err;
      });
  }
  cache.conn = await cache.promise;
  console.log('MongoDB connected');
  return cache.conn;
};
