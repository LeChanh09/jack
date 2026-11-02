const app = require('./app');
const config = require('./config');
const connectDB = require('./config/db');

connectDB()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Server chạy tại http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('Không kết nối được MongoDB:', err.message);
    process.exit(1);
  });
