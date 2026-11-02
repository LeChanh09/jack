const HttpError = require('../utils/httpError');

function notFound(req, res, next) {
  next(new HttpError(404, 'Route không tồn tại'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map((e) => e.message).join('; ');
    return res.status(400).json({ error: msg });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Giá trị không hợp lệ: ${err.path}` });
  }
  if (err.code === 11000) {
    const msg =
      err.keyPattern && err.keyPattern.email
        ? 'Email đã được đăng ký hoặc đang chờ xác thực'
        : 'Dữ liệu đã tồn tại';
    return res.status(409).json({ error: msg });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON không hợp lệ' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Lỗi server' });
}

module.exports = { notFound, errorHandler };
