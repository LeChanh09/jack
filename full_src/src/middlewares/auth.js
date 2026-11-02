const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const HttpError = require('../utils/httpError');

function readToken(req) {
  const header = req.headers.authorization;
  return header && header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Bắt buộc đăng nhập: đọc JWT, gán req.userId
function authRequired(req, res, next) {
  const token = readToken(req);
  if (!token) return next(new HttpError(401, 'Chưa đăng nhập'));
  try {
    req.userId = jwt.verify(token, config.jwtSecret).id;
    return next();
  } catch (e) {
    return next(new HttpError(401, 'Token không hợp lệ hoặc đã hết hạn'));
  }
}

// Có token hợp lệ thì gán req.userId, không thì vẫn cho qua (khách)
function authOptional(req, res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.userId = jwt.verify(token, config.jwtSecret).id;
    } catch (e) {
      // token sai coi như khách
    }
  }
  next();
}

// Chỉ quản trị viên: dùng cho các thao tác thêm, sửa, xoá nội dung học
function adminRequired(req, res, next) {
  authRequired(req, res, (err) => {
    if (err) return next(err);
    return User.findById(req.userId)
      .select('role')
      .lean()
      .then((u) => {
        if (!u) return next(new HttpError(401, 'Tài khoản không còn tồn tại'));
        if (u.role !== 'admin') {
          return next(new HttpError(403, 'Chỉ quản trị viên được thực hiện thao tác này'));
        }
        return next();
      })
      .catch(next);
  });
}

module.exports = { authRequired, authOptional, adminRequired };
