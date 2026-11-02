'use strict';
// Dữ liệu mẫu cho chế độ "Dữ liệu mẫu trong trình duyệt": 6 chủ đề đọc hiểu, 14 bài đọc, 8 topic từ vựng.
const SEED = {
  readingTopics: ['Du lịch', 'Đời sống', 'Trường học', 'Công nghệ', 'Sức khoẻ', 'Môi trường'],
  // [chỉ số chủ đề, tiêu đề, nội dung (các đoạn cách nhau bằng \n)]
  readings: [
    [0, 'A weekend in Hội An', 'We arrived in Hội An on Friday evening. The old town was full of lanterns, and the river smelled of grilled corn.\nOn Saturday we rented bicycles and rode past rice fields to the beach. A woman sold us fresh coconuts for twenty thousand dong.'],
    [0, 'Taking the night train to Huế', 'The night train leaves at nine. Our cabin had four beds, and a quiet student from Đà Nẵng shared it with us.\nI slept badly, but I woke up to a pink sky over the mountains.'],
    [0, 'Street food in Hà Nội', 'Every morning, the streets of the Old Quarter fill with the smell of phở. Vendors carry baskets on their shoulders and call out to passers-by.\nMy favourite place is a tiny stall with six plastic stools. The owner remembers every customer, and he always asks if I want extra herbs.'],
    [1, 'Cooking for the first time', 'Last month I moved into a small flat. My mother called every day to ask what I had eaten.\nSo I learned to cook rice, boil eggs, and make a soup that was only slightly too salty.'],
    [1, 'My morning routine', 'I wake up at six and drink a glass of water before I do anything else. Then I stretch for ten minutes while the kettle boils.\nBreakfast is usually sticky rice or a bowl of noodles. I leave home at seven to avoid the traffic.'],
    [1, 'Rainy season in Sài Gòn', 'It rains almost every afternoon from May to October. The sky turns grey, the wind rises, and everyone rushes to find shelter.\nAfter an hour the water drains away and the city feels fresh. Children run outside to play in the puddles.'],
    [2, 'My first day at university', 'I was nervous when I entered the big gate. Hundreds of students were looking for their classrooms, and I could not find mine.\nA senior student showed me the way and gave me her phone number. By lunch I had three new friends.'],
    [2, 'How to prepare for an exam', 'Start two weeks early and make a simple timetable. Study one subject for an hour, then take a short break.\nDo not stay up all night before the exam. A good sleep helps you remember more than another hour of reading.'],
    [3, 'Learning English with my phone', 'I use my phone for ten minutes every day to review new words. Short lessons are easier to finish than long ones.\nI also listen to English songs on the bus. At first I understood almost nothing, but now I can follow the chorus.'],
    [3, 'The problem with social media', 'Many teenagers check their phones more than a hundred times a day. They say it helps them stay in touch with friends.\nHowever, too much screen time can make it hard to sleep. Some families now keep all phones in a basket during dinner.'],
    [4, 'Why we should drink more water', 'Our bodies are about sixty percent water, so we need to drink every day. Many people only drink when they feel thirsty, but by then the body is already tired.\nA simple habit is to keep a bottle on your desk. Try to finish two bottles before lunch and one more before dinner.'],
    [4, 'Walking to work', 'Last year my doctor told me to exercise more. I did not have time for the gym, so I started walking to work instead.\nIt takes forty minutes, but I enjoy it. I listen to the radio, say hello to the neighbours, and arrive with a clear head.'],
    [5, 'Plastic bags at the market', 'My grandmother used to take a bamboo basket to the market. Today most sellers wrap everything in thin plastic bags, even a single lemon.\nOur class counted forty bags in one morning. We now carry cloth bags and ask the sellers to skip the plastic.'],
    [5, 'Planting trees on Sunday', 'Every first Sunday of the month, our neighbourhood plants trees along the canal. Old and young people work together, and someone always brings iced tea.\nThe young trees are small, but in ten years they will give shade to the whole street.'],
  ],
  // [tên topic, 'từ=nghĩa; từ=nghĩa; ...']
  vocab: [
    ['Gia đình', 'mother=mẹ; father=bố; brother=anh hoặc em trai; sister=chị hoặc em gái; grandmother=bà; grandfather=ông; uncle=chú hoặc bác; aunt=cô hoặc dì; cousin=anh chị em họ; parents=bố mẹ; husband=chồng; wife=vợ'],
    ['Đồ ăn', 'bread=bánh mì; rice=cơm; chicken=thịt gà; soup=canh; noodle=mì sợi; egg=trứng; fish=cá; vegetable=rau; fruit=trái cây; sugar=đường; pork=thịt lợn; beef=thịt bò'],
    ['Trường học', 'teacher=giáo viên; student=học sinh; classroom=lớp học; homework=bài tập về nhà; exam=kỳ thi; lesson=bài học; library=thư viện; notebook=vở; pencil=bút chì; desk=bàn học; schedule=thời khoá biểu; grade=điểm số'],
    ['Du lịch', 'ticket=vé; passport=hộ chiếu; luggage=hành lý; hotel=khách sạn; airport=sân bay; map=bản đồ; journey=chuyến đi; beach=bãi biển; mountain=núi; souvenir=quà lưu niệm; guide=hướng dẫn viên; tourist=khách du lịch'],
    ['Công nghệ', 'computer=máy tính; keyboard=bàn phím; password=mật khẩu; website=trang web; battery=pin; screen=màn hình; download=tải xuống; internet=mạng; camera=máy ảnh; software=phần mềm'],
    ['Sức khoẻ', 'doctor=bác sĩ; medicine=thuốc; headache=đau đầu; fever=sốt; cough=ho; exercise=tập thể dục; hospital=bệnh viện; healthy=khoẻ mạnh; vitamin=vitamin; sleep=giấc ngủ'],
    ['Thời tiết', 'rain=mưa; sunny=nắng; cloud=mây; wind=gió; storm=bão; thunder=sấm; snow=tuyết; humid=ẩm; temperature=nhiệt độ; forecast=dự báo'],
    ['Nghề nghiệp', 'engineer=kỹ sư; nurse=y tá; farmer=nông dân; driver=tài xế; lawyer=luật sư; chef=đầu bếp; dentist=nha sĩ; accountant=kế toán; designer=nhà thiết kế; journalist=nhà báo'],
  ],
};

// Biến SEED thành các mảng có _id, cùng hình dạng với dữ liệu từ MongoDB
function buildSeed() {
  const rt = SEED.readingTopics.map((name, i) => ({ _id: 'rt' + (i + 1), name }));
  const reads = SEED.readings.map(([t, title, content], i) => ({
    _id: 'rd' + (i + 1), topic: rt[t]._id, title, content, createdAt: 1000 - i,
  }));
  const vt = SEED.vocab.map(([name], i) => ({ _id: 'vt' + (i + 1), name }));
  const words = [];
  SEED.vocab.forEach(([, list], i) => {
    list.split('; ').forEach((pair) => {
      const [word, meaning] = pair.split('=');
      words.push({ _id: 'w' + (words.length + 1), topic: vt[i]._id, word, meaning });
    });
  });
  return { rt, reads, vt, words };
}

// Cho phép script seed của backend dùng chung bộ dữ liệu này (trình duyệt bỏ qua dòng này)
if (typeof module !== 'undefined') module.exports = { SEED, buildSeed };
