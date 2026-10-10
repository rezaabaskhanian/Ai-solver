import { CURRICULUM, type CurriculumChapter, type CurriculumGrade } from './curriculum';
import type { KonkurLine } from './konkur/types';
import { visibleForTrack, type StudyTrack } from './track';

// «برگه‌ی فرمول»: the key formulas and rules of each textbook chapter
// (grades 10–12), for a quick review before an exam. Keyed by the
// curriculum chapter id, so a chapter's `tracks` decide who sees its
// sheet (a sheet needs no `tracks` of its own). Math lines use the app's
// ASCII notation (see content/konkur): ^ for powers, sqrt(), / for
// fractions, ₙ ₐ ᵢ subscripts, Σ ∪ ∩ ⇒ ⇔ …; every math line is rendered
// left-to-right by MathExpression. Like the curriculum it exists only in
// Persian, so it isn't routed through i18n.

export interface FormulaItem {
  // One line: what the formula is for.
  caption: string;
  // The formula(s), as math lines.
  lines: KonkurLine[];
}

export interface ChapterFormulas {
  chapterId: string;
  items: FormulaItem[];
}

const PERSIAN = /[\u0600-\u06FF]/;

// Persian text becomes a prose line, anything else a math line; "   |   "
// separates lines. (Math is never mixed with Persian words on one line,
// so right-to-left text can't reorder it.)
function f(caption: string, ...rows: string[]): FormulaItem {
  const lines: KonkurLine[] = rows
    .flatMap(row => row.split('   |   '))
    .map(part => (PERSIAN.test(part) ? part.trim() : { math: part.trim() }));
  return { caption, lines };
}

// Shared by chapters of both tracks that teach the same material.
const QUADRATIC: FormulaItem[] = [
  f('دلتا و تعداد ریشه‌ها', 'ax^2 + bx + c = 0   ,   Δ = b^2 - 4ac', 'Δ > 0: دو ریشه   |   Δ = 0: ریشه‌ی مضاعف   |   Δ < 0: بدون ریشه'),
  f('فرمول ریشه‌ها', 'x = (-b ± sqrt(Δ))/(2a)'),
  f('مجموع و حاصل‌ضرب ریشه‌ها', 'S = x₁ + x₂ = -b/a   ,   P = x₁ x₂ = c/a', 'x^2 - Sx + P = 0'),
  f('عبارت‌های متقارن ریشه‌ها', 'x₁^2 + x₂^2 = S^2 - 2P', '|x₁ - x₂| = sqrt(Δ)/|a|'),
  f('رأس سهمی y = ax² + bx + c', 'x = -b/(2a)   ,   y = -Δ/(4a)'),
];

const LINE_AND_DISTANCE: FormulaItem[] = [
  f('فاصله‌ی دو نقطه و نقطه‌ی وسط', 'd = sqrt((x₂ - x₁)^2 + (y₂ - y₁)^2)', 'M = ((x₁ + x₂)/2 , (y₁ + y₂)/2)'),
  f('شیب و معادله‌ی خط', 'm = (y₂ - y₁)/(x₂ - x₁)', 'y - y₁ = m(x - x₁)   ,   y = mx + b'),
  f('خطوط موازی و عمود', 'موازی: m₁ = m₂', 'عمود: m₁ m₂ = -1'),
  f('فاصله‌ی نقطه از خط', 'd = |ax₀ + by₀ + c| / sqrt(a^2 + b^2)'),
];

const SIMILARITY: FormulaItem[] = [
  f('خط موازی یک ضلع مثلث (MN ∥ BC)', 'AM/MB = AN/NC', 'AM/AB = AN/AC = MN/BC'),
  f('نسبت تشابه k', 'اضلاع متناظر: k   |   محیط‌ها: k   |   مساحت‌ها: k^2'),
  f('حالت‌های تشابه مثلث‌ها', 'دو زاویه‌ی برابر   |   دو ضلع متناسب با زاویه‌ی بین برابر   |   سه ضلع متناسب'),
  f('نیمساز داخلی (نسبت پاره‌خط‌ها)', 'BD/DC = AB/AC'),
];

const FUNCTION_OPERATIONS: FormulaItem[] = [
  f('اعمال جبری روی توابع', '(f ± g)(x) = f(x) ± g(x)   ,   (fg)(x) = f(x) g(x)', '(f/g)(x) = f(x)/g(x)   ,   g(x) ≠ 0'),
  f('ترکیب توابع', '(fog)(x) = f(g(x))', 'دامنه‌ی fog: x در دامنه‌ی g و g(x) در دامنه‌ی f'),
  f('تابع وارون', 'f(f^(-1)(x)) = x   ,   f^(-1)(f(x)) = x', 'وارون: جای x و y را عوض کن   |   نمودار قرینه نسبت به y = x', 'دامنه‌ی f^(-1) = برد f'),
  f('تابع یک‌به‌یک', 'f(a) = f(b) ⇒ a = b   (وارون‌پذیر)'),
  f('تابع جزء صحیح', '[x] ≤ x < [x] + 1   ,   [x + n] = [x] + n   (n صحیح)'),
];

