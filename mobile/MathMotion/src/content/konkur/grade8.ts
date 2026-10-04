import type { KonkurQuestion, KonkurTip } from './types';

export const GRADE8_TIPS: KonkurTip[] = [
  {
    id: 'g8_polygon_angles',
    grade: 8,
    chapterId: 'g8_polygons',
    title: 'زاویه‌های چندضلعی: داخلی (n − 2) × 180، خارجی همیشه 360',
    body: [
      'مجموع زاویه‌های داخلی هر n‌ضلعی:',
      { math: '(n - 2) × 180°' },
      'مجموع زاویه‌های خارجی هر چندضلعی محدب، با هر تعداد ضلع، همیشه ۳۶۰ درجه است.',
      'در چندضلعی منتظم همه‌ی زاویه‌ها برابرند. پس هر زاویه‌ی خارجی 360/n است و راحت‌ترین راه پیدا کردن n همین است.',
    ],
    example: {
      question: ['هر زاویه‌ی داخلی یک چندضلعی منتظم ۱۵۰ درجه است. چند ضلع دارد؟'],
      solution: [
        'زاویه‌ی خارجی = ۱۸۰ − ۱۵۰ = ۳۰ درجه. پس:',
        { math: 'n = 360 / 30 = 12' },
      ],
    },
  },
  {
    id: 'g8_difference_squares',
    grade: 8,
    chapterId: 'g8_algebra',
    title: 'اتحاد مزدوج برای حساب سریع',
    body: [
      { math: 'a^2 - b^2 = (a - b)(a + b)' },
      'این اتحاد فقط برای تجزیه نیست؛ هر جا تفاضل دو مربع دیدی، حساب را با آن کوتاه کن. مثلاً به‌جای حساب کردن 51² و 49²:',
      { math: '51^2 - 49^2 = (51 - 49)(51 + 49) = 2 × 100 = 200' },
    ],
  },
  {
    id: 'g8_pythagorean_triples',
    grade: 8,
    chapterId: 'g8_triangle',
    title: 'سه‌تایی‌های فیثاغورسی را حفظ کن',
    body: [
      'این ضلع‌ها مثلث قائم‌الزاویه می‌سازند و در تست‌ها زیاد تکرار می‌شوند:',
      { math: '3, 4, 5   ;   5, 12, 13   ;   8, 15, 17   ;   7, 24, 25' },
      'هر مضربی از آن‌ها هم درست است، مثلاً 6، 8، 10 یا 9، 12، 15. اگر دو ضلع را در این الگوها دیدی، ضلع سوم را بدون جذر گرفتن بنویس.',
    ],
  },
  {
    id: 'g8_simplify_radicals',
    grade: 8,
    chapterId: 'g8_powers',
    title: 'رادیکال‌ها را ساده کن تا قابل جمع شوند',
    body: [
      'عدد زیر رادیکال را به «مربع کامل × عدد دیگر» بشکن:',
      { math: 'sqrt(50) = sqrt(25 × 2) = 5sqrt(2)' },
      'فقط رادیکال‌هایی که بعد از ساده شدن عدد زیرشان یکی است با هم جمع می‌شوند. sqrt(a) + sqrt(b) برابر sqrt(a + b) نیست.',
    ],
  },
  {
    id: 'g8_probability_basic',
    grade: 8,
    chapterId: 'g8_statistics',
    title: 'احتمال = حالت‌های مطلوب ÷ همه‌ی حالت‌ها',
    body: [
      'اول همه‌ی حالت‌های ممکن را بشمار؛ با دو تاس ۶ × ۶ = ۳۶ حالت و با سه سکه ۲ × ۲ × ۲ = ۸ حالت داریم.',
      'بعد حالت‌هایی را بشمار که خواسته‌ی سؤال است. احتمال همیشه بین ۰ و ۱ است؛ اگر جوابت بیشتر از ۱ شد، حتماً اشتباه شمرده‌ای.',
    ],
  },
];

export const GRADE8_QUESTIONS: KonkurQuestion[] = [
  {
    id: 'g8_q1',
    tipIds: ['g8_polygon_angles'],
    text: 'هر زاویه‌ی خارجی یک چندضلعی منتظم ۲۴ درجه است. این چندضلعی چند ضلع دارد؟',
    choices: ['12', '15', '18', '24'],
    answer: 1,
    solution: [{ math: 'n = 360 / 24 = 15' }],
    source: { kind: 'authored' },
  },
  {
    id: 'g8_q2',
    tipIds: ['g8_polygon_angles'],
    text: 'مجموع زاویه‌های داخلی یک هشت‌ضلعی چند درجه است؟',
    choices: ['900', '1080', '1260', '1440'],
    answer: 1,
    solution: [{ math: '(8 - 2) × 180 = 1080' }],
    source: { kind: 'authored' },
  },
  {
    id: 'g8_q3',
    tipIds: ['g8_difference_squares'],
    text: 'حاصل عبارت زیر کدام است؟',
    expression: '1001^2 - 999^2',
    choices: ['4', '400', '2000', '4000'],
    answer: 3,
    solution: [{ math: '(1001 - 999)(1001 + 999) = 2 × 2000 = 4000' }],
    source: { kind: 'authored' },
  },
  {
    id: 'g8_q4',
    tipIds: ['g8_pythagorean_triples'],
    text: 'دو ضلع زاویه‌ی قائمه‌ی یک مثلث ۹ و ۱۲ است. طول وتر کدام است؟',
    choices: ['13', '15', '17', '21'],
    answer: 1,
    solution: [
      '9، 12 سه برابرِ 3، 4 هستند، پس وتر سه برابرِ 5 است:',
      { math: '3 × 5 = 15' },
    ],
    source: { kind: 'authored' },
  },
  {
    id: 'g8_q5',
    tipIds: ['g8_simplify_radicals'],
    text: 'حاصل عبارت زیر کدام است؟',
    expression: 'sqrt(18) + sqrt(8)',
    choices: ['sqrt(26)', '5sqrt(2)', '6sqrt(2)', '2sqrt(13)'],
    answer: 1,
    solution: [{ math: 'sqrt(9 × 2) + sqrt(4 × 2) = 3sqrt(2) + 2sqrt(2) = 5sqrt(2)' }],
    source: { kind: 'authored' },
  },
  {
    id: 'g8_q6',
    tipIds: ['g8_probability_basic'],
    text: 'دو تاس را با هم می‌اندازیم. احتمال این‌که مجموع دو عدد ۷ شود کدام است؟',
    choices: ['1/6', '7/36', '1/12', '5/36'],
    answer: 0,
    solution: [
      'همه‌ی حالت‌ها ۳۶ تاست. حالت‌های مطلوب:',
      { math: '(1,6) (2,5) (3,4) (4,3) (5,2) (6,1)' },
      { math: '6 / 36 = 1/6' },
    ],
    source: { kind: 'authored' },
  },
];
