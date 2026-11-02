// Ngày theo múi giờ Việt Nam, dạng YYYY-MM-DD.
// Việt Nam không có giờ mùa hè nên lùi đúng 24 giờ là ra "hôm qua".
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const vnDate = (d = new Date()) => fmt.format(d);
const vnYesterday = () => vnDate(new Date(Date.now() - 86400000));

module.exports = { vnDate, vnYesterday };
