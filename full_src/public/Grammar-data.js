'use strict';

const GRAMMAR_DATA = [
  {
    id: 'lesson-5',
    title: 'Lesson 5: There + To Be & Sở hữu tính từ',
    theory: `
      <h3>1. Cấu trúc There + To Be ("Có" - diễn tả sự tồn tại)</h3>
      <p><b>Hiện tại:</b></p>
      <ul>
        <li>Số ít / không đếm được: <code>There is + N (sing/unc)</code></li>
        <li>Số nhiều: <code>There are + N (plural)</code></li>
        <li>Phủ định: <code>There isn't any... / There aren't any...</code></li>
        <li>Nghi vấn: <code>Is there any...? / Are there any...?</code></li>
      </ul>
      <p><b>Quá khứ:</b> <code>There was / There were</code> (Phủ định: <code>wasn't / weren't</code>)</p>
      <p><b>Tương lai:</b> <code>There will be</code> (Phủ định: <code>There won't be</code>)</p>
      <p><b>Còn lại:</b> <code>There + to be + N + left...</code> (VD: There is little sugar left in the jar.)</p>
      <hr style="border:0;border-top:1px dashed var(--rule);margin:16px 0">
      <h3>2. Lượng từ: Many / Much / Few / Little</h3>
      <ul>
        <li><b>Many:</b> Nhiều (danh từ đếm được) | <b>Few:</b> Ít (đếm được)</li>
        <li><b>Much:</b> Nhiều (không đếm được) | <b>Little:</b> Ít (không đếm được)</li>
        <li><b>A few / A little:</b> Một vài, một ít</li>
      </ul>
    `,
    vocab: [
      { word: 'ashtray', meaning: 'cái gạt tàn thuốc' },
      { word: 'under', meaning: 'ở dưới' },
      { word: 'table', meaning: 'cái bàn' },
      { word: 'jar', meaning: 'cái lọ' },
      { word: 'pepper', meaning: 'tiêu' },
      { word: 'kettle', meaning: 'cái ấm' },
      { word: 'ice', meaning: 'nước đá' },
      { word: 'guest', meaning: 'người khách' },
      { word: 'cucumber', meaning: 'dưa chuột' },
      { word: 'basket', meaning: 'cái rổ' }
    ],
    exercises: [
      {
        code: '5.1',
        name: 'Bài tập 5.1 (There + To be cơ bản)',
        sentences: [
          {
            id: 1,
            vi: 'Dưới bàn của tôi có 1 gạt tàn thuốc.',
            ans: ['there is an ashtray under my table', 'there is one ashtray under my table', 'under my table there is an ashtray']
          },
          {
            id: 2,
            vi: 'Trong lớp của bạn có phải có 12 sinh viên ?',
            ans: ['are there 12 students in your class', 'are there twelve students in your class']
          },
          {
            id: 3,
            vi: 'Tối hôm qua có 2 cơn mưa rào.',
            ans: ['last night there were two showers', 'last night there were 2 showers', 'there were two showers last night', 'there were 2 showers last night']
          },
          {
            id: 4,
            vi: 'Ngày mai sẽ có bài tập về nhà làm.',
            ans: ['tomorrow there will be homework to do', 'there will be homework to do tomorrow']
          },
          {
            id: 5,
            vi: 'Không có tiêu trong lọ.',
            ans: ['there is no pepper in the jar', 'there is not any pepper in the jar', 'there isnt any pepper in the jar']
          },
          {
            id: 6,
            vi: 'Trên con đường này có 2 trường học.',
            ans: ['there are two schools on this road', 'there are 2 schools on this road', 'on this road there are two schools']
          },
          {
            id: 7,
            vi: 'Tối hôm qua có phải trong nhà của họ có 3 người khách ?',
            ans: ['were there three guests in their house last night', 'were there 3 guests in their house last night']
          },
          {
            id: 8,
            vi: 'Hôm qua không có giáo viên nào ở đây.',
            ans: ['yesterday there were no teachers here', 'there were no teachers here yesterday', 'there werent any teachers here yesterday']
          },
          {
            id: 9,
            vi: 'Có phải trong ấm có nước đá ?',
            ans: ['is there ice in the kettle', 'is there any ice in the kettle']
          },
          {
            id: 10,
            vi: 'Có phải sẽ có một cuộc phỏng vấn trong cơ quan của bạn ngày mai ?',
            ans: ['will there be an interview in your office tomorrow', 'will there be a meeting in your office tomorrow']
          }
        ]
      },
      {
        code: '5.2',
        name: 'Bài tập 5.2 (Vật dụng, nơi chốn)',
        sentences: [
          {
            id: 1,
            vi: 'Có phải trên bàn của anh ấy có 2 cây thước ?',
            ans: ['are there two rulers on his table', 'are there 2 rulers on his table']
          },
          {
            id: 2,
            vi: 'Sẽ không có cuộc họp nào trong cơ quan của tôi ngày mai.',
            ans: ['there will be no meetings in my office tomorrow', 'there wont be any meetings in my office tomorrow']
          },
          {
            id: 3,
            vi: 'Trong rổ có 3 trái dưa chuột.',
            ans: ['there are three cucumbers in the basket', 'there are 3 cucumbers in the basket', 'in the basket there are three cucumbers']
          },
          {
            id: 4,
            vi: 'Tối hôm qua trên ti vi có 2 vở kịch.',
            ans: ['last night there were two plays on television', 'there were two plays on television last night', 'there were 2 plays on tv last night']
          },
          {
            id: 5,
            vi: 'Không có gạo trong bao.',
            ans: ['there is no rice in the bag', 'there isnt any rice in the bag']
          }
        ]
      }
    ]
  },
  {
    id: 'lesson-6',
    title: 'Lesson 6: Động từ thường & Câu dịch',
    theory: `
      <h3>1. Thì hiện tại đơn với Động từ thường</h3>
      <ul>
        <li>Khẳng định: <code>S + V(s/es)</code> (He/She/It thêm s/es; tận cùng O, S, X, Z, CH, SH thêm -es)</li>
        <li>Phủ định: <code>S + do not / does not + V(nguyên mẫu)</code></li>
        <li>Nghi vấn: <code>Do / Does + S + V(nguyên mẫu)?</code></li>
      </ul>
      <hr style="border:0;border-top:1px dashed var(--rule);margin:16px 0">
      <h3>2. Thì quá khứ đơn</h3>
      <ul>
        <li>Động từ có quy tắc: thêm <code>-ed</code> (VD: wash &rarr; washed, stop &rarr; stopped)</li>
        <li>Động từ bất quy tắc: Cột 2 (VD: buy &rarr; bought, sell &rarr; sold, see &rarr; saw)</li>
        <li>Phủ định: <code>S + did not (didn't) + V(nguyên mẫu)</code></li>
      </ul>
    `,
    vocab: [
      { word: 'fry', meaning: 'chiên, rán' },
      { word: 'fish', meaning: 'con cá' },
      { word: 'kitchen', meaning: 'nhà bếp' },
      { word: 'review', meaning: 'ôn tập' },
      { word: 'dictionary', meaning: 'từ điển' },
      { word: 'address', meaning: 'địa chỉ' }
    ],
    exercises: [
      {
        code: '6.1',
        name: 'Bài tập 6.1 (Hiện tại đơn)',
        sentences: [
          {
            id: 1,
            vi: 'Mẹ của em chiên cá trong nhà bếp.',
            ans: ['my mother fries fish in the kitchen']
          },
          {
            id: 2,
            vi: 'Cô ấy có hai con.',
            ans: ['she has two children', 'she has 2 children']
          },
          {
            id: 3,
            vi: 'Cha của tôi mua hai quyển từ điển.',
            ans: ['my father buys two dictionaries', 'my father bought two dictionaries']
          },
          {
            id: 4,
            vi: 'Anh ấy biết địa chỉ của tôi.',
            ans: ['he knows my address']
          }
        ]
      }
    ]
  }
];