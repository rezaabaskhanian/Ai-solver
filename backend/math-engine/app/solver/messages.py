"""Step explanations in every language the app ships (PRD section 18:
"Subtract 5 from both sides." / «۵ را از هر دو طرف کم می‌کنیم.»).

Solvers never hard-code explanation text: they call `explained(key,
**params)`, which fills StepData's English `explanation` (so everything
that reads it directly — tests, check.py's hints — behaves exactly as
before) and also records the message key + params. main.py then renders
the text in the request's language via `render_step_explanation`.

Math inside a Persian sentence (e.g. "-3" or "2x") is wrapped in Unicode
directional isolates (LRI … PDI) so the RTL paragraph can't reorder it —
otherwise "-3" would show as "3-".
"""
from typing import Any

DEFAULT_LANG = "en"
SUPPORTED_LANGS = ("en", "fa")

_LRI = "⁦"
_PDI = "⁩"

MESSAGES: dict[str, dict[str, str]] = {
    # linear.py
    "expand": {
        "en": "Expand the parentheses: multiply the number in front of each bracket by every term inside it (a minus sign in front flips the sign of every term inside).",
        "fa": "پرانتزها را باز می‌کنیم: عددِ پشت هر پرانتز را در تک‌تک جمله‌های داخل آن ضرب می‌کنیم (اگر پشت پرانتز منفی باشد، علامت همه‌ی جمله‌های داخلش عوض می‌شود).",
    },
    "subtract_both_sides": {
        "en": "Subtract {value} from both sides.",
        "fa": "{value} را از هر دو طرف کم می‌کنیم.",
    },
    "add_both_sides": {
        "en": "Add {value} to both sides.",
        "fa": "{value} را به هر دو طرف اضافه می‌کنیم.",
    },
    "divide_both_sides": {
        "en": "Divide both sides by {value}.",
        "fa": "هر دو طرف را بر {value} تقسیم می‌کنیم.",
    },
    "multiply_both_sides": {
        "en": "Multiply both sides by {value}.",
        "fa": "هر دو طرف را در {value} ضرب می‌کنیم.",
    },
    "lin_var_subtract": {
        "en": "Gather the {symbol} terms on the left: subtract {value} from both sides, so it cancels on the right ({cancel}). Doing the same to both sides keeps the equation balanced.",
        "fa": "جمله‌های دارای {symbol} را در سمت چپ جمع می‌کنیم: {value} را از هر دو طرف کم می‌کنیم تا در سمت راست حذف شود ({cancel}). چون با هر دو طرف یک کار را می‌کنیم، تساوی به هم نمی‌خورد.",
    },
    "lin_var_add": {
        "en": "Gather the {symbol} terms on the left: add {value} to both sides, so {term} cancels on the right ({cancel}). Doing the same to both sides keeps the equation balanced.",
        "fa": "جمله‌های دارای {symbol} را در سمت چپ جمع می‌کنیم: {value} را به هر دو طرف اضافه می‌کنیم تا {term} در سمت راست حذف شود ({cancel}). چون با هر دو طرف یک کار را می‌کنیم، تساوی به هم نمی‌خورد.",
    },
    "lin_const_subtract": {
        "en": "To get {symbol} on its own, remove the number {value} from the left: subtract {value} from both sides ({cancel}). Whatever we do to one side we must do to the other.",
        "fa": "برای این‌که {symbol} تنها بماند، عدد {value} را از سمت چپ حذف می‌کنیم: از هر دو طرف {value} کم می‌کنیم ({cancel}). هر کاری با یک طرف تساوی بکنیم، باید با طرف دیگر هم بکنیم.",
    },
    "lin_const_add": {
        "en": "To get {symbol} on its own, remove {term} from the left: add {value} to both sides ({cancel}). Whatever we do to one side we must do to the other.",
        "fa": "برای این‌که {symbol} تنها بماند، {term} را از سمت چپ حذف می‌کنیم: {value} را به هر دو طرف اضافه می‌کنیم ({cancel}). هر کاری با یک طرف تساوی بکنیم، باید با طرف دیگر هم بکنیم.",
    },
    "lin_divide": {
        "en": "{symbol} is multiplied by {value}; dividing is the opposite of multiplying, so divide both sides by {value} ({cancel}).",
        "fa": "{symbol} در {value} ضرب شده است؛ عکسِ ضرب، تقسیم است، پس هر دو طرف را بر {value} تقسیم می‌کنیم ({cancel}).",
    },
    "lin_multiply": {
        "en": "The coefficient of {symbol} is the fraction {coeff}; multiply both sides by its reciprocal {value}, so the coefficient becomes 1 ({cancel}).",
        "fa": "ضریب {symbol} کسر {coeff} است؛ هر دو طرف را در معکوس آن یعنی {value} ضرب می‌کنیم تا ضریب {symbol} یک شود ({cancel}).",
    },
    # quadratic.py
    "standard_form": {
        "en": "Move every term to the left so the right side is 0 (a term changes sign when it crosses the = sign). Only in the standard form ax^2 + bx + c = 0 can we factor or use the formula.",
        "fa": "همه‌ی جمله‌ها را به سمت چپ می‌بریم تا سمت راست صفر شود (هر جمله‌ای که از یک طرف تساوی به طرف دیگر برود، علامتش عوض می‌شود). فقط در شکل استاندارد {form} می‌توانیم تجزیه کنیم یا از فرمول استفاده کنیم.",
    },
    "factor": {
        "en": "Factor the left-hand side.",
        "fa": "سمت چپ معادله را تجزیه می‌کنیم.",
    },
    # The factor step says *how* it factored, not just that it did: the
    # two numbers (sum/product), the common factor, or the a·c split.
    "factor_sum_product": {
        "en": "Look for two numbers whose product is the constant term ({c}) and whose sum is the coefficient of {symbol} ({b}). They are {p} and {q}, because {prod} and {sum}. So the expression factors as {factored}.",
        "fa": "دنبال دو عدد می‌گردیم که حاصل‌ضربشان برابر عدد ثابت ({c}) و مجموعشان برابر ضریب {symbol} ({b}) باشد. این دو عدد {p} و {q} هستند، چون {prod} و {sum}. پس عبارت به شکل {factored} تجزیه می‌شود.",
    },
    "factor_common": {
        "en": "Both terms contain {factor}, so take {factor} out as a common factor: {factored}.",
        "fa": "هر دو جمله {factor} دارند، پس {factor} را فاکتور می‌گیریم (بیرون پرانتز می‌نویسیم): {factored}.",
    },
    "factor_ac": {
        "en": "The coefficient of {symbol}^2 is {a}, so multiply it by the constant term: {ac_eq}. Find two numbers whose product is {ac} and whose sum is {b}: {p} and {q}, because {prod} and {sum}. Split the middle term with them: {split}. Factor each pair and take out the common bracket: {factored}.",
        "fa": "ضریب جمله‌ی درجه‌دو {a} است، پس آن را در عدد ثابت ضرب می‌کنیم: {ac_eq}. دو عدد پیدا می‌کنیم که حاصل‌ضربشان {ac} و مجموعشان {b} باشد: {p} و {q}، چون {prod} و {sum}. جمله‌ی وسط را با این دو عدد می‌شکنیم: {split}. از هر دو جمله فاکتور می‌گیریم و پرانتز مشترک را بیرون می‌آوریم: {factored}.",
    },
    "zero_product": {
        "en": "If a product is zero, at least one factor must be zero.",
        "fa": "اگر حاصل‌ضرب صفر باشد، دست‌کم یکی از عامل‌ها صفر است.",
    },
    "zero_product_each": {
        "en": "If a product is zero, at least one factor must be zero. So set each bracket to zero separately — {eq1} or {eq2} — and solve each one.",
        "fa": "اگر حاصل‌ضرب چند عامل صفر باشد، دست‌کم یکی از آن‌ها صفر است. پس هر عامل را جدا برابر صفر می‌گذاریم — {eq1} یا {eq2} — و هر کدام را حل می‌کنیم.",
    },
    "apply_quadratic_formula": {
        "en": "Use the quadratic formula, which works for every quadratic equation. First write the coefficients with their signs: {coeffs}.",
        "fa": "از فرمول کلی معادله‌ی درجه‌دو استفاده می‌کنیم که برای همه‌ی معادله‌های درجه‌دو کار می‌کند. اول ضریب‌ها را با علامتشان می‌نویسیم: {coeffs}.",
    },
    "compute_discriminant": {
        "en": "Compute the discriminant: {calc}. It tells us how many solutions there are: positive → two, zero → one, negative → no real solution.",
        "fa": "دلتا (مبیّن) را حساب می‌کنیم: {calc}. دلتا تعداد جواب‌ها را نشان می‌دهد: مثبت ← دو جواب، صفر ← یک جواب، منفی ← جواب حقیقی ندارد.",
    },
    "system_standard_form": {
        "en": "Write both equations in the form ax + by = c.",
        "fa": "هر دو معادله را به شکل {form} می‌نویسیم.",
    },
    "method_elimination": {
        "en": "Method 1 — elimination: combine the equations so one unknown cancels.",
        "fa": "روش اول — حذفی: دو معادله را طوری ضرب و جمع می‌کنیم که یکی از مجهول‌ها حذف شود.",
    },
    "elim_multiply": {
        "en": "Multiply the first equation by {m1} and the second by {m2}, so {var} has the same size of coefficient in both.",
        "fa": "معادله‌ی اول را در {m1} و معادله‌ی دوم را در {m2} ضرب می‌کنیم تا ضریب {var} در هر دو هم‌اندازه شود.",
    },
    "elim_multiply_one": {
        "en": "Multiply equation ({which}) by {m}, so {var} has the same size of coefficient in both.",
        "fa": "معادله‌ی ({which}) را در {m} ضرب می‌کنیم تا ضریب {var} در هر دو معادله هم‌اندازه شود.",
    },
    "elim_add": {
        "en": "Add the two equations: {var} cancels out.",
        "fa": "دو معادله را با هم جمع می‌کنیم؛ {var} حذف می‌شود.",
    },
    "elim_subtract": {
        "en": "Subtract the second equation from the first: {var} cancels out.",
        "fa": "معادله‌ی دوم را از اولی کم می‌کنیم؛ {var} حذف می‌شود.",
    },
    "solve_one_variable": {
        "en": "Now there is only one unknown: solve it like a simple linear equation (divide both sides by its coefficient).",
        "fa": "حالا فقط یک مجهول داریم؛ مثل یک معادله‌ی درجه‌یک ساده حلش می‌کنیم (دو طرف را بر ضریب مجهول تقسیم می‌کنیم).",
    },
    "back_substitute_value": {
        "en": "Put {known} = {value} back in to find {var}.",
        "fa": "مقدار {assign} را جای‌گذاری می‌کنیم تا {var} به دست بیاید.",
    },
    "method_substitution": {
        "en": "Method 2 — substitution: find one unknown from one equation and put it into the other.",
        "fa": "روش دوم — جایگزینی: یک مجهول را از یک معادله پیدا می‌کنیم و در معادله‌ی دیگر می‌گذاریم.",
    },
    "subst_isolate": {
        "en": "From equation ({which}), write {var} in terms of {other}.",
        "fa": "از معادله‌ی ({which})، {var} را برحسب {other} می‌نویسیم.",
    },
    "subst_replace": {
        "en": "Replace {var} in the other equation with this expression.",
        "fa": "این عبارت را به جای {var} در معادله‌ی دیگر می‌گذاریم.",
    },
    "subst_simplify": {
        "en": "Expand and simplify.",
        "fa": "پرانتزها را باز و عبارت را ساده می‌کنیم.",
    },
    "system_answer": {
        "en": "Both methods give the same answer.",
        "fa": "هر دو روش به یک جواب می‌رسند.",
    },
    "system_no_solution": {
        "en": "We reached a false equality, so the system has no solution (the lines are parallel).",
        "fa": "به یک تساوی نادرست رسیدیم، پس دستگاه جواب ندارد (دو خط موازی‌اند).",
    },
    "system_infinite": {
        "en": "We reached 0 = 0, so the system has infinitely many solutions (the same line).",
        "fa": "به تساوی همیشه‌درست رسیدیم، پس دستگاه بی‌شمار جواب دارد (دو خط بر هم منطبق‌اند).",
    },
    "biquadratic_standard_form": {
        "en": "Move every term to one side so the other side is 0 (a term changes sign when it crosses the = sign).",
        "fa": "همه‌ی جمله‌ها را به یک طرف می‌بریم تا طرف دیگر صفر شود (هر جمله‌ای که از یک طرف به طرف دیگر برود، علامتش عوض می‌شود).",
    },
    "biquadratic_substitute": {
        "en": "Only even powers appear, and {symbol}^4 = ({symbol}^2)^2. So call t = {symbol}^2: the equation becomes an ordinary quadratic in t.",
        "fa": "فقط توان‌های زوج داریم و {pow4}. پس با تغییر متغیر {assign} معادله نسبت به t یک معادله‌ی درجه‌دو معمولی می‌شود که بلدیم حلش کنیم.",
    },
    "biquadratic_back": {
        "en": "Go back to {symbol}: {symbol}^2 = {value}. Take the square root of both sides — both a positive and a negative number square to {value}, so there are two answers (±).",
        "fa": "به متغیر اصلی برمی‌گردیم: {assign}. از دو طرف جذر می‌گیریم؛ چون هم عدد مثبت و هم عدد منفی به توان دو مثبت می‌شوند، دو جواب (±) داریم.",
    },
    "biquadratic_back_zero": {
        "en": "Go back to {symbol}: {symbol}^2 = 0 only when {symbol} = 0.",
        "fa": "به متغیر اصلی برمی‌گردیم: {assign} فقط وقتی درست است که {zero} باشد.",
    },
    "biquadratic_negative_square": {
        "en": "{symbol}^2 = {value} is impossible: no real number squared is negative, so this value of t gives no answer.",
        "fa": "{assign} ممکن نیست، چون مربع هیچ عدد حقیقی منفی نمی‌شود؛ پس این مقدار t جوابی نمی‌دهد.",
    },
    "cubic_standard_form": {
        "en": "Move every term to one side so the other side is 0 (a term changes sign when it crosses the = sign).",
        "fa": "همه‌ی جمله‌ها را به یک طرف می‌بریم تا طرف دیگر صفر شود (هر جمله‌ای که از یک طرف به طرف دیگر برود، علامتش عوض می‌شود).",
    },
    "cubic_isolate_cube": {
        "en": "The unknown only appears in the cube term, so get it on its own: move the number to the other side and divide by its coefficient.",
        "fa": "مجهول فقط در جمله‌ی مکعب هست، پس آن را تنها می‌کنیم: عدد را به طرف دیگر می‌بریم و بر ضریبش تقسیم می‌کنیم.",
    },
    "cubic_cube_root": {
        "en": "Take the cube root of both sides: {calc}. Unlike a square root, a cube root exists for negative numbers too and gives just one answer.",
        "fa": "از دو طرف ریشه‌ی سوم می‌گیریم: {calc}. برخلاف جذر، ریشه‌ی سوم عدد منفی هم تعریف شده و فقط یک جواب می‌دهد.",
    },
    "cubic_common_factor": {
        "en": "There is no constant term, so every term contains {factor}: take it out as a common factor. {factor} = 0 gives {symbol} = 0; the other answers come from setting the bracket to zero.",
        "fa": "معادله جمله‌ی ثابت ندارد، پس همه‌ی جمله‌ها {factor} دارند و آن را فاکتور می‌گیریم. از صفر شدن {factor} جواب {assign0} به دست می‌آید و بقیه‌ی جواب‌ها از صفر کردن پرانتز.",
    },
    "cubic_rational_root": {
        "en": "Look for a whole-number or fractional root among the divisors of the constant term (over the divisors of the leading coefficient): {candidates}. Trying {symbol} = {root} makes the expression 0, so it is a root.",
        "fa": "ریشه‌ی گویا را بین مقسوم‌علیه‌های جمله‌ی ثابت (تقسیم بر مقسوم‌علیه‌های ضریب بزرگ‌ترین توان) جست‌وجو می‌کنیم: {candidates}. با امتحان {assign} عبارت صفر می‌شود، پس این عدد یکی از ریشه‌هاست.",
    },
    "cubic_divide": {
        "en": "Since {symbol} = {root} is a root, {factor} is a factor. Divide the polynomial by {factor} (long division or Horner's method): the quotient is {quotient}.",
        "fa": "چون {assign} ریشه است، {factor} یکی از عامل‌های عبارت است. عبارت را بر {factor} تقسیم می‌کنیم (تقسیم چندجمله‌ای‌ها یا روش هورنر) و خارج‌قسمت {quotient} به دست می‌آید.",
    },
    "cubic_linear_factor": {
        "en": "Set the remaining first-degree factor to zero and solve it like a simple linear equation.",
        "fa": "عامل درجه‌یک باقی‌مانده را برابر صفر می‌گذاریم و مثل یک معادله‌ی درجه‌یک ساده حلش می‌کنیم.",
    },
    "cubic_collect_roots": {
        "en": "Write together all the solutions we found from the different factors.",
        "fa": "همه‌ی جواب‌هایی را که از عامل‌های مختلف به دست آمد، کنار هم می‌نویسیم.",
    },
    "no_real_roots": {
        "en": "The discriminant is {value}, which is negative. The formula needs its square root, and a negative number has no real square root, so there is no real solution.",
        "fa": "دلتا برابر {value} و منفی است. در فرمول باید از دلتا جذر بگیریم و عدد منفی جذر حقیقی ندارد، پس معادله ریشه‌ی حقیقی ندارد.",
    },
    "compute_roots": {
        "en": "Put the numbers into the formula: {calc}. The ± means we compute it once with + and once with −, which gives the two solutions.",
        "fa": "عددها را در فرمول می‌گذاریم: {calc}. علامت ± یعنی یک بار با جمع و یک بار با تفریق حساب می‌کنیم؛ این‌طوری دو جواب به دست می‌آید.",
    },
    "compute_double_root": {
        "en": "The discriminant is 0, so ± changes nothing and there is one (double) solution: {calc}.",
        "fa": "دلتا صفر است، پس ± فرقی ایجاد نمی‌کند و معادله یک جواب (ریشه‌ی مضاعف) دارد: {calc}.",
    },
    # expression.py
    "simplify": {
        "en": "Simplify: expand brackets, combine like terms, and reduce fractions as far as possible.",
        "fa": "عبارت را ساده می‌کنیم: پرانتزها را باز می‌کنیم، جمله‌های متشابه را با هم جمع می‌کنیم و کسرها را تا جایی که می‌شود ساده می‌کنیم.",
    },
    # trig.py
    "trig_degrees_to_radians": {
        "en": "Convert the angles from degrees to radians: π radians = 180°, so {conversions}.",
        "fa": "زاویه‌ها را از درجه به رادیان می‌بریم: π رادیان برابر ۱۸۰ درجه است، پس {conversions}.",
    },
    "trig_exact_values": {
        "en": "Replace each trigonometric ratio with its known exact value: {values}.",
        "fa": "به‌جای هر نسبت مثلثاتی، مقدار دقیق و معروفش را می‌گذاریم: {values}.",
    },
    "trig_evaluate": {
        "en": "Do the rest of the arithmetic with these values.",
        "fa": "با این مقدارها بقیه‌ی محاسبه را انجام می‌دهیم.",
    },
    # derivative.py
    "derivative_sum_rule": {
        "en": "The expression is several terms joined by + and −. The derivative of a sum is the sum of the derivatives, so differentiate each term on its own.",
        "fa": "عبارت از چند جمله تشکیل شده که با + و − به هم وصل‌اند. مشتق مجموع برابر مجموع مشتق‌هاست (قاعده‌ی جمع)، پس از هر جمله جداگانه مشتق می‌گیریم.",
    },
    "derivative_combine": {
        "en": "Put the derivatives of all the terms back together with the same signs and simplify.",
        "fa": "مشتق همه‌ی جمله‌ها را با همان علامت‌ها کنار هم می‌نویسیم و ساده می‌کنیم.",
    },
    "derivative_constant_rule": {
        "en": "{term} is a constant — it doesn't change when {symbol} changes — so its derivative is 0.",
        "fa": "{term} عدد ثابت است و با تغییر {symbol} تغییر نمی‌کند، پس مشتقش صفر است.",
    },
    "derivative_power_rule": {
        "en": "Power rule: bring the exponent down in front and lower it by one. Here: {calc}.",
        "fa": "قاعده‌ی توان: توان را پشت عبارت (در ضریب) ضرب می‌کنیم و یکی از توان کم می‌کنیم. این‌جا: {calc}.",
    },
    "derivative_trig_rule": {
        "en": "From the table of trig derivatives: {rule}. A number in front stays as it is.",
        "fa": "از جدول مشتق‌های مثلثاتی: {rule}. عددی که پشت آن ضرب شده، بدون تغییر می‌ماند.",
    },
    "derivative_exp_rule": {
        "en": "e^{symbol} is its own derivative: {rule}. A number in front stays as it is.",
        "fa": "مشتق تابع نمایی e به توان {symbol} خودش است: {rule}. عددی که پشت آن ضرب شده، بدون تغییر می‌ماند.",
    },
    "derivative_ln_rule": {
        "en": "From the derivative table: {rule}. A number in front stays as it is.",
        "fa": "از جدول مشتق‌ها: {rule}. عددی که پشت آن ضرب شده، بدون تغییر می‌ماند.",
    },
    "derivative_chain_rule": {
        "en": "Chain rule: there is a function inside another function. Differentiate the outer function (leave the inside unchanged), then multiply by the derivative of the inside: {inner}.",
        "fa": "قاعده‌ی زنجیره‌ای: این‌جا یک تابع داخل تابع دیگر است. از تابع بیرونی مشتق می‌گیریم (داخل را دست نمی‌زنیم) و حاصل را در مشتقِ داخل ضرب می‌کنیم: {inner}.",
    },
    "derivative_product_rule": {
        "en": "Product rule for u = {u} and v = {v}: (uv)' = u'v + uv'.",
        "fa": "قاعده‌ی ضرب، با {u_eq} و {v_eq}: {rule}؛ یعنی مشتق اولی ضرب در دومی، به‌علاوه‌ی اولی ضرب در مشتق دومی.",
    },
    "derivative_apply_rules": {
        "en": "This term isn't a single basic function, so combine the product, quotient and chain rules.",
        "fa": "این جمله یک تابع ساده نیست، پس قاعده‌های ضرب، تقسیم و زنجیره‌ای را با هم به کار می‌بریم.",
    },
    # integral.py
    "derivative_second": {
        "en": "The second derivative is the derivative of the derivative: differentiate y' once more.",
        "fa": "مشتق دوم یعنی مشتقِ مشتق: از مشتق اول یک بار دیگر با همان قاعده‌ها مشتق می‌گیریم.",
    },
    "derivative_at_point": {
        "en": "Substitute {symbol} = {point} into the derivative and compute. This number is the slope of the tangent line at that point.",
        "fa": "{assign} را در مشتق جای‌گذاری می‌کنیم و حساب می‌کنیم. این عدد شیب خط مماس بر نمودار در همین نقطه است.",
    },
    "integral_sum_rule": {
        "en": "The integral of a sum is the sum of the integrals, so integrate each term on its own.",
        "fa": "انتگرال مجموع برابر مجموع انتگرال‌هاست (قاعده‌ی جمع)، پس از هر جمله جداگانه انتگرال می‌گیریم.",
    },
    "integral_combine": {
        "en": "Put the integrals of all the terms back together with the same signs.",
        "fa": "انتگرال همه‌ی جمله‌ها را با همان علامت‌ها کنار هم می‌نویسیم.",
    },
    "integral_add_constant": {
        "en": "Add the constant of integration C: the derivative of any constant is 0, so every function + C has the same derivative.",
        "fa": "ثابت انتگرال‌گیری C را اضافه می‌کنیم، چون مشتق هر عدد ثابتی صفر است؛ پس هر تابعی به‌علاوه‌ی یک عدد ثابت، همین مشتق را دارد.",
    },
    "integral_constant_rule": {
        "en": "The integral of a constant c is c·{symbol}.",
        "fa": "انتگرال عدد ثابت c برابر {form} است.",
    },
    "integral_log_rule": {
        "en": "Integral of 1/x is ln|x|, because the derivative of ln|x| is 1/x (the absolute value lets x be negative too).",
        "fa": "انتگرال {form} برابر {result} است، چون مشتق {result} برابر {form} است (قدرمطلق برای این است که {symbol} منفی هم مجاز باشد).",
    },
    "integral_power_rule": {
        "en": "Reverse power rule: add one to the exponent and divide by the new exponent. Here: {calc}.",
        "fa": "عکس قاعده‌ی توان: یکی به توان اضافه می‌کنیم و بر توان جدید تقسیم می‌کنیم. این‌جا: {calc}.",
    },
    "integral_trig_rule": {
        "en": "From the table of trig integrals: {rule}. (Check: differentiating the answer gives back the function.)",
        "fa": "از جدول انتگرال‌های مثلثاتی: {rule}. (بررسی: اگر از جواب مشتق بگیریم، به خود تابع می‌رسیم.)",
    },
    "integral_exp_rule": {
        "en": "e^{symbol} is its own antiderivative: {rule}.",
        "fa": "پادمشتق تابع نمایی e به توان {symbol} خودش است: {rule}.",
    },
    "integral_apply_rules": {
        "en": "This term isn't a single basic function, so use the integration rules (substitution or by parts) to find an antiderivative.",
        "fa": "این جمله یک تابع ساده نیست، پس با قاعده‌های انتگرال‌گیری (تغییر متغیر یا جزءبه‌جزء) پادمشتق را پیدا می‌کنیم.",
    },
    # limit.py
    "definite_evaluate_bounds": {
        "en": "Fundamental theorem: evaluate the antiderivative F at the upper bound {upper} and the lower bound {lower}, then subtract. C cancels in the subtraction, so we leave it out.",
        "fa": "طبق قضیه‌ی اساسی حسابان، پادمشتق F را در کران بالا ({upper}) و کران پایین ({lower}) حساب می‌کنیم و کم می‌کنیم: {formula}. ثابت C در این تفریق حذف می‌شود، برای همین آن را نمی‌نویسیم.",
    },
    "definite_result": {
        "en": "Simplify: this number is the value of the definite integral.",
        "fa": "حاصل را ساده می‌کنیم؛ این عدد مقدار انتگرال معین است.",
    },
    # plot.py
    "plot_y_intercept": {
        "en": "Where the curve meets the y-axis: substitute {symbol} = 0.",
        "fa": "محل برخورد نمودار با محور yها: {assign} را جای‌گذاری می‌کنیم.",
    },
    "plot_no_y_intercept": {
        "en": "The function isn't defined at {symbol} = 0, so the curve doesn't meet the y-axis.",
        "fa": "تابع در {assign} تعریف نشده است، پس نمودار محور yها را قطع نمی‌کند.",
    },
    "plot_roots": {
        "en": "Where the curve meets the x-axis: solve y = 0.",
        "fa": "محل برخورد نمودار با محور xها: معادله‌ی {eq} را حل می‌کنیم.",
    },
    "plot_no_roots": {
        "en": "y = 0 has no solution here, so the curve doesn't meet the x-axis.",
        "fa": "معادله‌ی {eq} این‌جا جوابی ندارد، پس نمودار محور xها را قطع نمی‌کند.",
    },
    "plot_critical": {
        "en": "Find where the slope is zero: set the derivative y' equal to 0.",
        "fa": "نقطه‌هایی که شیب نمودار صفر است: مشتق را برابر صفر قرار می‌دهیم ({eq}).",
    },
    "plot_no_critical": {
        "en": "The derivative is never 0, so the function has no maximum or minimum.",
        "fa": "مشتق هیچ‌جا صفر نمی‌شود، پس تابع ماکزیمم یا مینیمم ندارد.",
    },
    "plot_max": {
        "en": "The slope changes from positive to negative here, so this point is a (local) maximum.",
        "fa": "این‌جا شیب از مثبت به منفی تغییر می‌کند، پس این نقطه ماکزیمم (نسبی) است.",
    },
    "plot_min": {
        "en": "The slope changes from negative to positive here, so this point is a (local) minimum.",
        "fa": "این‌جا شیب از منفی به مثبت تغییر می‌کند، پس این نقطه مینیمم (نسبی) است.",
    },
    "plot_vertical_asymptote": {
        "en": "Near {symbol} = {value} the function goes to infinity: a vertical asymptote.",
        "fa": "نزدیک {assign} تابع به بی‌نهایت می‌رود؛ این خط مجانب قائم است.",
    },
    "plot_horizontal_asymptote": {
        "en": "As {symbol} goes to ±∞ the function approaches {value}: the horizontal asymptote y = {value}.",
        "fa": "وقتی {arrow}، تابع به {value} نزدیک می‌شود؛ خط {line} مجانب افقی است.",
    },
    "plot_draw": {
        "en": "Mark these points on the coordinate plane and join them with a smooth curve.",
        "fa": "این نقطه‌ها را روی دستگاه مختصات مشخص می‌کنیم و با یک منحنی هموار به هم وصل می‌کنیم.",
    },
    "limit_substitute": {
        "en": "Substitute {symbol} = {point}: the function is defined there, so the limit is its value.",
        "fa": "{assign} را جای‌گذاری می‌کنیم؛ تابع در این نقطه تعریف شده است، پس حد برابر همین مقدار است.",
    },
    "limit_zero_over_zero": {
        "en": "Substituting {symbol} = {point} gives 0/0, an indeterminate form — simplify first.",
        "fa": "با جای‌گذاری {assign} به حالت مبهم {form} می‌رسیم؛ پس اول عبارت را ساده می‌کنیم.",
    },
    "limit_factor": {
        "en": "Factor the numerator and the denominator to find the factor that becomes 0 at {symbol} = {point}: {factor}.",
        "fa": "صورت و مخرج را تجزیه می‌کنیم تا عاملی که در {assign} صفر می‌شود پیدا شود؛ یعنی {factor}.",
    },
    "limit_conjugate": {
        "en": "Multiply the numerator and the denominator by the conjugate {conj}. By (a − b)(a + b) = a² − b² the square root disappears.",
        "fa": "صورت و مخرج را در مزدوج {conj} ضرب می‌کنیم. طبق اتحاد مزدوج {identity}، رادیکال از بین می‌رود.",
    },
    "limit_cancel": {
        "en": "Cancel the common factor — allowed because {symbol} ≠ {point} while {symbol} approaches {point}.",
        "fa": "عامل مشترک را ساده می‌کنیم؛ این کار مجاز است چون وقتی {symbol} به {point} نزدیک می‌شود، {neq} است.",
    },
    "limit_nonzero_over_zero": {
        "en": "The numerator approaches a nonzero number and the denominator approaches 0, so the function grows without bound — check each side.",
        "fa": "صورت به عددی غیرصفر و مخرج به صفر نزدیک می‌شود، پس تابع بی‌کران می‌شود؛ هر طرف را جداگانه بررسی می‌کنیم.",
    },
    "limit_one_sided_right": {
        "en": "Limit from the right ({symbol} slightly greater than {point}).",
        "fa": "حد راست ({symbol} کمی بزرگ‌تر از {point}).",
    },
    "limit_one_sided_left": {
        "en": "Limit from the left ({symbol} slightly less than {point}).",
        "fa": "حد چپ ({symbol} کمی کوچک‌تر از {point}).",
    },
    "limit_does_not_exist": {
        "en": "The left and right limits are different, so the limit does not exist.",
        "fa": "حد چپ و حد راست برابر نیستند، پس تابع در این نقطه حد ندارد.",
    },
    "limit_leading_terms": {
        "en": "At infinity only the highest-power terms matter — when {symbol} is huge the lower powers are tiny next to them — so keep only the leading term of the numerator and of the denominator.",
        "fa": "در بی‌نهایت فقط جمله‌هایی با بزرگ‌ترین توان مهم‌اند، چون وقتی {symbol} خیلی بزرگ می‌شود، جمله‌های با توان کمتر در برابر آن‌ها ناچیزند. پس از صورت و مخرج فقط جمله‌ی با بزرگ‌ترین توان را نگه می‌داریم.",
    },
    "limit_evaluate": {
        "en": "Simplify and let {symbol} approach {point}.",
        "fa": "ساده می‌کنیم و {symbol} را به {point} میل می‌دهیم.",
    },
    "limit_apply_rules": {
        "en": "Apply the limit laws: the limit of a sum, product or quotient is the sum, product or quotient of the limits.",
        "fa": "قضیه‌های حد را به کار می‌بریم: حد مجموع، ضرب و تقسیم برابر مجموع، ضرب و تقسیم حدهاست.",
    },
    # logarithm.py
    "log_domain": {
        "en": "Domain: the argument of every logarithm must be positive.",
        "fa": "دامنه: عبارت داخل هر لگاریتم باید مثبت باشد.",
    },
    "log_combine": {
        "en": "Combine into one logarithm: log(a) + log(b) = log(ab), log(a) − log(b) = log(a/b), k·log(a) = log(a^k).",
        "fa": "با قوانین لگاریتم همه را یک لگاریتم می‌کنیم: {rule_sum}، {rule_diff} و {rule_power}.",
    },
    "log_equal_args": {
        "en": "Both sides are logarithms with the same base, so their arguments are equal.",
        "fa": "دو طرف لگاریتم با پایه‌ی یکسان‌اند، پس عبارت‌های داخل آن‌ها با هم برابرند.",
    },
    "log_to_exponential": {
        "en": "By definition, log_{base}(A) = c means A = {base}^c.",
        "fa": "طبق تعریف لگاریتم، {definition} یعنی {power}.",
    },
    "log_reject_root": {
        "en": "{root} is rejected: it makes the argument of a logarithm zero or negative.",
        "fa": "{root} قابل قبول نیست، چون عبارت داخل لگاریتم را صفر یا منفی می‌کند.",
    },
    "log_check_domain": {
        "en": "Check the domain: this answer keeps every logarithm's argument positive.",
        "fa": "دامنه را بررسی می‌کنیم: این جواب عبارت داخل همه‌ی لگاریتم‌ها را مثبت نگه می‌دارد.",
    },
    "exp_same_base": {
        "en": "Write both sides as powers of the same base, {base}.",
        "fa": "دو طرف را به صورت توانی از پایه‌ی یکسان {base} می‌نویسیم.",
    },
    "exp_equate_exponents": {
        "en": "The bases are equal, so the exponents are equal.",
        "fa": "پایه‌ها برابرند، پس توان‌ها هم برابرند.",
    },
    # sets.py
    "set_union": {
        "en": "{left} ∪ {right}: every element that is in {left} or in {right}, each written once.",
        "fa": "{op}: همه‌ی عضوهایی که در {left} یا در {right} هستند، هر کدام فقط یک بار.",
    },
    "set_intersection": {
        "en": "{left} ∩ {right}: the elements that are in both {left} and {right}.",
        "fa": "{op}: عضوهایی که هم در {left} و هم در {right} هستند.",
    },
    "set_difference": {
        "en": "{left} - {right}: the elements of {left} that are not in {right}.",
        "fa": "{op}: عضوهایی از {left} که در {right} نیستند.",
    },
    "set_complement": {
        "en": "Complement {set}': the elements of U that are not in {set}.",
        "fa": "متمم {comp}: عضوهایی از U که در {set} نیستند.",
    },
    "set_power_set": {
        "en": "All subsets, from ∅ to the whole set: a set with {n} elements has 2^{n} = {count} subsets.",
        "fa": "همه‌ی زیرمجموعه‌ها از ∅ تا خود مجموعه؛ مجموعه‌ی {n} عضوی {formula} زیرمجموعه دارد.",
    },
    "set_count": {
        "en": "Count the elements of {set}.",
        "fa": "تعداد عضوهای {set} را می‌شماریم.",
    },
    "set_subsets_count": {
        "en": "A set with n elements has 2^n subsets.",
        "fa": "مجموعه‌ی n عضوی {formula} زیرمجموعه دارد.",
    },
    "set_formula": {
        "en": "Use the counting formula and call the unknown {quantity} x.",
        "fa": "از فرمول تعداد عضوها استفاده می‌کنیم و مقدار نامعلوم {quantity} را x می‌نامیم.",
    },
    "set_conclude": {
        "en": "So {quantity} is x.",
        "fa": "پس {quantity} همان x است.",
    },
    # geometry.py
    "geo_formula": {
        "en": "Write the formula for the {quantity} of the {shape} and substitute the given measurements.",
        "fa": "فرمول {what} را می‌نویسیم و اندازه‌های داده‌شده را جای‌گذاری می‌کنیم.",
    },
    "geo_compute": {
        "en": "Do the arithmetic in the formula to get the answer.",
        "fa": "عددها را در فرمول حساب می‌کنیم تا جواب به دست بیاید.",
    },
    "geo_approximate": {
        "en": "Approximate value.",
        "fa": "مقدار تقریبی را حساب می‌کنیم.",
    },
    "geo_approximate_pi": {
        "en": "Approximate value (π ≈ 3.14).",
        "fa": "مقدار تقریبی را حساب می‌کنیم ({pi}).",
    },
    "pyth_formula": {
        "en": "Pythagoras: in a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides.",
        "fa": "رابطه‌ی فیثاغورس: در مثلث قائم‌الزاویه، مربع وتر برابر مجموع مربع‌های دو ضلع دیگر است.",
    },
    "pyth_leg": {
        "en": "Pythagoras for a missing side: the hypotenuse squared minus the known side squared.",
        "fa": "رابطه‌ی فیثاغورس برای ضلع مجهول: مربع وتر منهای مربع ضلع معلوم.",
    },
    "pyth_root": {
        "en": "Take the square root (a length is positive).",
        "fa": "جذر می‌گیریم (طول همیشه مثبت است).",
    },
    # graphs.py
    "graph_complete": {
        "en": "In a complete graph every pair of vertices is joined, so q = p(p - 1)/2.",
        "fa": "در گراف کامل هر دو رأس به هم وصل‌اند، پس {formula}.",
    },
    "graph_degree_bound": {
        "en": "In a simple graph with {p} vertices a degree is at most {p} - 1, so no such graph exists.",
        "fa": "در گراف ساده‌ی {p} رأسی درجه‌ی هر رأس حداکثر {bound} است، پس چنین گرافی وجود ندارد.",
    },
    "graph_handshake": {
        "en": "The sum of the degrees is twice the number of edges (each edge has two ends).",
        "fa": "مجموع درجه‌های رأس‌ها دو برابر تعداد یال‌هاست (هر یال دو سر دارد).",
    },
    "graph_odd_sum": {
        "en": "The sum of the degrees is odd, but it must be even (2q), so no such graph exists.",
        "fa": "مجموع درجه‌ها فرد شد، ولی باید زوج ({even}) باشد؛ پس چنین گرافی وجود ندارد.",
    },
    "graph_complement": {
        "en": "A graph and its complement together have every possible edge: q + q' = p(p - 1)/2.",
        "fa": "یال‌های گراف و مکملش روی هم همه‌ی یال‌های ممکن‌اند: {formula}.",
    },
    "graph_havel_hakimi": {
        "en": "Havel–Hakimi: join the vertex of largest degree ({d}) to the next {d} vertices — remove it and subtract 1 from the next {d} degrees.",
        "fa": "روش هاول–حکیمی: رأسِ با بیشترین درجه ({d}) را به {d} رأس بعدی وصل می‌کنیم؛ آن را حذف و از {d} درجه‌ی بعدی یکی کم می‌کنیم.",
    },
    "graph_havel_hakimi_fail": {
        "en": "A degree would become negative (or there aren't enough vertices), so no simple graph has these degrees.",
        "fa": "درجه‌ای منفی می‌شود (یا رأس کافی نیست)، پس هیچ گراف ساده‌ای این درجه‌ها را ندارد.",
    },
    "graph_exists": {
        "en": "Every degree reached 0, so such a graph exists; its number of edges is half the degree sum.",
        "fa": "همه‌ی درجه‌ها صفر شدند، پس چنین گرافی وجود دارد؛ تعداد یال‌ها نصف مجموع درجه‌هاست.",
    },
    "graph_count": {
        "en": "p is the number of vertices and q the number of edges.",
        "fa": "p تعداد رأس‌ها (مرتبه) و q تعداد یال‌ها (اندازه) است.",
    },
    "graph_degrees": {
        "en": "The degree of a vertex is the number of edges at it.",
        "fa": "درجه‌ی هر رأس تعداد یال‌هایی است که به آن وصل‌اند.",
    },
    "graph_handshake_check": {
        "en": "Check: the degrees add up to twice the number of edges.",
        "fa": "بررسی: مجموع درجه‌ها دو برابر تعداد یال‌هاست.",
    },
    "graph_min_max": {
        "en": "δ is the smallest degree and Δ the largest.",
        "fa": "δ کوچک‌ترین درجه و Δ بزرگ‌ترین درجه است.",
    },
    # vectors.py
    "vec_from_points": {
        "en": "Vector {start}{end} = coordinates of {end} minus coordinates of {start}.",
        "fa": "مختصات بردار {vec} برابر است با مختصات {end} منهای مختصات {start}.",
    },
    "vec_scale": {
        "en": "Multiply each component by {k}.",
        "fa": "هر مؤلفه را در {k} ضرب می‌کنیم.",
    },
    "vec_add": {
        "en": "Add component by component: first with first, second with second.",
        "fa": "مؤلفه‌ها را نظیربه‌نظیر جمع می‌کنیم: اولی با اولی، دومی با دومی.",
    },
    "vec_subtract": {
        "en": "Subtract component by component: first from first, second from second.",
        "fa": "مؤلفه‌ها را نظیربه‌نظیر از هم کم می‌کنیم: اولی از اولی، دومی از دومی.",
    },
    "vec_length": {
        "en": "Length of a vector: the square root of the sum of the squares of its components (Pythagoras).",
        "fa": "طول بردار: جذر مجموع مربع مؤلفه‌ها (رابطه‌ی فیثاغورس).",
    },
    "exp_take_log": {
        "en": "Take log base {base} of both sides.",
        "fa": "از دو طرف لگاریتم در پایه‌ی {base} می‌گیریم.",
    },
}

