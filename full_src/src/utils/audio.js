const { audioBaseUrl } = require('../config');

// Quy tắc theo ví dụ: hello -> h/hel/hello/hello.mp3
// Từ ngắn hơn 3 ký tự được đệm bằng "_" (chưa kiểm chứng với mọi từ).
// Trả về null nếu từ chứa ký tự lạ -> frontend nên ẩn nút phát âm.
function buildAudioUrl(word) {
  if (typeof word !== 'string') return null;
  const slug = word.trim().toLowerCase().replace(/\s+/g, '_');
  if (!/^[a-z_-]+$/.test(slug)) return null;
  const first = slug[0];
  const three = slug.slice(0, 3).padEnd(3, '_');
  return `${audioBaseUrl}/${first}/${three}/${slug}/${slug}.mp3`;
}

module.exports = { buildAudioUrl };
