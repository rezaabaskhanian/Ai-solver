import type { KonkurQuestion, KonkurTip } from './types';
import { TAJROBI_1402A } from './tajrobi1402a';
import { TAJROBI_1402B } from './tajrobi1402b';
import { TAJROBI_1403A } from './tajrobi1403a';
import { TAJROBI_1403B } from './tajrobi1403b';
import { TAJROBI_1403B_ABROAD } from './tajrobi1403babroad';
import { TAJROBI_1404A } from './tajrobi1404a';
import { TAJROBI_1404B } from './tajrobi1404b';
import { TAJROBI_1405 } from './tajrobi1405';

// Tips for the experimental-sciences (تجربی) track: ریاضی (۲) and
// ریاضی (۳). Every tip carries tracks: ['tajrobi'] and sits in a
// g11t_* / g12t_* chapter. Questions are added in separate files.

export const TAJROBI_TIPS: KonkurTip[] = [
  // ───────────────────────── ریاضی (۲) ─────────────────────────
  {
    id: 't11_inequality_param',
    grade: 11,
    chapterId: 'g11t_analytic',
    tracks: ['tajrobi'],
    title: 'نامعادله‌ی پارامتری: علامت ضریب x جهت را تعیین می‌کند',
    body: [
      'در ax > b اگر a > 0 جهت می‌ماند و اگر a < 0 جهت برمی‌گردد.',
      'وقتی مجموعه‌جواب داده شده، جهتش را با علامت ضریب مقایسه کن؛ این کار علامت پارامتر را مشخص می‌کند. سپس مرز جواب را با b/a برابر بگذار.',
      'اگر a = 0 باشد، نامعادله یا همیشه برقرار است یا هیچ‌وقت.',
    ],
    example: {
      question: [{ math: '(m - 2)x > 4' }, 'مجموعه‌جواب x < −2 است. m چند است؟'],
      solution: [
        'جواب به‌شکل x < ... است، پس جهت برگشته و m − 2 < 0.',
        { math: '4/(m - 2) = -2 ⇒ m - 2 = -2 ⇒ m = 0' },
        'شرط m < 2 برقرار است.',
      ],
    },
  },
  {
    id: 't11_quadratic_vertex',
    grade: 11,
    chapterId: 'g11t_analytic',
    tracks: ['tajrobi'],
    title: 'رأس سهمی: ماکزیمم یا مینیمم تابع درجه ۲',
    body: [
      { math: 'x_رأس = -b/(2a)   ,   y_رأس = f(x_رأس) = -Δ/(4a)' },
      'اگر a > 0 رأس کمترین مقدار و اگر a < 0 رأس بیشترین مقدار است.',
      'سهمی نسبت به خط x = −b/(2a) متقارن است؛ میانگین دو ریشه همان x رأس است.',
    ],
    example: {
      question: [{ math: 'f(x) = -2x^2 + 8x + 1' }, 'بیشترین مقدار f چند است؟'],
      solution: [
        { math: 'x = -8/(2 × (-2)) = 2' },
        { math: 'f(2) = -8 + 16 + 1 = 9' },
      ],
    },
  },
  {
    id: 't11_quadratic_sign',
    grade: 11,
    chapterId: 'g11t_analytic',
    tracks: ['tajrobi'],
    title: 'ax² + bx + c برای همه‌ی x مثبت: a > 0 و Δ < 0',
    body: [
      { math: 'ax^2 + bx + c > 0  ∀x ⇔ a > 0  ∧  Δ < 0' },
      { math: 'ax^2 + bx + c < 0  ∀x ⇔ a < 0  ∧  Δ < 0' },
      'اگر «≥ 0 برای همه‌ی x» خواسته شود، Δ ≤ 0 می‌شود. اگر ضریب x² پارامتر دارد، حالت صفر شدن آن را هم جدا بررسی کن.',
    ],
    example: {
      question: [{ math: 'mx^2 + 2x + m > 0' }, 'برای همه‌ی x برقرار است. m چه بازه‌ای است؟'],
      solution: [
        { math: 'm > 0   ,   Δ = 4 - 4m^2 < 0 ⇒ m^2 > 1' },
        'با m > 0 نتیجه می‌شود m > 1.',
      ],
    },
  },
  {
    id: 't11_tangent_discriminant',
    grade: 11,
    chapterId: 'g11t_analytic',
    tracks: ['tajrobi'],
    title: 'مماس بودن یا تقاطع سهمی با خط: Δ را بررسی کن',
    body: [
      'برای پیدا کردن اشتراک سهمی و خط، y ها را مساوی بگذار تا یک معادله‌ی درجه ۲ بیاید.',
      { math: 'Δ > 0 : دو نقطه   ,   Δ = 0 : مماس   ,   Δ < 0 : بدون برخورد' },
      'سهمی بر محور x مماس است یعنی Δ = 0 برای خود معادله‌ی ax² + bx + c = 0 (رأس روی محور x).',
    ],
    example: {
      question: ['خط y = 2x + m بر سهمی y = x² مماس است. m؟'],
      solution: [
        { math: 'x^2 - 2x - m = 0' },
        { math: 'Δ = 4 + 4m = 0 ⇒ m = -1' },
      ],
    },
  },
  {
    id: 't11_vieta',
    grade: 11,
    chapterId: 'g11t_analytic',
    tracks: ['tajrobi'],
    title: 'مجموع و حاصل‌ضرب ریشه‌ها: بدون حل معادله',
    body: [
      { math: 'S = x₁ + x₂ = -b/a   ,   P = x₁x₂ = c/a' },
      { math: 'x₁^2 + x₂^2 = S^2 - 2P   ,   1/x₁ + 1/x₂ = S/P' },
      { math: '|x₁ - x₂| = sqrt(Δ)/|a|' },
      'هر عبارت متقارن از ریشه‌ها را بر حسب S و P بنویس.',
    ],
    example: {
      question: [{ math: 'x^2 - 5x + 3 = 0' }, 'مقدار x₁² + x₂² را بیاب.'],
      solution: [
        { math: 'S = 5   ,   P = 3' },
        { math: 'S^2 - 2P = 25 - 6 = 19' },
      ],
    },
  },
  {
    id: 't11_radical_equation',
    grade: 11,
    chapterId: 'g11t_analytic',
    tracks: ['tajrobi'],
    title: 'معادله‌ی رادیکالی: رادیکال را تنها کن، توان بگیر، جواب را امتحان کن',
    body: [
      'اول رادیکال را یک‌طرف تنها کن، بعد دو طرف را به توان ۲ برسان.',
      'توان دادن جواب اضافه می‌سازد. هر جواب را در معادله‌ی اصلی بگذار؛ سمتی که رادیکال تنها آن است باید ≥ 0 شود.',
    ],
    example: {
      question: [{ math: 'sqrt(x + 2) = x' }, 'را حل کن.'],
      solution: [
        { math: 'x + 2 = x^2 ⇒ x^2 - x - 2 = 0 ⇒ x = 2  or  x = -1' },
        'x = −1 در معادله‌ی اصلی √1 = −1 می‌دهد که نادرست است. فقط x = 2 جواب است.',
      ],
    },
  },
  {
    id: 't11_arith_geometric_sequence',
    grade: 11,
    chapterId: 'g11t_analytic',
    tracks: ['tajrobi'],
    title: 'دنباله‌ی حسابی و هندسی: دو جمله بده، قدر نسبت را پیدا کن',
    body: [
      { math: 'حسابی: aₙ = a₁ + (n - 1)d   ,   aₙ - aₘ = (n - m)d' },
      { math: 'هندسی: aₙ = a₁ r^(n-1)   ,   aₙ/aₘ = r^(n-m)' },
      { math: 'جمله‌ی وسط: b = (a + c)/2  (حسابی)   ,   b^2 = ac  (هندسی)' },
      { math: 'Sₙ = n(a₁ + aₙ)/2   ,   Sₙ = a₁(rⁿ - 1)/(r - 1)' },
    ],
    example: {
      question: ['در دنباله‌ی حسابی a₄ = 11 و a₇ = 20. جمله‌ی دهم؟'],
      solution: [
        { math: '3d = a₇ - a₄ = 9 ⇒ d = 3' },
        { math: 'a₁ = 11 - 9 = 2   ,   a₁₀ = 2 + 9 × 3 = 29' },
      ],
    },
  },
  {
    id: 't11_coordinate_geometry',
    grade: 11,
    chapterId: 'g11t_analytic',
    tracks: ['tajrobi'],
    title: 'هندسه‌ی تحلیلی: فاصله، وسط، شیب و عمودمنصف',
    body: [
      { math: 'AB = sqrt((x₂ - x₁)^2 + (y₂ - y₁)^2)   ,   M = ((x₁ + x₂)/2 , (y₁ + y₂)/2)' },
      { math: 'موازی: m₁ = m₂   ,   عمود: m₁m₂ = -1' },
      'عمودمنصف = خطی که از وسط پاره‌خط می‌گذرد و شیبش قرینه‌ی معکوس شیب پاره‌خط است.',
      'مربع: قطرها برابرند، یکدیگر را نصف می‌کنند و عمودند؛ مساحت مربع = d²/2. مستطیل: قطرها برابر و منصف‌اند.',
    ],
    example: {
      question: ['معادله‌ی عمودمنصف پاره‌خط به دو سر A(1, 2) و B(5, 4)؟'],
      solution: [
        'وسط: M(3, 3). شیب AB = 2/4 = 1/2، پس شیب عمودمنصف −2.',
        { math: 'y - 3 = -2(x - 3) ⇒ y = -2x + 9' },
      ],
    },
  },
  {
    id: 't11_thales',
    grade: 11,
    chapterId: 'g11t_geometry',
    tracks: ['tajrobi'],
    title: 'تالس: خط موازی قاعده، نسبت‌های مساوی',
    body: [
      'اگر DE ∥ BC (D روی AB و E روی AC):',
      { math: 'AD/DB = AE/EC   ,   AD/AB = AE/AC = DE/BC' },
      'عکس تالس: اگر نسبت‌های بالا برابر باشند، DE موازی BC است.',
      'در تست‌ها نسبت «جزء به جزء» و «جزء به کل» را قاطی نکن.',
    ],
    example: {
      question: ['DE ∥ BC و AD = 3، DB = 2، AE = 4.5. طول EC؟'],
      solution: [
        { math: '3/2 = 4.5/EC ⇒ EC = 4.5 × 2/3 = 3' },
      ],
    },
  },
  {
    id: 't11_similar_triangles',
    grade: 11,
    chapterId: 'g11t_geometry',
    tracks: ['tajrobi'],
    title: 'تشابه: نسبت محیط k و نسبت مساحت k²',
    body: [
      'اگر دو زاویه‌ی دو مثلث برابر باشند، مثلث‌ها متشابه‌اند (ز ز).',
      { math: 'نسبت اضلاع متناظر = نسبت ارتفاع‌ها = نسبت محیط‌ها = k' },
      { math: 'نسبت مساحت‌ها = k^2   ,   نسبت حجم‌ها = k^3' },
      'ضلع‌های متناظر روبه‌روی زاویه‌های برابرند؛ تناظر را اول بنویس.',
    ],
    example: {
      question: ['نسبت تشابه دو مثلث 2/3 است و مساحت مثلث کوچک‌تر 12 است. مساحت مثلث بزرگ‌تر؟'],
      solution: [
        { math: 'نسبت مساحت = (3/2)^2 = 9/4' },
        { math: '12 × 9/4 = 27' },
      ],
    },
  },
  {
    id: 't11_angle_bisector',
    grade: 11,
    chapterId: 'g11t_geometry',
    tracks: ['tajrobi'],
    title: 'نیمساز داخلی: پاره‌خط‌ها متناسب با ضلع‌های مجاورند',
    body: [
      'اگر AD نیمساز زاویه‌ی A باشد (D روی BC):',
      { math: 'BD/DC = AB/AC' },
      { math: 'BD = BC × AB/(AB + AC)' },
    ],
    example: {
      question: ['در مثلث ABC: AB = 6، AC = 9، BC = 10. نیمساز A ضلع BC را به چه قطعه‌هایی می‌برد؟'],
      solution: [
        { math: 'BD = 10 × 6/15 = 4   ,   DC = 10 × 9/15 = 6' },
      ],
    },
  },
  {
    id: 't11_right_triangle',
    grade: 11,
    chapterId: 'g11t_geometry',
    tracks: ['tajrobi'],
    title: 'روابط مثلث قائم‌الزاویه با ارتفاع وارد بر وتر',
    body: [
      'اگر h ارتفاع وارد بر وتر a باشد و m و n تصویر دو ضلع قائم روی وتر:',
      { math: 'h^2 = mn   ,   b^2 = a·m   ,   c^2 = a·n   ,   a·h = b·c' },
      'وسط وتر از سه رأس به یک فاصله است: میانه‌ی وتر = نصف وتر.',
    ],
    example: {
      question: ['در مثلث قائم‌الزاویه‌ای با ضلع‌های قائم 6 و 8، ارتفاع وارد بر وتر؟'],
      solution: [
        'وتر = 10.',
        { math: 'h = 6 × 8/10 = 4.8' },
      ],
    },
  },
  {
    id: 't11_domain_radical',
    grade: 11,
    chapterId: 'g11t_function',
    tracks: ['tajrobi'],
    title: 'دامنه: مخرج ≠ ۰، زیر رادیکال زوج ≥ ۰، داخل لگاریتم > ۰',
    body: [
      'برای هر قسمت شرط جدا بنویس و اشتراک بگیر:',
      { math: 'A/B : B ≠ 0   ,   sqrt(A) : A ≥ 0   ,   log(A) : A > 0' },
      'اگر رادیکال در مخرج باشد شرط A > 0 است (نه ≥). دامنه‌ی تابع ترکیبی علاوه بر این‌ها باید شرط‌های تابع داخلی را هم داشته باشد.',
    ],
    example: {
      question: [{ math: 'f(x) = sqrt(4 - x^2)/(x - 1)' }, 'دامنه‌ی f؟'],
      solution: [
        { math: '4 - x^2 ≥ 0 ⇒ -2 ≤ x ≤ 2   ,   x ≠ 1' },
        { math: 'D_f = [-2, 2] - {1}' },
      ],
    },
  },
  {
    id: 't11_inverse_function',
    grade: 11,
    chapterId: 'g11t_function',
    tracks: ['tajrobi'],
    title: 'وارون تابع: f⁻¹(k) = m یعنی f(m) = k',
    body: [
      'برای مقدار خاص وارون، معادله‌ی f(x) = k را حل کن؛ لازم نیست ضابطه‌ی وارون را پیدا کنی.',
      'وارون فقط برای تابع یک‌به‌یک وجود دارد. نمودار f و f⁻¹ نسبت به خط y = x متقارن‌اند.',
      'از جدول یا نمودار: جای ورودی و خروجی را عوض کن. نقطه‌ی برخورد f و f⁻¹ روی y = x است.',
      'ضابطه‌ی وارون: x و y را عوض کن و y را تنها کن؛ دامنه و برد هم جابه‌جا می‌شوند.',
    ],
    example: {
      question: [{ math: 'f(x) = x^3 + x' }, 'مقدار f⁻¹(10) را بیاب.'],
      solution: [
        { math: 'x^3 + x = 10' },
        'x = 2 جواب است (8 + 2 = 10) و تابع یک‌به‌یک است، پس f⁻¹(10) = 2.',
      ],
    },
  },
  {
    id: 't11_composite_function',
    grade: 11,
    chapterId: 'g11t_function',
    tracks: ['tajrobi'],
    title: 'ترکیب توابع: از داخل شروع کن، تابع مجهول را از تساوی پیدا کن',
    body: [
      { math: '(f∘g)(x) = f(g(x))   ,   (g∘f)(x) = g(f(x))' },
      'ترکیب جابه‌جایی ندارد: f∘g ≠ g∘f.',
      'اگر f∘g و f داده شده، در ضابطه‌ی f به‌جای x بنویس g(x) و آن را با ضابطه‌ی ترکیب برابر کن. اگر g∘f و g داده شده باشد هم به همین شکل.',
      'در چندضابطه‌ای اول مقدار داخلی را حساب کن، بعد ببین در کدام شرط می‌افتد.',
    ],
    example: {
      question: [{ math: 'f(x) = 2x - 1   ,   (f∘g)(x) = 6x + 5' }, 'ضابطه‌ی g؟'],
      solution: [
        { math: '2g(x) - 1 = 6x + 5 ⇒ g(x) = 3x + 3' },
        { math: 'بررسی: f(3x + 3) = 6x + 6 - 1 = 6x + 5' },
      ],
    },
  },
  {
    id: 't11_abs_piecewise',
    grade: 11,
    chapterId: 'g11t_function',
    tracks: ['tajrobi'],
    title: 'قدرمطلق و چندضابطه‌ای: نقطه‌های شکست را پیدا کن',
    body: [
      'ریشه‌ی عبارت داخل هر قدرمطلق یک نقطه‌ی شکست است؛ دامنه را به همان نقطه‌ها بشکن.',
      'مجموع |x − a| + |x − b| کمترین مقدار b − a را در بازه‌ی [a, b] دارد.',
      'روی هر بازه علامت داخل قدرمطلق را بررسی کن و ضابطه‌ی بدون قدرمطلق بنویس.',
    ],
    example: {
      question: [{ math: 'f(x) = |x - 1| + |x - 5|' }, 'کمترین مقدار f؟'],
      solution: [
        'برای x بین 1 و 5: (x − 1) + (5 − x) = 4.',
        'خارج از این بازه مقدار بزرگ‌تر از 4 است، پس کمینه برابر 4 است.',
      ],
    },
  },
  {
    id: 't11_graph_transformations',
    grade: 11,
    chapterId: 'g11t_function',
    tracks: ['tajrobi'],
    title: 'انتقال و قرینه‌ی نمودار تابع',
    body: [
      { math: 'f(x - a) : a واحد به راست   ,   f(x) + b : b واحد بالا' },
      { math: '-f(x) : قرینه نسبت به محور x   ,   f(-x) : قرینه نسبت به محور y' },
      { math: '|f(x)| : بخش زیر محور x به بالا برگردد   ,   a·f(x) : کشیدگی عمودی' },
      'برای نقطه‌ی (p, q) روی f، نقطه‌ی متناظر را با حل «داخل = p» پیدا کن.',
    ],
    example: {
      question: ['نقطه‌ی (1, 4) روی نمودار f است. چه نقطه‌ای روی نمودار y = f(x − 2) + 1 است؟'],
      solution: [
        { math: 'x - 2 = 1 ⇒ x = 3   ,   y = 4 + 1 = 5' },
        'نقطه‌ی (3, 5).',
      ],
    },
  },
  {
    id: 't11_trig_identities',
    grade: 11,
    chapterId: 'g11t_trig',
    tracks: ['tajrobi'],
    title: 'اتحادهای مثلثاتی: sin² + cos² = 1 و توان دو کردن',
    body: [
      { math: 'sin^2(x) + cos^2(x) = 1   ,   1 + tan^2(x) = 1/cos^2(x)' },
      { math: 'tan(x) = sin(x)/cos(x)   ,   cot(x) = 1/tan(x)' },
      'وقتی sin x ± cos x داده شده، دو طرف را به توان 2 برسان تا sin x cos x ظاهر شود:',
      { math: '(sin x ± cos x)^2 = 1 ± 2 sin x cos x' },
    ],
    example: {
      question: [{ math: 'sin x + cos x = 1/2' }, 'مقدار sin x cos x؟'],
      solution: [
        { math: '1 + 2 sin x cos x = 1/4' },
        { math: 'sin x cos x = -3/8' },
      ],
    },
  },
  {
    id: 't11_trig_reduction_quadrant',
    grade: 11,
    chapterId: 'g11t_trig',
    tracks: ['tajrobi'],
    title: 'روابط تکمیلی: ناحیه، علامت و نسبت هم‌نام یا غیرهم‌نام',
    body: [
      'زاویه‌ی π ± x و 2π − x هم‌نام می‌مانند؛ π/2 ± x و 3π/2 ± x نسبت را به هم‌خانواده‌اش تبدیل می‌کنند (sin ↔ cos، tan ↔ cot).',
      'علامت را از ناحیه‌ی زاویه‌ی اصلی (x را تند فرض کن) بگیر.',
      { math: 'sin(π - x) = sin x   ,   cos(π + x) = -cos x   ,   tan(π + x) = tan x' },
      { math: 'sin(π/2 + x) = cos x   ,   cos(π/2 + x) = -sin x' },
    ],
    example: {
      question: [{ math: 'sin 210° + cos 300° + tan 135°' }, 'را حساب کن.'],
      solution: [
        { math: 'sin 210° = -sin 30° = -1/2   ,   cos 300° = cos 60° = 1/2   ,   tan 135° = -1' },
        { math: '-1/2 + 1/2 - 1 = -1' },
      ],
    },
  },
  {
    id: 't11_angle_formulas',
    grade: 11,
    chapterId: 'g11t_trig',
    tracks: ['tajrobi'],
    title: 'مجموع و دو برابر زاویه با tan',
    body: [
      { math: 'tan(α + β) = (tanα + tanβ)/(1 - tanα tanβ)' },
      { math: 'cos2α = (1 - tan^2 α)/(1 + tan^2 α)   ,   sin2α = 2tanα/(1 + tan^2 α)' },
      { math: 'cos2α = 1 - 2sin^2 α = 2cos^2 α - 1' },
      'اگر فقط tan داده شده، با این فرمول‌ها بدون پیدا کردن خود زاویه جواب می‌گیری.',
    ],
    example: {
      question: [{ math: 'tanα = 2' }, 'مقدار cos2α؟'],
      solution: [
        { math: 'cos2α = (1 - 4)/(1 + 4) = -3/5' },
      ],
    },
  },
  {
    id: 't11_trig_equation_general',
    grade: 11,
    chapterId: 'g11t_trig',
    tracks: ['tajrobi'],
    title: 'جواب کلی معادله‌ی مثلثاتی ساده',
    body: [
      { math: 'sin x = sin α ⇒ x = 2kπ + α  or  x = 2kπ + π - α' },
      { math: 'cos x = cos α ⇒ x = 2kπ ± α' },
      { math: 'tan x = tan α ⇒ x = kπ + α' },
      'برای جواب در بازه‌ی داده شده، k را عدد صحیح بگیر و فقط جواب‌های داخل بازه را نگه دار.',
      'اگر ضریب x عدد دیگری است (مثلاً 2x)، اول جواب کلی را برای 2x بنویس و بعد تقسیم کن.',
    ],
    example: {
      question: [{ math: '2cos x = sqrt(3)' }, 'جواب‌ها در [0, 2π]؟'],
      solution: [
        { math: 'cos x = cos(π/6) ⇒ x = 2kπ ± π/6' },
        { math: 'x = π/6  or  x = 11π/6' },
      ],
    },
  },
  {
    id: 't11_trig_period',
    grade: 11,
    chapterId: 'g11t_trig',
    tracks: ['tajrobi'],
    title: 'دوره‌ی تناوب و برد y = a sin(bx + c) + d',
    body: [
      { math: 'دوره‌ی تناوب = 2π/|b|   ,   برد = [d - |a| , d + |a|]' },
      'برای cos همین‌طور است. برای |sin x| و |cos x| دوره‌ی تناوب نصف می‌شود: π.',
      'sin² x و cos² x هم دوره‌ی π دارند.',
    ],
    example: {
      question: [{ math: 'y = 3 sin(2x - π/3) + 1' }, 'دوره‌ی تناوب و برد؟'],
      solution: [
        { math: 'T = 2π/2 = π' },
        { math: 'برد = [1 - 3 , 1 + 3] = [-2 , 4]' },
      ],
    },
  },
  {
    id: 't11_exp_equations',
    grade: 11,
    chapterId: 'g11t_exp_log',
    tracks: ['tajrobi'],
    title: 'معادله و نامعادله‌ی نمایی: هم‌پایه کن یا t = aˣ بگذار',
    body: [
      { math: 'aᵘ = aᵛ ⇒ u = v   (a > 0 , a ≠ 1)' },
      'اگر پایه‌ها متفاوت‌اند، همه را به‌صورت توانی از یک عدد بنویس. اگر 4ˣ و 2ˣ هم‌زمان هست، t = 2ˣ بگذار؛ t همیشه مثبت است.',
      'در نامعادله: پایه > 1 جهت می‌ماند، پایه بین 0 و 1 جهت برمی‌گردد.',
    ],
    example: {
      question: [{ math: '4^x - 5·2^x + 4 = 0' }, 'را حل کن.'],
      solution: [
        { math: 't = 2^x :  t^2 - 5t + 4 = 0 ⇒ t = 1  or  t = 4' },
        { math: 'x = 0  or  x = 2' },
      ],
    },
  },
  {
    id: 't11_log_rules',
    grade: 11,
    chapterId: 'g11t_exp_log',
    tracks: ['tajrobi'],
    title: 'قوانین لگاریتم و استفاده از log 2 و log 3',
    body: [
      { math: 'log(ab) = log a + log b   ,   log(a/b) = log a - log b   ,   log(a^n) = n log a' },
      { math: 'logₐ b = log b / log a   ,   logₐ(a) = 1   ,   logₐ(1) = 0' },
      { math: 'log 10 = 1   ,   log 5 = 1 - log 2   ,   log 50 = 2 - log 2' },
      'عدد داخل لگاریتم را بر حسب 10، 2 و 3 بنویس.',
    ],
    example: {
      question: ['اگر log 2 = a، مقدار log 50 بر حسب a؟'],
      solution: [
        { math: 'log 50 = log(100/2) = 2 - log 2 = 2 - a' },
      ],
    },
  },
  {
    id: 't11_log_equation',
    grade: 11,
    chapterId: 'g11t_exp_log',
    tracks: ['tajrobi'],
    title: 'معادله‌ی لگاریتمی: یک لگاریتم کن و شرط دامنه را فراموش نکن',
    body: [
      'لگاریتم‌های هم‌پایه را با قانون ضرب و تقسیم یکی کن، بعد از تعریف استفاده کن: logₐ A = c ⇒ A = aᶜ.',
      'همه‌ی عبارت‌های داخل لگاریتم باید مثبت باشند؛ جواب‌هایی که این شرط را ندارند حذف می‌شوند.',
    ],
    example: {
      question: [{ math: 'log₂ x + log₂(x - 2) = 3' }, 'را حل کن.'],
      solution: [
        { math: 'x(x - 2) = 8 ⇒ x^2 - 2x - 8 = 0 ⇒ x = 4  or  x = -2' },
        'شرط x > 2 فقط x = 4 را می‌پذیرد.',
      ],
    },
  },
  {
    id: 't11_limit_indeterminate',
    grade: 11,
    chapterId: 'g11t_limits',
    tracks: ['tajrobi'],
    title: 'حد 0/0: تجزیه کن یا در مزدوج ضرب کن',
    body: [
      'اول عدد را جایگذاری کن. اگر عدد/صفر شد حد بی‌نهایت یا ندارد؛ اگر 0/0 شد:',
      'چندجمله‌ای: صورت و مخرج را تجزیه کن و عامل صفرشونده را ساده کن.',
      { math: '(sqrt(A) - c)(sqrt(A) + c) = A - c^2' },
      'اگر رادیکال دارد، در مزدوج ضرب کن.',
    ],
    example: {
      question: [{ math: 'lim(x→3) (sqrt(x + 1) - 2)/(x - 3)' }, 'را حساب کن.'],
      solution: [
        { math: '= lim (x + 1 - 4)/((x - 3)(sqrt(x + 1) + 2)) = lim 1/(sqrt(x + 1) + 2)' },
        { math: '= 1/4' },
      ],
    },
  },
  {
    id: 't11_limit_floor',
    grade: 11,
    chapterId: 'g11t_limits',
    tracks: ['tajrobi'],
    title: 'حد چپ و راست: جزء صحیح و قدرمطلق',
    body: [
      'حد وقتی وجود دارد که حد چپ و راست برابر باشند.',
      { math: 'x → a⁺ ⇒ [x] = a   ,   x → a⁻ ⇒ [x] = a - 1   (a صحیح)' },
      { math: 'x → a⁺ ⇒ |x - a|/(x - a) = 1   ,   x → a⁻ ⇒ |x - a|/(x - a) = -1' },
      'در نقطه‌ی غیرصحیح، [x] در یک همسایگی ثابت است و حد همان مقدار است.',
    ],
    example: {
      question: [{ math: 'lim(x→2) ([x] + x^2)' }, 'آیا وجود دارد؟'],
      solution: [
        { math: 'x → 2⁻ : 1 + 4 = 5   ,   x → 2⁺ : 2 + 4 = 6' },
        'حد چپ و راست برابر نیست، پس حد وجود ندارد.',
      ],
    },
  },
  {
    id: 't11_continuity_piecewise',
    grade: 11,
    chapterId: 'g11t_limits',
    tracks: ['tajrobi'],
    title: 'پیوستگی تابع چندضابطه‌ای با پارامتر',
    body: [
      { math: 'lim(x→a⁻) f = lim(x→a⁺) f = f(a)' },
      'در نقطه‌ی مرزی حد چپ، حد راست و مقدار تابع را حساب کن و دو معادله بساز.',
      'هر پارامتر یک معادله می‌خواهد؛ تعداد معادله‌ها را با تعداد مجهول مقایسه کن.',
    ],
    example: {
      question: [
        { math: 'f(x) = ax + 1  (x < 1)   ,   f(1) = 3   ,   f(x) = x^2 + b  (x > 1)' },
        'f در x = 1 پیوسته است. a و b؟',
      ],
      solution: [
        { math: 'a + 1 = 3 ⇒ a = 2   ,   1 + b = 3 ⇒ b = 2' },
      ],
    },
  },
  {
    id: 't11_variance_cv',
    grade: 11,
    chapterId: 'g11t_statistics',
    tracks: ['tajrobi'],
    title: 'میانگین، واریانس و ضریب تغییرات',
    body: [
      { math: 'x̄ = Σx/n   ,   σ^2 = Σ(x - x̄)^2/n   ,   CV = σ/x̄' },
      { math: 'داده‌ها + c : میانگین + c ، σ بدون تغییر' },
      { math: 'داده‌ها × c : میانگین × c ، σ × |c| ، واریانس × c^2' },
      'ضریب تغییرات پراکندگی را بدون واحد مقایسه می‌کند.',
    ],
    example: {
      question: ['داده‌های 2، 4، 4، 6 را در نظر بگیر. واریانس داده‌های 2x + 3؟'],
      solution: [
        { math: 'x̄ = 4   ,   σ^2 = (4 + 0 + 0 + 4)/4 = 2' },
        { math: 'واریانس جدید = 2^2 × 2 = 8' },
      ],
    },
  },
  {
    id: 't11_conditional_probability',
    grade: 11,
    chapterId: 'g11t_statistics',
    tracks: ['tajrobi'],
    title: 'احتمال شرطی و استقلال',
    body: [
      { math: 'P(A | B) = P(A ∩ B) / P(B)' },
      { math: 'P(A ∪ B) = P(A) + P(B) - P(A ∩ B)' },
      { math: 'A , B مستقل ⇔ P(A ∩ B) = P(A)P(B)' },
      'اول P(A ∩ B) را از اجتماع پیدا کن، بعد شرطی را حساب کن.',
    ],
    example: {
      question: [{ math: 'P(A) = 0.5   ,   P(B) = 0.4   ,   P(A ∪ B) = 0.7' }, 'مقدار P(A | B)؟'],
      solution: [
        { math: 'P(A ∩ B) = 0.5 + 0.4 - 0.7 = 0.2' },
        { math: 'P(A | B) = 0.2/0.4 = 0.5' },
        'چون برابر P(A) است، A و B مستقل‌اند.',
      ],
    },
  },
  {
    id: 't11_quartiles',
    grade: 11,
    chapterId: 'g11t_statistics',
    tracks: ['tajrobi'],
    title: 'چارک‌ها و دامنه‌ی میان‌چارکی',
    body: [
      'داده‌ها را مرتب کن. Q₂ میانه است؛ Q₁ میانه‌ی نیمه‌ی پایین و Q₃ میانه‌ی نیمه‌ی بالاست (اگر n فرد باشد میانه در هیچ نیمه نیست).',
      { math: 'IQR = Q₃ - Q₁   ,   داده‌ی پرت : خارج از [Q₁ - 1.5 IQR , Q₃ + 1.5 IQR]' },
    ],
    example: {
      question: ['برای داده‌های 1، 3، 4، 6، 7، 9، 10، 12 دامنه‌ی میان‌چارکی؟'],
      solution: [
        'نیمه‌ی پایین: 1، 3، 4، 6 ⇒ Q₁ = 3.5.',
        'نیمه‌ی بالا: 7، 9، 10، 12 ⇒ Q₃ = 9.5.',
        { math: 'IQR = 9.5 - 3.5 = 6' },
      ],
    },
  },

  // ───────────────────────── ریاضی (۳) ─────────────────────────
  {
    id: 't12_inverse_composite',
    grade: 12,
    chapterId: 'g12t_function',
    tracks: ['tajrobi'],
    title: 'وارون ترکیب: (f∘g)⁻¹ = g⁻¹∘f⁻¹',
    body: [
      { math: '(f∘g)^(-1) = g^(-1) ∘ f^(-1)' },
      'ترتیب برعکس می‌شود. برای مقدار خاص، لازم نیست ضابطه‌ی ترکیب را بسازی؛ مقدار را از آخرین تابع به اولین ببر.',
      'تابع صعودی اکید (یا نزولی اکید) یک‌به‌یک است و وارون دارد.',
    ],
    example: {
      question: [{ math: 'f(x) = 2x + 1   ,   g(x) = x - 3' }, 'مقدار (f∘g)⁻¹(7)؟'],
      solution: [
        { math: 'f^(-1)(7) = 3   ,   g^(-1)(3) = 6' },
        'پس جواب 6 است. بررسی: (f∘g)(6) = 2 × 3 + 1 = 7.',
      ],
    },
  },
  {
    id: 't12_composition_domain',
    grade: 12,
    chapterId: 'g12t_function',
    tracks: ['tajrobi'],
    title: 'دامنه‌ی f∘g: x ∈ D_g و g(x) ∈ D_f',
    body: [
      { math: 'D_(f∘g) = { x ∈ D_g : g(x) ∈ D_f }' },
      'ضابطه‌ی ساده‌شده‌ی ترکیب را نگاه نکن؛ شرط تابع داخلی همیشه باقی می‌ماند.',
    ],
    example: {
      question: [{ math: 'f(x) = 1/(x - 1)   ,   g(x) = sqrt(x)' }, 'دامنه‌ی f∘g؟'],
      solution: [
        { math: 'x ≥ 0   ,   sqrt(x) ≠ 1 ⇒ x ≠ 1' },
        { math: 'D = [0, ∞) - {1}' },
      ],
    },
  },
  {
    id: 't12_tan_period',
    grade: 12,
    chapterId: 'g12t_trig',
    tracks: ['tajrobi'],
    title: 'تانژانت: دوره‌ی π/|b| و مجانب‌ها',
    body: [
      { math: 'y = a tan(bx + c) + d  ⇒  T = π/|b|' },
      'مجانب‌ها از bx + c = π/2 + kπ به دست می‌آیند.',
      'نمودار tan برد R دارد و در هر دوره از −∞ تا +∞ می‌رود (a > 0: صعودی).',
    ],
    example: {
      question: [{ math: 'y = tan(2x - π/3)' }, 'دوره‌ی تناوب و اولین مجانب مثبت؟'],
      solution: [
        { math: 'T = π/2' },
        { math: '2x - π/3 = π/2 ⇒ x = 5π/12' },
      ],
    },
  },
  {
    id: 't12_trig_equation_factor',
    grade: 12,
    chapterId: 'g12t_trig',
    tracks: ['tajrobi'],
    title: 'معادله‌ی مثلثاتی: فاکتور بگیر، هیچ عاملی را ساده نکن',
    body: [
      'sin2x را به 2 sin x cos x تبدیل کن و همه چیز را به یک طرف ببر.',
      'اگر یک عامل مشترک مثل cos x در دو طرف باشد، آن را حذف نکن؛ فاکتور بگیر تا جواب cos x = 0 را از دست ندهی.',
      'حاصل‌ضرب = 0 یعنی هر عامل را جدا برابر صفر بگذار.',
    ],
    example: {
      question: [{ math: 'sin2x = cos x' }, 'را حل کن.'],
      solution: [
        { math: 'cos x (2 sin x - 1) = 0' },
        { math: 'cos x = 0 ⇒ x = kπ + π/2' },
        { math: 'sin x = 1/2 ⇒ x = 2kπ + π/6  or  x = 2kπ + 5π/6' },
      ],
    },
  },
  {
    id: 't12_trig_equation_quadratic',
    grade: 12,
    chapterId: 'g12t_trig',
    tracks: ['tajrobi'],
    title: 'معادله‌ی مثلثاتی درجه ۲: همه‌چیز را بر حسب یک نسبت بنویس',
    body: [
      'با sin² = 1 − cos² (یا برعکس) معادله را بر حسب یک نسبت بنویس، t = cos x (یا sin x) بگذار و معادله‌ی درجه ۲ را حل کن.',
      'جواب‌های t باید بین −1 و 1 باشند؛ بقیه رد می‌شوند.',
    ],
    example: {
      question: [{ math: '2cos^2(x) + cos x - 1 = 0' }, 'را حل کن.'],
      solution: [
        { math: '(2t - 1)(t + 1) = 0 ⇒ t = 1/2  or  t = -1' },
        { math: 'cos x = 1/2 ⇒ x = 2kπ ± π/3   ,   cos x = -1 ⇒ x = 2kπ + π' },
      ],
    },
  },
  {
    id: 't12_limit_infinity',
    grade: 12,
    chapterId: 'g12t_limits',
    tracks: ['tajrobi'],
    title: 'حد در بی‌نهایت: بزرگ‌ترین توان را مقایسه کن',
    body: [
      'برای تابع کسری در ±∞ فقط جمله‌ی با بزرگ‌ترین توان در صورت و مخرج مهم است:',
      { math: 'درجه‌ی صورت < مخرج ⇒ 0   ,   مساوی ⇒ نسبت ضریب‌ها   ,   بزرگ‌تر ⇒ ±∞' },
      { math: 'x → -∞ : sqrt(x^2) = |x| = -x' },
      { math: 'lim sin x / x = 0   ,   lim (x + cos x)/x = 1   (x → ∞)' },
      'تفاضل دو رادیکال: در مزدوج ضرب کن.',
    ],
    example: {
      question: [{ math: 'lim(x→∞) (ax^2 + 3x)/(2x^2 - 1) = 4' }, 'مقدار a؟'],
      solution: [
        'درجه‌ها برابرند، پس حد = نسبت ضریب‌های x².',
        { math: 'a/2 = 4 ⇒ a = 8' },
      ],
    },
  },
  {
    id: 't12_limit_vertical',
    grade: 12,
    chapterId: 'g12t_limits',
    tracks: ['tajrobi'],
    title: 'حد بی‌نهایت و مجانب‌ها: علامت صورت و مخرج را جدا بررسی کن',
    body: [
      'اگر مخرج به 0 و صورت به عدد غیرصفر برود، حد ±∞ است؛ علامت را از علامت صورت و علامت مخرج (در سمت چپ یا راست) بگیر.',
      { math: 'x = a مجانب قائم : lim = ±∞   ,   y = L مجانب افقی : lim(x→±∞) f = L' },
      'توان زوج مخرج، مثل (x − a)²، مثبت است و حد دو طرف یکی است.',
    ],
    example: {
      question: [{ math: 'lim(x→2⁻) (x + 1)/(x - 2)' }, 'را حساب کن.'],
      solution: [
        'صورت به 3 (مثبت) می‌رود. وقتی x از چپ به 2 می‌رسد x − 2 کوچک و منفی است.',
        { math: 'مثبت / منفی ⇒ -∞' },
      ],
    },
  },
  {
    id: 't12_derivative_rules',
    grade: 12,
    chapterId: 'g12t_derivative',
    tracks: ['tajrobi'],
    title: 'قواعد مشتق: توان، ضرب، تقسیم و زنجیره‌ای',
    body: [
      { math: "(x^n)' = n x^(n-1)   ,   (sqrt(x))' = 1/(2 sqrt(x))   ,   (1/x)' = -1/x^2" },
      { math: "(uv)' = u'v + uv'   ,   (u/v)' = (u'v - uv')/v^2" },
      { math: "(u^n)' = n u^(n-1) · u'" },
      'مشتق قبل از جایگذاری عدد را کامل بگیر، بعد عدد بگذار.',
    ],
    example: {
      question: [{ math: 'f(x) = (x^2 + 1)^3' }, "مقدار f′(1)؟"],
      solution: [
        { math: "f'(x) = 3(x^2 + 1)^2 · 2x = 6x(x^2 + 1)^2" },
        { math: "f'(1) = 6 × 4 = 24" },
      ],
    },
  },
  {
    id: 't12_tangent_line',
    grade: 12,
    chapterId: 'g12t_derivative',
    tracks: ['tajrobi'],
    title: 'خط مماس: شیب = مشتق در نقطه‌ی تماس',
    body: [
      { math: "y - f(a) = f'(a)(x - a)" },
      "اگر مماس موازی خط y = mx + n باشد، f′(x) = m را حل کن؛ اگر عمود باشد f′(x) = −1/m.",
      'اگر نقطه‌ی تماس معلوم نیست، آن را a بنام، شیب را f′(a) بگیر و با شرط‌های دیگر مسئله ترکیب کن.',
    ],
    example: {
      question: [{ math: 'f(x) = x^3 - 2x' }, 'معادله‌ی مماس در x = 1؟'],
      solution: [
        { math: "f(1) = -1   ,   f'(x) = 3x^2 - 2 ⇒ f'(1) = 1" },
        { math: 'y + 1 = x - 1 ⇒ y = x - 2' },
      ],
    },
  },
  {
    id: 't12_rate_of_change',
    grade: 12,
    chapterId: 'g12t_derivative',
    tracks: ['tajrobi'],
    title: 'آهنگ تغییر متوسط و لحظه‌ای',
    body: [
      { math: 'متوسط روی [a, b] : (f(b) - f(a))/(b - a)   ,   لحظه‌ای در a : f′(a)' },
      'آهنگ متوسط شیب خط قاطع و آهنگ لحظه‌ای شیب خط مماس است.',
      'اگر s(t) مکان باشد، v = s′ سرعت و a = v′ شتاب است.',
    ],
    example: {
      question: [{ math: 'f(x) = x^2 + x' }, 'در کدام x آهنگ لحظه‌ای با آهنگ متوسط روی [1, 3] برابر است؟'],
      solution: [
        { math: '(12 - 2)/2 = 5' },
        { math: "f'(x) = 2x + 1 = 5 ⇒ x = 2" },
      ],
    },
  },
  {
    id: 't12_differentiability',
    grade: 12,
    chapterId: 'g12t_derivative',
    tracks: ['tajrobi'],
    title: 'مشتق‌پذیری تابع چندضابطه‌ای: پیوستگی + برابری مشتق‌ها',
    body: [
      'مشتق‌پذیر ⇒ پیوسته؛ برعکس درست نیست (مثل |x| در صفر).',
      'در نقطه‌ی مرزی دو شرط بنویس: مقدار دو ضابطه برابر و مشتق دو ضابطه برابر.',
      'نقطه‌ی گوشه، مماس قائم و ناپیوستگی نقطه‌ی عدم مشتق‌پذیری هستند.',
    ],
    example: {
      question: [{ math: 'f(x) = ax^2 + b  (x ≤ 1)   ,   f(x) = 2x + 1  (x > 1)' }, 'f در x = 1 مشتق‌پذیر است. a و b؟'],
      solution: [
        { math: "مشتق‌ها : 2a = 2 ⇒ a = 1" },
        { math: 'پیوستگی : a + b = 3 ⇒ b = 2' },
      ],
    },
  },
  {
    id: 't12_extrema',
    grade: 12,
    chapterId: 'g12t_applications',
    tracks: ['tajrobi'],
    title: 'اکسترمم: جدول علامت f′ و مقایسه‌ی نقطه‌های انتهایی',
    body: [
      "نقاط f′ = 0 یا f′ نامعلوم (در دامنه) را پیدا کن و علامت f′ را دو طرف آن‌ها ببین.",
      'تغییر علامت f′ از + به − ماکزیمم نسبی و از − به + مینیمم نسبی است.',
      'ماکزیمم و مینیمم مطلق روی بازه‌ی بسته: مقدار f در نقطه‌های بحرانی و دو سر بازه را مقایسه کن.',
    ],
    example: {
      question: [{ math: 'f(x) = x^3 - 3x^2' }, 'روی [−1, 3] بیشترین و کمترین مقدار؟'],
      solution: [
        { math: "f'(x) = 3x(x - 2) = 0 ⇒ x = 0 , 2" },
        { math: 'f(-1) = -4   ,   f(0) = 0   ,   f(2) = -4   ,   f(3) = 0' },
        'بیشترین 0 و کمترین −4.',
      ],
    },
  },
  {
    id: 't12_monotonic_derivative',
    grade: 12,
    chapterId: 'g12t_applications',
    tracks: ['tajrobi'],
    title: 'صعودی یا نزولی بودن: علامت f′',
    body: [
      "f′ > 0 ⇒ صعودی ، f′ < 0 ⇒ نزولی.",
      "«روی کل R صعودی» یعنی f′ ≥ 0 برای همه‌ی x. اگر f′ درجه ۲ است، شرطش a > 0 و Δ ≤ 0 است.",
    ],
    example: {
      question: [{ math: 'f(x) = x^3 + 3x^2 + mx' }, 'روی R صعودی است. m چه بازه‌ای است؟'],
      solution: [
        { math: "f'(x) = 3x^2 + 6x + m ≥ 0" },
        { math: 'Δ = 36 - 12m ≤ 0 ⇒ m ≥ 3' },
      ],
    },
  },
  {
    id: 't12_optimization',
    grade: 12,
    chapterId: 'g12t_applications',
    tracks: ['tajrobi'],
    title: 'بهینه‌سازی: یک متغیر بنویس، مشتق بگیر',
    body: [
      '۱. مقدار مورد بهینه (مساحت، حجم، ...) را بنویس. ۲. با شرط مسئله آن را بر حسب یک متغیر کن. ۳. مشتق را صفر کن و دامنه‌ی متغیر را بررسی کن.',
      'مستطیل با قاعده روی محور x و دو رأس بالا روی منحنی y = f(x): ابعاد 2x و f(x) هستند.',
      'مثال‌های دیگر: با محیط ثابت بیشترین مساحت (مربع)، یا نرده‌کشی سه طرف زمین که یک طرفش دیوار است.',
    ],
    example: {
      question: ['مستطیلی با قاعده روی محور x و دو رأس بالا روی منحنی y = 4 − x² محاط شده است. بیشترین مساحت؟'],
      solution: [
        { math: 'A = 2x(4 - x^2) = 8x - 2x^3   ,   0 < x < 2' },
        { math: "A' = 8 - 6x^2 = 0 ⇒ x = 2/sqrt(3)" },
        { math: 'A = (4/sqrt(3))(4 - 4/3) = (4/sqrt(3))(8/3) = 32 sqrt(3)/9' },
      ],
    },
  },
  {
    id: 't12_circle_tangent',
    grade: 12,
    chapterId: 'g12t_geometry',
    tracks: ['tajrobi'],
    title: 'دایره و مماس: شعاع عمود بر مماس، دو مماس برابرند',
    body: [
      'شعاع در نقطه‌ی تماس بر مماس عمود است.',
      'دو مماس رسم‌شده از یک نقطه‌ی بیرونی هم‌اندازه‌اند.',
      { math: 'PT^2 = PO^2 - r^2   ,   PT^2 = PA · PB  (قاطع)' },
    ],
    example: {
      question: ['نقطه‌ی P به فاصله‌ی 13 از مرکز دایره‌ای به شعاع 5 است. طول مماس رسم‌شده از P؟'],
      solution: [
        { math: 'PT = sqrt(13^2 - 5^2) = sqrt(144) = 12' },
      ],
    },
  },
  {
    id: 't12_circle_line',
    grade: 12,
    chapterId: 'g12t_geometry',
    tracks: ['tajrobi'],
    title: 'معادله‌ی دایره و وضعیت خط نسبت به آن: فاصله با r',
    body: [
      { math: '(x - a)^2 + (y - b)^2 = r^2' },
      { math: 'فاصله‌ی مرکز تا خط : d = |ax₀ + by₀ + c|/sqrt(a^2 + b^2)' },
      { math: 'd > r : بیرونی   ,   d = r : مماس   ,   d < r : قاطع' },
    ],
    example: {
      question: [{ math: 'x^2 + y^2 = 25' }, 'خط 3x + 4y + c = 0 بر دایره مماس است. c؟'],
      solution: [
        { math: 'd = |c|/5 = 5 ⇒ |c| = 25' },
        { math: 'c = 25  or  c = -25' },
      ],
    },
  },
  {
    id: 't12_inscribed_angle',
    grade: 12,
    chapterId: 'g12t_geometry',
    tracks: ['tajrobi'],
    title: 'زاویه‌های دایره: محاطی، ظلی، داخلی و خارجی',
    body: [
      'محاطی = نصف کمان مقابل. مماس و وتر = نصف کمان بین‌شان.',
      'دو وتر که داخل دایره تقاطع دارند: زاویه = نصف مجموع دو کمان.',
      'دو قاطع (یا قاطع و مماس) که بیرون از دایره تقاطع دارند: زاویه = نصف تفاضل دو کمان.',
    ],
    example: {
      question: ['دو قاطع از نقطه‌ای بیرون دایره دو کمان 110° و 40° جدا می‌کنند. زاویه‌ی بین دو قاطع؟'],
      solution: [
        { math: '(110° - 40°)/2 = 35°' },
      ],
    },
  },
  {
    id: 't12_total_probability',
    grade: 12,
    chapterId: 'g12t_probability',
    tracks: ['tajrobi'],
    title: 'قانون احتمال کل و بیز: درخت احتمال بکش',
    body: [
      { math: 'P(A) = P(B₁)P(A | B₁) + P(B₂)P(A | B₂) + ...' },
      { math: 'P(B₁ | A) = P(B₁)P(A | B₁) / P(A)' },
      'B ها باید یک افراز باشند (جدا از هم و با اجتماع کل).',
      'برای «برعکس سؤال» (پیدا کردن علت از روی نتیجه) از فرمول بیز استفاده کن؛ مخرج همان احتمال کل است.',
    ],
    example: {
      question: ['ظرف اول 3 مهره‌ی سفید و 2 سیاه و ظرف دوم 1 سفید و 4 سیاه دارد. یک ظرف تصادفی انتخاب و مهره‌ای برمی‌داریم. احتمال سفید؟ اگر سفید بود احتمال اینکه از ظرف اول باشد؟'],
      solution: [
        { math: 'P(سفید) = 1/2 × 3/5 + 1/2 × 1/5 = 2/5' },
        { math: 'P(ظرف اول | سفید) = (3/10)/(2/5) = 3/4' },
      ],
    },
  },
  {
    id: 't12_counting',
    grade: 12,
    chapterId: 'g12t_probability',
    tracks: ['tajrobi'],
    title: 'شمارش با شرط: کنار هم، جدا از هم و ارقام',
    body: [
      'اگر دو نفر باید کنار هم باشند، آن‌ها را یک بسته حساب کن و بسته را جابه‌جا کن (در ضرب 2! داخل بسته).',
      'برای «کنار هم نباشند»: کل حالت‌ها − حالت‌های کنار هم.',
      'در عدد چندرقمی اول جایگاه‌دارای محدودیت (صفر در سمت چپ، رقم زوج در یکان) را پر کن.',
    ],
    example: {
      question: ['۵ نفر به چند طریق در یک ردیف می‌ایستند که A و B کنار هم باشند؟'],
      solution: [
        { math: '2! × 4! = 2 × 24 = 48' },
      ],
    },
  },
  {
    id: 't12_coin_dice',
    grade: 12,
    chapterId: 'g12t_probability',
    tracks: ['tajrobi'],
    title: 'سکه و تاس: فضای نمونه و «حداقل یک»',
    body: [
      'n سکه: 2ⁿ حالت؛ n تاس: 6ⁿ حالت.',
      { math: 'P(حداقل یک) = 1 - P(هیچ‌کدام)' },
      'برای مجموع دو تاس، جدول ۳۶ حالت را بنویس: مجموع 7 شش حالت دارد.',
    ],
    example: {
      question: ['سه تاس ریخته می‌شود. احتمال اینکه حداقل یک تاس 6 بیاید؟'],
      solution: [
        { math: '1 - (5/6)^3 = 1 - 125/216 = 91/216' },
      ],
    },
  },
];

// Real exam questions, one file per booklet (keys solved here — compare with
// the official Sanjesh keys when found; see each file's header).
export const TAJROBI_QUESTIONS: KonkurQuestion[] = [
  ...TAJROBI_1405,
  ...TAJROBI_1404B,
  ...TAJROBI_1404A,
  ...TAJROBI_1403B,
  ...TAJROBI_1403B_ABROAD,
  ...TAJROBI_1403A,
  ...TAJROBI_1402B,
  ...TAJROBI_1402A,
];