# Persian names for geometry.py's quantities and shapes.
_GEO_FA = {
    "area": "مساحت", "perimeter": "محیط", "volume": "حجم", "surface": "مساحت کل",
    "angle_sum": "مجموع زاویه‌های داخلی", "interior_angle": "هر زاویه‌ی داخلی",
    "exterior_angle": "هر زاویه‌ی خارجی",
    "square": "مربع", "rectangle": "مستطیل", "triangle": "مثلث",
    "parallelogram": "متوازی‌الاضلاع", "trapezoid": "ذوزنقه", "rhombus": "لوزی",
    "circle": "دایره", "cube": "مکعب", "cuboid": "مکعب مستطیل", "cylinder": "استوانه",
    "cone": "مخروط", "sphere": "کره", "pyramid": "هرم", "polygon": "چندضلعی منتظم",
}

# Math fragments some Persian templates show on their own (the English
# sentence spells them inline instead), derived from the same params so
# both languages always describe the same step.
_DERIVED_FA_PARAMS = {
    "standard_form": lambda p: {"form": "ax^2 + bx + c = 0"},
    "biquadratic_back": lambda p: {"assign": f"{p['symbol']}^2 = {p['value']}"},
    "biquadratic_back_zero": lambda p: {"assign": f"{p['symbol']}^2 = 0", "zero": f"{p['symbol']} = 0"},
    "biquadratic_negative_square": lambda p: {"assign": f"{p['symbol']}^2 = {p['value']}"},
    "cubic_common_factor": lambda p: {"assign0": f"{p['symbol']} = 0"},
    "cubic_divide": lambda p: {"assign": f"{p['symbol']} = {p['root']}"},
    "derivative_product_rule": lambda p: {"u_eq": f"u = {p['u']}", "v_eq": f"v = {p['v']}",
                                          "rule": "(uv)' = u'v + uv'"},
    "limit_factor": lambda p: {"assign": f"{p['symbol']} = {p['point']}"},
    "limit_conjugate": lambda p: {"identity": "(a - b)(a + b) = a² - b²"},
    "cubic_rational_root": lambda p: {"assign": f"{p['symbol']} = {p['root']}"},
    "biquadratic_substitute": lambda p: {"assign": f"t = {p['symbol']}^2",
                                         "pow4": f"{p['symbol']}^4 = ({p['symbol']}^2)^2"},
    "system_standard_form": lambda p: {"form": "ax + by = c"},
    "back_substitute_value": lambda p: {"assign": f"{p['known']} = {p['value']}"},
    "integral_constant_rule": lambda p: {"form": f"c·{p['symbol']}"},
    "integral_log_rule": lambda p: {"form": f"1/{p['symbol']}", "result": f"ln|{p['symbol']}|"},
    "derivative_at_point": lambda p: {"assign": f"{p['symbol']} = {p['point']}"},
    "plot_y_intercept": lambda p: {"assign": f"{p['symbol']} = 0"},
    "plot_no_y_intercept": lambda p: {"assign": f"{p['symbol']} = 0"},
    "plot_roots": lambda p: {"eq": "y = 0"},
    "plot_no_roots": lambda p: {"eq": "y = 0"},
    "plot_critical": lambda p: {"eq": "y' = 0"},
    "plot_vertical_asymptote": lambda p: {"assign": f"{p['symbol']} = {p['value']}"},
    "plot_horizontal_asymptote": lambda p: {"arrow": f"{p['symbol']} → ±∞",
                                            "line": f"y = {p['value']}"},
    "definite_evaluate_bounds": lambda p: {"formula": f"F({p['upper']}) - F({p['lower']})"},
    "limit_substitute": lambda p: {"assign": f"{p['symbol']} = {p['point']}"},
    "limit_zero_over_zero": lambda p: {"assign": f"{p['symbol']} = {p['point']}", "form": "0/0"},
    "limit_cancel": lambda p: {"neq": f"{p['symbol']} ≠ {p['point']}"},
    "log_combine": lambda p: {
        "rule_sum": "log(a) + log(b) = log(ab)",
        "rule_diff": "log(a) - log(b) = log(a/b)",
        "rule_power": "k·log(a) = log(a^k)",
    },
    "geo_formula": lambda p: {"what": _GEO_FA.get(p["quantity"], p["quantity"]) + " "
                                      + _GEO_FA.get(p["shape"], p["shape"])},
    "geo_approximate_pi": lambda p: {"pi": "π ≈ 3.14"},
    "graph_complete": lambda p: {"formula": "q = p(p - 1)/2"},
    "graph_degree_bound": lambda p: {"bound": f"{p['p']} - 1"},
    "graph_odd_sum": lambda p: {"even": "2q"},
    "graph_complement": lambda p: {"formula": "q + q' = p(p - 1)/2"},
    "vec_from_points": lambda p: {"vec": f"{p['start']}{p['end']}"},
    "set_union": lambda p: {"op": f"{p['left']} ∪ {p['right']}"},
    "set_intersection": lambda p: {"op": f"{p['left']} ∩ {p['right']}"},
    "set_difference": lambda p: {"op": f"{p['left']} - {p['right']}"},
    "set_complement": lambda p: {"comp": f"{p['set']}'"},
    "set_power_set": lambda p: {"formula": f"2^{p['n']} = {p['count']}"},
    "set_subsets_count": lambda p: {"formula": "2^n"},
    "log_to_exponential": lambda p: {
        "definition": f"log_{p['base']}(A) = c",
        "power": f"A = {p['base']}^c",
    },
}


def normalize_lang(lang: str | None) -> str:
    lang = (lang or "").strip().lower()[:2]
    return lang if lang in SUPPORTED_LANGS else DEFAULT_LANG


def render(key: str, lang: str, **params: Any) -> str:
    lang = normalize_lang(lang)
    template = MESSAGES[key][lang]
    if lang == "fa":
        extra = _DERIVED_FA_PARAMS.get(key, lambda p: {})(params)
        params = {k: f"{_LRI}{v}{_PDI}" for k, v in {**params, **extra}.items()}
    return template.format(**params)


def explained(key: str, **params: Any) -> dict[str, Any]:
    """StepData kwargs for a step explained by MESSAGES[key]."""
    params = {k: str(v) for k, v in params.items()}
    return {
        "explanation": render(key, DEFAULT_LANG, **params),
        "message_key": key,
        "message_params": params,
    }