const EXP_LOG: FormulaItem[] = [
  f('تابع نمایی', 'y = a^x   (a > 0 , a ≠ 1)', 'a^x = a^y ⇒ x = y'),
  f('تعریف لگاریتم', 'y = logₐ(x) ⇔ x = a^y   (x > 0)', 'logₐ(a) = 1   ,   logₐ(1) = 0   ,   a^(logₐ(x)) = x'),
  f('لگاریتم ضرب، تقسیم و توان', 'logₐ(xy) = logₐ(x) + logₐ(y)', 'logₐ(x/y) = logₐ(x) - logₐ(y)', 'logₐ(x^n) = n logₐ(x)'),
  f('تغییر مبنا', 'logₐ(b) = log(b)/log(a)'),
  f('معادله‌ی لگاریتمی', 'logₐ(f) = logₐ(g) ⇒ f = g   (f > 0 , g > 0)'),
];

const LIMITS_BASICS: FormulaItem[] = [
  f('وجود حد', 'lim(x→a) f = L ⇔ lim(x→a⁻) f = lim(x→a⁺) f = L'),
  f('قضایای حد', 'lim(f ± g) = L ± M   ,   lim(f g) = L M', 'lim(f/g) = L/M   (M ≠ 0)'),
  f('پیوستگی در a', 'lim(x→a) f(x) = f(a)'),
  f('حالت ۰/۰', 'تجزیه و ساده‌کردن   |   ضرب در مزدوج برای رادیکال', 'lim(x→a) (x^n - a^n)/(x - a) = n a^(n - 1)'),
  f('حد توابع مثلثاتی پایه', 'lim(x→0) sin x / x = 1   ,   lim(x→0) tan x / x = 1'),
];

const LIMITS_INFINITE: FormulaItem[] = [
  f('حد بی‌نهایت', 'lim(x→0⁺) 1/x = +∞   ,   lim(x→0⁻) 1/x = -∞', 'lim(x→0) 1/x^2 = +∞', 'مخرج → ۰ و صورت ≠ ۰ ⇒ مجانب قائم x = a'),
  f('حد در بی‌نهایت', 'lim(x→±∞) 1/x^n = 0   (n > 0)', 'چندجمله‌ای: فقط جمله‌ی با بزرگ‌ترین توان'),
  f('کسر چندجمله‌ای در ±∞', 'درجه‌ی صورت < مخرج: حد = ۰ (مجانب y = 0)', 'درجه‌ها برابر: حد = نسبت ضرایب پیشرو (مجانب افقی)', 'درجه‌ی صورت > مخرج: حد = ±∞'),
  f('حالت ∞ - ∞ با رادیکال', 'sqrt(A) - sqrt(B) = (A - B)/(sqrt(A) + sqrt(B))'),
];

const DERIVATIVE_BASICS: FormulaItem[] = [
  f('تعریف مشتق در یک نقطه', "f'(a) = lim(h→0) (f(a + h) - f(a))/h", "f'(a) = lim(x→a) (f(x) - f(a))/(x - a)"),
  f('مشتق توان و ثابت', "(c)' = 0   ,   (x^n)' = n x^(n - 1)", "(c f)' = c f'   ,   (f ± g)' = f' ± g'"),
  f('مشتق ضرب و تقسیم', "(f g)' = f' g + f g'", "(f/g)' = (f' g - f g')/g^2"),
  f('مشتق توان و ریشه‌ی یک تابع', "(f^n)' = n f^(n - 1) f'", "(sqrt(f))' = f'/(2 sqrt(f))   ,   (1/f)' = -f'/f^2"),
  f('خط مماس و قائم', "مماس: y - f(a) = f'(a)(x - a)", "شیب خط قائم = -1/f'(a)"),
  f('مشتق‌پذیری و پیوستگی', 'مشتق‌پذیر در a ⇒ پیوسته در a   (عکس درست نیست)', 'مشتق چپ = مشتق راست ⇔ مشتق‌پذیر'),
  f('آهنگ تغییر', 'متوسط: (f(b) - f(a))/(b - a)   ,   لحظه‌ای: f\'(a)', "سرعت v = s'   ,   شتاب a = v'"),
];

const DERIVATIVE_APPS: FormulaItem[] = [
  f('یکنوایی', "f' > 0 ⇒ صعودی   ,   f' < 0 ⇒ نزولی"),
  f('نقاط بحرانی و اکسترمم', "f'(c) = 0 یا f'(c) تعریف‌نشده", "تغییر علامت f' از + به −: ماکزیمم نسبی", "تغییر علامت f' از − به +: مینیمم نسبی"),
  f('اکسترمم مطلق روی بازه‌ی بسته', 'مقدار تابع در نقاط بحرانی و دو سر بازه را مقایسه کن'),
  f('بهینه‌سازی', 'کمیت را بر حسب یک متغیر بنویس ← مشتق = ۰ ← بازه و نقاط انتهایی را بررسی کن'),
];

const PROB_CONDITIONAL: FormulaItem[] = [
  f('احتمال شرطی', 'P(A|B) = P(A ∩ B) / P(B)   ,   P(B) ≠ 0', 'P(A ∩ B) = P(B) P(A|B)'),
  f('پیشامدهای مستقل', 'P(A ∩ B) = P(A) P(B)   ⇔   P(A|B) = P(A)'),
  f('نقیض در احتمال شرطی', "P(A'|B) = 1 - P(A|B)"),
  f('تجزیه‌ی احتمال', "P(A) = P(A ∩ B) + P(A ∩ B')"),
];

