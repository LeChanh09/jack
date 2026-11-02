const HttpError = require('./httpError');

const ID_RE = /^[a-f\d]{24}$/i;

// Chỉ nhận string 24 ký tự hex -> chặn luôn kiểu object injection ({ "$ne": ... })
const isId = (v) => typeof v === 'string' && ID_RE.test(v);

// Dùng với router.param('tenParam', idParam)
function idParam(req, res, next, value, name) {
  if (!isId(value)) return next(new HttpError(400, `${name} không hợp lệ`));
  return next();
}

function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${field} là bắt buộc`);
  }
  return value.trim();
}

function requireId(value, field) {
  if (!isId(value)) throw new HttpError(400, `${field} không hợp lệ`);
  return value;
}

module.exports = { isId, idParam, requireString, requireId };