const DESCRIPTIVE: FormulaItem[] = [
  f('میانگین', 'm = Σxᵢ / n   ,   با فراوانی: m = Σfᵢxᵢ / Σfᵢ'),
  f('واریانس و انحراف معیار', 'σ^2 = Σ(xᵢ - m)^2 / n = Σxᵢ^2 / n - m^2', 'σ = sqrt(σ^2)'),
  f('ضریب تغییرات', 'CV = σ / m'),
  f('تغییر خطی داده‌ها (yᵢ = a xᵢ + b)', 'میانگین جدید: a m + b', 'انحراف معیار جدید: |a| σ   (b اثری ندارد)', 'واریانس جدید: a^2 σ^2'),
  f('دامنه‌ی تغییرات و چارک‌ها', 'R = بیشینه - کمینه   ,   IQR = Q₃ - Q₁', 'داده‌ی پرت: کمتر از Q₁ - 1.5 IQR یا بیشتر از Q₃ + 1.5 IQR'),
];

const TRIG_BASIC_IDENTITIES: FormulaItem[] = [
  f('رابطه‌های اساسی', 'sin^2 α + cos^2 α = 1   ,   tan α = sin α / cos α', '1 + tan^2 α = 1 / cos^2 α'),
  f('رادیان و درجه', 'π rad = 180°', 'درجه → رادیان: ×π/180   |   رادیان → درجه: ×180/π', 'طول کمان: l = rα   (α برحسب رادیان)'),
  f('مقدارهای ویژه (۰°، ۳۰°، ۴۵°، ۶۰°، ۹۰°)', 'sin: 0 , 1/2 , sqrt(2)/2 , sqrt(3)/2 , 1', 'cos: 1 , sqrt(3)/2 , sqrt(2)/2 , 1/2 , 0', 'tan: 0 , sqrt(3)/3 , 1 , sqrt(3) , ∄'),
  f('زاویه‌های مکمل و متمم', 'sin(π - α) = sin α   ,   cos(π - α) = -cos α   ,   tan(π - α) = -tan α', 'sin(π/2 - α) = cos α   ,   cos(π/2 - α) = sin α', 'sin(π/2 + α) = cos α   ,   cos(π/2 + α) = -sin α'),
  f('زاویه‌های π + α و منفی', 'sin(π + α) = -sin α   ,   cos(π + α) = -cos α   ,   tan(π + α) = tan α', 'sin(-α) = -sin α   ,   cos(-α) = cos α   ,   tan(-α) = -tan α'),
];

const TRIG_FUNCTIONS: FormulaItem[] = [
  f('دوره‌ی تناوب و برد', 'y = a sin(bx + c) + d ⇒ T = 2π/|b|', 'برد: [d - |a| , d + |a|]   (همین برای cos)', 'y = a tan(bx + c) + d ⇒ T = π/|b|'),
];

const GRADE12_TRIG: FormulaItem[] = [
  f('تانژانت و تناوب', 'sin و cos: T = 2π   |   tan: T = π', 'مجانب tan: x = π/2 + kπ'),
  f('معادله‌ی sin و cos', 'sin u = sin v ⇒ u = v + 2kπ  یا  u = π - v + 2kπ', 'cos u = cos v ⇒ u = ±v + 2kπ'),
  f('معادله‌ی tan', 'tan u = tan v ⇒ u = v + kπ'),
  f('معادله‌های ساده', 'sin x = 0 ⇒ x = kπ   ,   cos x = 0 ⇒ x = π/2 + kπ', 'sin x = 1 ⇒ x = π/2 + 2kπ   ,   cos x = 1 ⇒ x = 2kπ', 'cos u = sin v ⇒ cos u = cos(π/2 - v)'),
  f('زاویه‌ی دو برابر', 'sin 2α = 2 sin α cos α', 'cos 2α = cos^2 α - sin^2 α = 2cos^2 α - 1 = 1 - 2sin^2 α', 'tan 2α = 2 tan α / (1 - tan^2 α)'),
];

const CIRCLE_EQUATION: FormulaItem[] = [
  f('معادله‌ی دایره', '(x - a)^2 + (y - b)^2 = r^2', 'x^2 + y^2 + Dx + Ey + F = 0 ⇒ مرکز (-D/2 , -E/2)', 'r^2 = D^2/4 + E^2/4 - F'),
  f('وضع خط و دایره', 'فاصله‌ی مرکز تا خط: d < r (قاطع)  |  d = r (مماس)  |  d > r (خارج)'),
];

const FUNCTION_TRANSFORMS: FormulaItem[] = [
  f('انتقال نمودار', 'f(x) + k: k واحد بالا   |   f(x - h): h واحد به راست'),
  f('بازتاب نمودار', '-f(x): نسبت به محور x   |   f(-x): نسبت به محور y'),
  f('انبساط و انقباض', 'a f(x): ضرب عرض‌ها در |a|   |   f(bx): تقسیم طول‌ها بر |b|'),
  f('ترکیب تبدیل‌ها', 'y = a f(x - h) + k'),
];

export const CHAPTER_FORMULAS: ChapterFormulas[] = [
  // ───────────── پایه‌ی دهم ─────────────
  {
    chapterId: 'g10_sets',
    items: [
      f('تعداد اعضای اجتماع', 'n(A ∪ B) = n(A) + n(B) - n(A ∩ B)'),
      f('متمم و تفاضل', "A - B = A ∩ B'   ,   (A')' = A", "(A ∪ B)' = A' ∩ B'   ,   (A ∩ B)' = A' ∪ B'"),
      f('تعداد زیرمجموعه‌ها', 'مجموعه‌ی n عضوی: 2^n زیرمجموعه   ،   2^n - 1 زیرمجموعه‌ی سره'),
      f('دنباله‌ی حسابی', 'aₙ = a₁ + (n - 1)d', 'سه جمله‌ی متوالی: 2b = a + c'),
      f('دنباله‌ی هندسی', 'aₙ = a₁ × r^(n - 1)', 'سه جمله‌ی متوالی: b^2 = ac'),
    ],
  },
  {
    chapterId: 'g10_trig',
    items: [
      f('نسبت‌های مثلثاتی در مثلث قائم‌الزاویه', 'sin θ = مقابل / وتر   ,   cos θ = مجاور / وتر', 'tan θ = مقابل / مجاور'),
      ...TRIG_BASIC_IDENTITIES.filter(item => !item.caption.startsWith('رادیان')),
    ],
  },
  {
    chapterId: 'g10_powers',
    items: [
      f('قوانین توان', 'a^m × a^n = a^(m + n)   ,   a^m / a^n = a^(m - n)', '(a^m)^n = a^(mn)   ,   (ab)^n = a^n b^n', 'a^0 = 1   ,   a^(-n) = 1/a^n'),
      f('ریشه و توان گویا', 'a^(1/n) = ⁿ√a   (a ≥ 0 برای n زوج)', 'a^(m/n) = (a^(1/n))^m', 'sqrt(a) × sqrt(b) = sqrt(ab)   ,   sqrt(a)/sqrt(b) = sqrt(a/b)'),
      f('اتحادهای مربع و مکعب', '(a ± b)^2 = a^2 ± 2ab + b^2   ,   (a + b)(a - b) = a^2 - b^2', '(a ± b)^3 = a^3 ± 3a^2 b + 3ab^2 ± b^3', 'a^3 ± b^3 = (a ± b)(a^2 ∓ ab + b^2)'),
      f('اتحاد جمله‌ی مشترک', '(x + a)(x + b) = x^2 + (a + b)x + ab'),
      f('گویا کردن مخرج', '1/(sqrt(a) ± sqrt(b)) = (sqrt(a) ∓ sqrt(b))/(a - b)'),
    ],
  },
  {
    chapterId: 'g10_equations',
    items: [
      ...QUADRATIC,
      f('تعیین علامت', 'ax + b: ریشه x = -b/a ، سمت راست ریشه هم‌علامت a', 'ax^2 + bx + c (Δ > 0): بین ریشه‌ها مخالف علامت a ، بیرون ریشه‌ها هم‌علامت a'),
    ],
  },
  {
    chapterId: 'g10_function',
    items: [
      f('شرط تابع بودن', 'هر x در دامنه دقیقاً یک y دارد (خط قائم نمودار را حداکثر یک‌بار قطع می‌کند)'),
      f('دامنه', 'کسر: مخرج ≠ 0', 'رادیکال با فرجه‌ی زوج: عبارت زیر رادیکال ≥ 0'),
      f('تابع خطی', 'y = mx + b   ,   m = (y₂ - y₁)/(x₂ - x₁)'),
      f('چند تابع مهم', 'ثابت: f(x) = c   |   همانی: f(x) = x   |   قدرمطلق: f(x) = |x|', 'درجه‌ی دوم: f(x) = ax^2 + bx + c'),
    ],
  },
  {
    chapterId: 'g10_counting',
    items: [
      f('اصل ضرب و جمع', 'مراحل پشت‌سرهم: m × n   |   حالت‌های جدا از هم: m + n'),
      f('فاکتوریل و جایگشت', 'n! = n(n - 1)...(2)(1)   ,   0! = 1', 'P(n, r) = n!/(n - r)!   ,   جایگشت n شیء: n!'),
      f('ترکیب', 'C(n, r) = n!/(r!(n - r)!)   ,   C(n, r) = C(n, n - r)', 'C(n, 0) = C(n, n) = 1   ,   C(n, r) + C(n, r + 1) = C(n + 1, r + 1)'),
      f('جایگشت یا ترکیب؟', 'ترتیب مهم است: جایگشت   |   ترتیب مهم نیست: ترکیب'),
    ],
  },
  {
    chapterId: 'g10_statistics',
    items: [
      f('احتمال هم‌شانس', 'P(A) = n(A)/n(S)   ,   0 ≤ P(A) ≤ 1'),
      f('نقیض و اجتماع', "P(A') = 1 - P(A)", 'P(A ∪ B) = P(A) + P(B) - P(A ∩ B)', 'ناسازگار: P(A ∪ B) = P(A) + P(B)'),
      f('میانگین', 'm = Σxᵢ / n'),
    ],
  },
  { chapterId: 'g10h_thales', items: SIMILARITY },
  {
    chapterId: 'g10h_polygons',
    items: [
      f('زوایای چندضلعی n ضلعی', 'مجموع زوایای داخلی = (n - 2) × 180°', 'مجموع زوایای خارجی = 360°', 'هر زاویه‌ی داخلی چندضلعی منتظم = (n - 2) × 180° / n'),
      f('تعداد قطرها', 'n(n - 3)/2'),
      f('مساحت چهارضلعی‌ها', 'مستطیل: ab   |   متوازی‌الاضلاع: a h   |   لوزی: d₁ d₂ / 2', 'ذوزنقه: (a + b) h / 2   |   مثلث: a h / 2'),
    ],
  },

  // ───────────── پایه‌ی یازدهم (ریاضی-فیزیک) ─────────────
  {
    chapterId: 'g11c_algebra',
    items: [
      f('مجموع جملات دنباله‌ی حسابی', 'Sₙ = n(a₁ + aₙ)/2 = n(2a₁ + (n - 1)d)/2'),
      f('مجموع جملات دنباله‌ی هندسی', 'Sₙ = a₁(1 - r^n)/(1 - r)   ,   r ≠ 1'),
      ...QUADRATIC.slice(0, 4),
      f('معادله‌ی رادیکالی و گویا', 'sqrt(f) = g ⇒ f = g^2 و g ≥ 0 (ریشه‌ها را وارسی کن)', 'معادله‌ی گویا: ریشه‌ی مخرج ≠ 0'),
      f('قدرمطلق', '|x| = a ⇒ x = ±a   ,   |x| < a ⇔ -a < x < a', '|x| > a ⇔ x < -a  یا  x > a', '|x|^2 = x^2   ,   |ab| = |a||b|   ,   |a + b| ≤ |a| + |b|'),
      ...LINE_AND_DISTANCE,
    ],
  },
  {
    chapterId: 'g11c_function',
    items: [...FUNCTION_OPERATIONS, ...FUNCTION_TRANSFORMS.slice(0, 2), f('تابع زوج و فرد', 'زوج: f(-x) = f(x) (قرینه نسبت به محور y)', 'فرد: f(-x) = -f(x) (قرینه نسبت به مبدأ)')],
  },
  { chapterId: 'g11c_exp_log', items: EXP_LOG },
  {
    chapterId: 'g11c_trig',
    items: [
      ...TRIG_BASIC_IDENTITIES,
      ...TRIG_FUNCTIONS,
      f('مجموع و تفاضل زاویه‌ها', 'sin(α ± β) = sin α cos β ± cos α sin β', 'cos(α ± β) = cos α cos β ∓ sin α sin β', 'tan(α ± β) = (tan α ± tan β)/(1 ∓ tan α tan β)'),
      f('زاویه‌ی دو برابر', 'sin 2α = 2 sin α cos α', 'cos 2α = cos^2 α - sin^2 α = 2cos^2 α - 1 = 1 - 2sin^2 α'),
    ],
  },
  { chapterId: 'g11c_limits', items: LIMITS_BASICS },
  {
    chapterId: 'g11s_logic',
    items: [
      f('ارزش گزاره‌های مرکب', 'p ∧ q درست ⇔ هر دو درست   |   p ∨ q نادرست ⇔ هر دو نادرست', 'p ⇒ q نادرست ⇔ p درست و q نادرست'),
      f('هم‌ارزی‌های مهم', 'p ⇒ q ≡ ¬p ∨ q ≡ ¬q ⇒ ¬p', 'p ⇔ q ≡ (p ⇒ q) ∧ (q ⇒ p)'),
      f('نقیض گزاره‌ها', '¬(p ∧ q) ≡ ¬p ∨ ¬q   ,   ¬(p ∨ q) ≡ ¬p ∧ ¬q', '¬(p ⇒ q) ≡ p ∧ ¬q', '¬(∀x p(x)) ≡ ∃x ¬p(x)   ,   ¬(∃x p(x)) ≡ ∀x ¬p(x)'),
      f('جبر مجموعه‌ها', 'A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C)', 'A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C)', "A ⊆ B ⇔ A ∩ B = A ⇔ A ∪ B = B ⇔ B' ⊆ A'"),
    ],
  },
  {
    chapterId: 'g11s_probability',
    items: [
      f('احتمال هم‌شانس و ناهم‌شانس', 'P(A) = n(A)/n(S)', 'ناهم‌شانس: P(A) = مجموع احتمال برآمدهای A   ,   مجموع همه = 1'),
      f('اجتماع و نقیض', "P(A') = 1 - P(A)", 'P(A ∪ B) = P(A) + P(B) - P(A ∩ B)'),
      ...PROB_CONDITIONAL,
    ],
  },
  { chapterId: 'g11s_descriptive', items: DESCRIPTIVE },
  {
    chapterId: 'g11h_circle',
    items: [
      f('زاویه‌ها در دایره', 'مرکزی = کمان روبه‌رو', 'محاطی = ظلی = نصف کمان روبه‌رو'),
      f('زاویه‌ی بین دو وتر (درون دایره)', 'زاویه = (مجموع دو کمان روبه‌رو) / 2'),
      f('زاویه‌ی بین دو قاطع یا مماس (بیرون دایره)', 'زاویه = (کمان بزرگ‌تر - کمان کوچک‌تر) / 2'),
      f('رابطه‌های طولی', 'دو وتر متقاطع: MA × MB = MC × MD', 'دو قاطع از نقطه‌ی بیرونی: MA × MB = MC × MD', 'مماس و قاطع: MT^2 = MA × MB'),
      f('مماس‌ها', 'دو مماس رسم‌شده از یک نقطه با هم برابرند   |   مماس بر شعاع در نقطه‌ی تماس عمود است'),
      f('چهارضلعی محاطی و محیطی', 'محاطی: مجموع زاویه‌های روبه‌رو = 180°', 'محیطی: a + c = b + d   (مجموع اضلاع روبه‌رو برابر)'),
    ],
  },
  {
    chapterId: 'g11h_transformations',
    items: [
      f('انتقال با بردار (a , b)', '(x, y) → (x + a, y + b)'),
      f('بازتاب', 'نسبت به محور x: (x, -y)   |   نسبت به محور y: (-x, y)', 'نسبت به y = x: (y, x)   |   نسبت به مبدأ: (-x, -y)', 'نسبت به x = a: (2a - x, y)   |   نسبت به y = b: (x, 2b - y)'),
      f('دوران حول مبدأ', '90° پادساعت‌گرد: (x, y) → (-y, x)', '180°: (x, y) → (-x, -y)', '270° پادساعت‌گرد: (x, y) → (y, -x)'),
      f('تجانس به مرکز مبدأ و نسبت k', '(x, y) → (kx, ky)', 'نسبت طول‌ها |k|   ,   نسبت مساحت‌ها k^2'),
    ],
  },
  {
    chapterId: 'g11h_triangle',
    items: [
      f('قضیه‌ی سینوس‌ها', 'a/sin A = b/sin B = c/sin C = 2R'),
      f('قضیه‌ی کسینوس‌ها', 'a^2 = b^2 + c^2 - 2bc cos A'),
      f('مساحت مثلث', 'S = (1/2) bc sin A   ,   S = abc/(4R)   ,   S = r p', 'p = (a + b + c)/2'),
      f('مساحت با سه ضلع', 'S = sqrt(p(p - a)(p - b)(p - c))', 'ارتفاع: hₐ = 2S/a'),
      f('نیمساز داخلی', 'BD/DC = AB/AC', 'lₐ^2 = bc - BD × DC   ,   lₐ = 2bc cos(A/2)/(b + c)'),
      f('طول میانه', 'mₐ^2 = (b^2 + c^2)/2 - a^2/4'),
    ],
  },

  // ───────────── پایه‌ی یازدهم (علوم تجربی) ─────────────
  { chapterId: 'g11t_analytic', items: [...LINE_AND_DISTANCE, ...QUADRATIC] },
  { chapterId: 'g11t_geometry', items: SIMILARITY },
  { chapterId: 'g11t_function', items: [...FUNCTION_OPERATIONS, ...FUNCTION_TRANSFORMS.slice(0, 2)] },
  { chapterId: 'g11t_trig', items: [...TRIG_BASIC_IDENTITIES, ...TRIG_FUNCTIONS] },
  { chapterId: 'g11t_exp_log', items: EXP_LOG },
  { chapterId: 'g11t_limits', items: LIMITS_BASICS },
  { chapterId: 'g11t_statistics', items: [...PROB_CONDITIONAL, ...DESCRIPTIVE] },

  // ───────────── پایه‌ی دوازدهم (ریاضی-فیزیک) ─────────────
  {
    chapterId: 'g12c_function',
    items: [
      ...FUNCTION_TRANSFORMS,
      f('تابع درجه‌ی سوم', 'y = a(x - h)^3 + k   ⇒   مرکز تقارن (h , k)'),
      f('یکنوایی', 'صعودی: x₁ < x₂ ⇒ f(x₁) ≤ f(x₂)   |   اکیداً صعودی: <', 'نزولی: x₁ < x₂ ⇒ f(x₁) ≥ f(x₂)'),
      f('تقسیم چندجمله‌ای‌ها', 'P(x) = Q(x) D(x) + R(x)   ,   درجه‌ی R < درجه‌ی D', 'باقیمانده‌ی P(x) بر (x - a) برابر P(a) است', '(x - a) مقسوم‌علیه‌ی P ⇔ P(a) = 0'),
    ],
  },
  { chapterId: 'g12c_trig', items: GRADE12_TRIG },
  { chapterId: 'g12c_limits', items: LIMITS_INFINITE },
  {
    chapterId: 'g12c_derivative',
    items: [
      ...DERIVATIVE_BASICS,
      f('مشتق توابع مثلثاتی', "(sin x)' = cos x   ,   (cos x)' = -sin x", "(tan x)' = 1 + tan^2 x = 1/cos^2 x"),
      f('مشتق ترکیب (قاعده‌ی زنجیره‌ای)', "(f(g(x)))' = f'(g(x)) × g'(x)"),
    ],
  },
  {
    chapterId: 'g12c_applications',
    items: [
      ...DERIVATIVE_APPS,
      f('تقعر و نقطه‌ی عطف', "f'' > 0: تقعر رو به بالا   |   f'' < 0: تقعر رو به پایین", "نقطه‌ی عطف: جایی که علامت f'' عوض می‌شود"),
      f('تابع درجه‌ی سوم', "عطف: f''(x) = 0 ⇒ x = -b/(3a)   برای ax^3 + bx^2 + cx + d"),
      f('مجانب‌ها', 'افقی: y = L اگر lim(x→±∞) f = L   |   قائم: x = a اگر lim f = ±∞', 'مایل: y = mx + n ، m = lim f(x)/x'),
    ],
  },

  // ───────────── پایه‌ی دوازدهم (گسسته) ─────────────
  {
    chapterId: 'g12d_numbers',
    items: [
      f('بخش‌پذیری', 'a | b ⇔ b = ak   (k صحیح)', 'a | b و a | c ⇒ a | (bx + cy)'),
      f('تقسیم و ب.م.م', 'a = bq + r   ,   0 ≤ r < b', 'gcd(a, b) = gcd(b, r)', 'gcd(a, b) × lcm(a, b) = a × b'),
      f('هم‌نهشتی', 'a ≡ b (mod m) ⇔ m | (a - b)', 'a ≡ b ⇒ a + c ≡ b + c   ,   ac ≡ bc   ,   a^n ≡ b^n', 'ac ≡ bc و gcd(c, m) = 1 ⇒ a ≡ b'),
      f('معادله‌ی ax ≡ b (mod m)', 'جواب دارد ⇔ gcd(a, m) | b'),
      f('معادله‌ی سیاله‌ی ax + by = c', 'جواب صحیح دارد ⇔ gcd(a, b) | c'),
      f('تعداد مقسوم‌علیه‌ها', 'n = p^a × q^b ⇒ تعداد = (a + 1)(b + 1)'),
    ],
  },
  {
    chapterId: 'g12d_graphs',
    items: [
      f('مجموع درجه‌ها', 'Σ deg(v) = 2q   (q = تعداد یال‌ها)', 'تعداد رأس‌های درجه فرد همیشه زوج است'),
      f('گراف کامل و دوبخشی کامل', 'K(n): q = n(n - 1)/2', 'K(m, n): q = mn'),
      f('درخت', 'درخت با p رأس: q = p - 1'),
      f('پیمایش یال‌ها', 'مدار یال‌پیما: گراف همبند و همه‌ی درجه‌ها زوج', 'مسیر یال‌پیما: همبند و دقیقاً دو رأس با درجه‌ی فرد'),
      f('گراف دوبخشی', 'دوبخشی ⇔ بدون دور فرد'),
    ],
  },
  {
    chapterId: 'g12d_counting',
    items: [
      f('جایگشت‌های ویژه', 'دوری: (n - 1)!', 'با عنصرهای تکراری: n! / (n₁! n₂! ... )'),
      f('معادله‌ی x₁ + ... + xk = n', 'جواب‌های صحیح نامنفی: C(n + k - 1, k - 1)'),
      f('توابع بین دو مجموعه (m عضوی به n عضوی)', 'همه‌ی توابع: n^m   |   یک‌به‌یک: P(n, m)'),
      f('شمول و عدم‌شمول', 'n(A ∪ B ∪ C) = n(A) + n(B) + n(C) - n(A ∩ B) - n(A ∩ C) - n(B ∩ C) + n(A ∩ B ∩ C)'),
      f('اصل لانه‌کبوتری', 'قراردادن بیش از n شیء در n جعبه ⇒ حداقل یک جعبه ≥ ۲ شیء'),
      f('بسط دوجمله‌ای', '(a + b)^n = Σ C(n, k) a^(n - k) b^k', 'Σ C(n, k) = 2^n'),
    ],
  },

  // ───────────── پایه‌ی دوازدهم (هندسه) ─────────────
  {
    chapterId: 'g12h_matrices',
    items: [
      f('ضرب ماتریس‌ها', 'A (m×n) ، B (n×p) ⇒ AB (m×p)', 'به‌طور کلی AB ≠ BA'),
      f('ترانهاده و وارون حاصل‌ضرب', '(AB)ᵗ = Bᵗ Aᵗ   ,   (AB)^(-1) = B^(-1) A^(-1)'),
      f('دترمینان ۲×۲', 'A = [a b ; c d] ⇒ det A = ad - bc'),
      f('وارون ماتریس ۲×۲', 'A^(-1) = (1/(ad - bc)) × [d -b ; -c a]', 'وارون‌پذیر ⇔ det A ≠ 0   ,   A A^(-1) = I'),
      f('ویژگی‌های دترمینان (مرتبه‌ی n)', 'det(AB) = det A × det B   ,   det(Aᵗ) = det A', 'det(kA) = k^n det A   ,   det(A^(-1)) = 1/det A'),
      f('حل دستگاه AX = B', 'X = A^(-1) B'),
      f('اتحادهای ماتریسی', '(A + B)^2 = A^2 + AB + BA + B^2   (اگر AB = BA ساده می‌شود)'),
    ],
  },
  {
    chapterId: 'g12h_conics',
    items: [
      ...CIRCLE_EQUATION.slice(0, 1),
      f('بیضی با مرکز مبدأ (a > b)', 'x^2/a^2 + y^2/b^2 = 1   ,   c^2 = a^2 - b^2', 'کانون‌ها (±c , 0)   ,   مجموع فاصله از دو کانون = 2a', 'خروج از مرکز e = c/a   (0 < e < 1)'),
      f('سهمی', 'x^2 = 4py: کانون (0 , p) ، خط هادی y = -p', '(y - k)^2 = 4p(x - h): کانون (h + p , k)', 'فاصله از کانون = فاصله از خط هادی'),
      f('مکان هندسی دایره', 'نقاطی که فاصله‌شان از نقطه‌ی O برابر r است'),
    ],
  },
  {
    chapterId: 'g12h_vectors',
    items: [
      f('اندازه و فاصله', '|a| = sqrt(a₁^2 + a₂^2 + a₃^2)', 'فاصله‌ی دو نقطه = اندازه‌ی بردار AB'),
      f('ضرب داخلی', 'a · b = a₁b₁ + a₂b₂ + a₃b₃ = |a||b| cos θ', 'cos θ = a · b / (|a||b|)   ,   a ⊥ b ⇔ a · b = 0', 'تصویر اسکالر a روی b: (a · b)/|b|'),
      f('ضرب خارجی', 'a × b = (a₂b₃ - a₃b₂ , a₃b₁ - a₁b₃ , a₁b₂ - a₂b₁)', '|a × b| = |a||b| sin θ   ,   a × b = -(b × a)', 'a ∥ b ⇔ a × b = 0'),
      f('مساحت و حجم', 'متوازی‌الاضلاع: |a × b|   |   مثلث: |a × b|/2', 'متوازی‌السطوح: |a · (b × c)|'),
    ],
  },

  // ───────────── پایه‌ی دوازدهم (علوم تجربی) ─────────────
  {
    chapterId: 'g12t_function',
    items: [
      f('ترکیب و وارون', '(fog)(x) = f(g(x))   ,   f(f^(-1)(x)) = x', 'نمودار f^(-1) قرینه‌ی نمودار f نسبت به y = x'),
      f('یکنوایی', 'صعودی: x₁ < x₂ ⇒ f(x₁) ≤ f(x₂)   |   نزولی: x₁ < x₂ ⇒ f(x₁) ≥ f(x₂)'),
      ...FUNCTION_TRANSFORMS.slice(0, 2),
    ],
  },
  { chapterId: 'g12t_trig', items: GRADE12_TRIG },
  { chapterId: 'g12t_limits', items: LIMITS_INFINITE },
  { chapterId: 'g12t_derivative', items: DERIVATIVE_BASICS },
  { chapterId: 'g12t_applications', items: DERIVATIVE_APPS },
  { chapterId: 'g12t_geometry', items: CIRCLE_EQUATION },
  {
    chapterId: 'g12t_probability',
    items: [
      f('قانون احتمال کل', "P(B) = P(A) P(B|A) + P(A') P(B|A')", 'P(B) = Σ P(Aᵢ) P(B|Aᵢ)   (Aᵢ ها افرازی از فضای نمونه)'),
      f('احتمال شرطی وارون', 'P(A|B) = P(A) P(B|A) / P(B)'),
      ...PROB_CONDITIONAL.slice(0, 2),
    ],
  },
];

// ───────────── lookups ─────────────

const BY_CHAPTER = new Map(CHAPTER_FORMULAS.map(entry => [entry.chapterId, entry]));

export function formulasForChapter(chapterId: string): ChapterFormulas | undefined {
  return BY_CHAPTER.get(chapterId);
}

export interface FormulaChapterRef {
  grade: CurriculumGrade;
  bookTitle: string;
  chapter: CurriculumChapter;
  formulas: ChapterFormulas;
}

function allRefs(): FormulaChapterRef[] {
  const refs: FormulaChapterRef[] = [];
  for (const { grade, books } of CURRICULUM) {
    for (const book of books) {
      for (const chapter of book.chapters) {
        const formulas = BY_CHAPTER.get(chapter.id);
        if (formulas) {
          refs.push({ grade, bookTitle: book.title, chapter, formulas });
        }
      }
    }
  }
  return refs;
}

// Chapters with a formula sheet that the track sees (its book and chapter
// `tracks` both allow it), in curriculum order.
export function formulaChaptersForTrack(track: StudyTrack): FormulaChapterRef[] {
  const books = new Map<string, { tracks?: StudyTrack[] }>();
  CURRICULUM.forEach(g => g.books.forEach(b => b.chapters.forEach(c => books.set(c.id, b))));
  return allRefs().filter(
    ref => visibleForTrack(ref.chapter, track) && visibleForTrack(books.get(ref.chapter.id) ?? {}, track),
  );
}

export function findFormulaChapter(chapterId: string): FormulaChapterRef | undefined {
  return allRefs().find(ref => ref.chapter.id === chapterId);
}
