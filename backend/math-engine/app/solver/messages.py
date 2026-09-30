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
        "en": "Expand the parentheses.",
        "fa": "پرانتزها را باز می‌کنیم.",
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
    # quadratic.py
    "standard_form": {
        "en": "Rewrite the equation in standard form (ax^2 + bx + c = 0).",
        "fa": "معادله را به شکل استاندارد {form} می‌نویسیم.",
    },
    "factor": {
        "en": "Factor the left-hand side.",
        "fa": "سمت چپ معادله را تجزیه می‌کنیم.",
    },
    "zero_product": {
        "en": "If a product is zero, at least one factor must be zero.",
        "fa": "اگر حاصل‌ضرب صفر باشد، دست‌کم یکی از عامل‌ها صفر است.",
    },
    "apply_quadratic_formula": {
        "en": "Identify a, b, c and apply the quadratic formula.",
        "fa": "مقدار a، b و c را مشخص می‌کنیم و فرمول معادله‌ی درجه‌دو را به کار می‌بریم.",
    },
    "compute_discriminant": {
        "en": "Compute the discriminant.",
        "fa": "دلتا (مبیّن) را حساب می‌کنیم.",
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
        "en": "Solve the one-unknown equation.",
        "fa": "معادله‌ی یک‌مجهولی را حل می‌کنیم.",
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
        "en": "Move every term to one side (ax^4 + bx^2 + c = 0).",
        "fa": "همه‌ی جمله‌ها را به یک طرف می‌بریم تا طرف دیگر صفر شود.",
    },
    "biquadratic_substitute": {
        "en": "Only even powers appear, so substitute t = {symbol}^2: the equation becomes quadratic in t.",
        "fa": "فقط توان‌های زوج داریم؛ با تغییر متغیر {assign} معادله نسبت به t درجه‌دو می‌شود.",
    },
    "biquadratic_back": {
        "en": "Go back to {symbol}: {symbol}^2 = t, so take the square root (±).",
        "fa": "به متغیر اصلی برمی‌گردیم و از دو طرف جذر می‌گیریم (مثبت و منفی).",
    },
    "biquadratic_negative_square": {
        "en": "A square can't be negative, so this t gives no real roots.",
        "fa": "مربع هیچ عددی منفی نمی‌شود، پس این مقدار t جوابی نمی‌دهد.",
    },
    "cubic_standard_form": {
        "en": "Move every term to one side (ax^3 + bx^2 + cx + d = 0).",
        "fa": "همه‌ی جمله‌ها را به یک طرف می‌بریم تا طرف دیگر صفر شود.",
    },
    "cubic_isolate_cube": {
        "en": "Only the cube term has the unknown, so isolate it.",
        "fa": "مجهول فقط در جمله‌ی مکعب هست، پس آن را تنها می‌کنیم.",
    },
    "cubic_cube_root": {
        "en": "Take the cube root of both sides (a cube root of a negative number is allowed).",
        "fa": "از دو طرف ریشه‌ی سوم می‌گیریم (ریشه‌ی سوم عدد منفی هم تعریف شده است).",
    },
    "cubic_common_factor": {
        "en": "There's no constant term, so factor out {factor}.",
        "fa": "معادله جمله‌ی ثابت ندارد، پس {factor} را فاکتور می‌گیریم.",
    },
    "cubic_rational_root": {
        "en": "Try the divisors of the constant term: {symbol} = {root} makes the left side zero, so it's a root.",
        "fa": "مقسوم‌علیه‌های جمله‌ی ثابت را امتحان می‌کنیم: به ازای {assign} عبارت صفر می‌شود، پس یکی از ریشه‌هاست.",
    },
    "cubic_divide": {
        "en": "Divide by {factor} to split the cubic into a linear and a quadratic factor.",
        "fa": "عبارت را بر {factor} تقسیم می‌کنیم تا به حاصل‌ضرب یک عامل درجه‌یک و یک عامل درجه‌دو برسیم.",
    },
    "cubic_linear_factor": {
        "en": "Set the remaining linear factor to zero.",
        "fa": "عامل درجه‌یک باقی‌مانده را برابر صفر قرار می‌دهیم.",
    },
    "cubic_collect_roots": {
        "en": "Collect all the roots of the equation.",
        "fa": "همه‌ی ریشه‌های معادله را کنار هم می‌نویسیم.",
    },
    "no_real_roots": {
        "en": "The discriminant is negative, so the equation has no real roots.",
        "fa": "چون دلتا منفی است، معادله ریشه‌ی حقیقی ندارد.",
    },
    "compute_roots": {
        "en": "Substitute a, b, c and the discriminant to compute the roots.",
        "fa": "a، b، c و دلتا را جای‌گذاری می‌کنیم تا ریشه‌ها به دست بیایند.",
    },
    # expression.py
    "simplify": {
        "en": "Simplify the expression.",
        "fa": "عبارت را ساده می‌کنیم.",
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
        "en": "Work out the remaining arithmetic.",
        "fa": "بقیه‌ی محاسبه را انجام می‌دهیم.",
    },
    # derivative.py
    "derivative_sum_rule": {
        "en": "Differentiate each term separately (sum rule).",
        "fa": "از هر جمله جداگانه مشتق می‌گیریم (قاعده‌ی جمع).",
    },
    "derivative_combine": {
        "en": "Combine the differentiated terms.",
        "fa": "مشتق جمله‌ها را کنار هم می‌گذاریم.",
    },
    "derivative_constant_rule": {
        "en": "The derivative of a constant is 0.",
        "fa": "مشتق عدد ثابت صفر است.",
    },
    "derivative_power_rule": {
        "en": "Power rule: bring the exponent down and reduce it by one.",
        "fa": "قاعده‌ی توان: توان را پشت عبارت می‌آوریم و یکی از آن کم می‌کنیم.",
    },
    "derivative_trig_rule": {
        "en": "Derivative of {func}.",
        "fa": "مشتق {func}.",
    },
    "derivative_apply_rules": {
        "en": "Apply differentiation rules.",
        "fa": "قواعد مشتق‌گیری را به کار می‌بریم.",
    },
    # integral.py
    "derivative_second": {
        "en": "Differentiate the first derivative once more to get the second derivative.",
        "fa": "از مشتق اول یک بار دیگر مشتق می‌گیریم تا مشتق دوم به دست آید.",
    },
    "derivative_at_point": {
        "en": "Substitute {symbol} = {point} into the derivative.",
        "fa": "{assign} را در مشتق جای‌گذاری می‌کنیم.",
    },
    "integral_sum_rule": {
        "en": "Integrate each term separately (sum rule).",
        "fa": "از هر جمله جداگانه انتگرال می‌گیریم (قاعده‌ی جمع).",
    },
    "integral_combine": {
        "en": "Combine the integrated terms.",
        "fa": "انتگرال جمله‌ها را کنار هم می‌گذاریم.",
    },
    "integral_add_constant": {
        "en": "Add the constant of integration, C, since the derivative of any constant is 0.",
        "fa": "ثابت انتگرال‌گیری C را اضافه می‌کنیم، چون مشتق هر عدد ثابتی صفر است.",
    },
    "integral_constant_rule": {
        "en": "The integral of a constant c is c·{symbol}.",
        "fa": "انتگرال عدد ثابت c برابر {form} است.",
    },
    "integral_log_rule": {
        "en": "Integral of 1/{symbol} is ln|{symbol}|.",
        "fa": "انتگرال {form} برابر {result} است.",
    },
    "integral_power_rule": {
        "en": "Reverse power rule: raise the exponent by one and divide by the new exponent.",
        "fa": "عکس قاعده‌ی توان: یکی به توان اضافه می‌کنیم و بر توان جدید تقسیم می‌کنیم.",
    },
    "integral_trig_rule": {
        "en": "Antiderivative of {func}.",
        "fa": "پادمشتق {func}.",
    },
    "integral_apply_rules": {
        "en": "Apply integration rules.",
        "fa": "قواعد انتگرال‌گیری را به کار می‌بریم.",
    },
    # limit.py
    "definite_evaluate_bounds": {
        "en": "Evaluate the antiderivative at the bounds, F({upper}) - F({lower}); the constant C cancels out.",
        "fa": "پادمشتق را در دو کران حساب می‌کنیم: {formula}؛ ثابت C از بین می‌رود.",
    },
    "definite_result": {
        "en": "Simplify: this is the value of the definite integral.",
        "fa": "ساده می‌کنیم؛ این مقدار انتگرال معین است.",
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
        "en": "Factor the numerator and the denominator.",
        "fa": "صورت و مخرج را تجزیه می‌کنیم.",
    },
    "limit_conjugate": {
        "en": "Multiply the numerator and the denominator by the conjugate of the radical expression.",
        "fa": "صورت و مخرج را در مزدوج عبارت رادیکالی ضرب می‌کنیم.",
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
        "en": "At infinity only the highest-power terms matter: keep the leading term of the numerator and of the denominator.",
        "fa": "در بی‌نهایت فقط جمله‌هایی با بزرگ‌ترین توان مهم‌اند؛ از صورت و مخرج فقط جمله‌ی با بزرگ‌ترین توان را نگه می‌داریم.",
    },
    "limit_evaluate": {
        "en": "Simplify and let {symbol} approach {point}.",
        "fa": "ساده می‌کنیم و {symbol} را به {point} میل می‌دهیم.",
    },
    "limit_apply_rules": {
        "en": "Apply the limit rules.",
        "fa": "قضیه‌های حد را به کار می‌بریم.",
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
        "en": "Compute.",
        "fa": "حساب می‌کنیم.",
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
    "cubic_rational_root": lambda p: {"assign": f"{p['symbol']} = {p['root']}"},
    "biquadratic_substitute": lambda p: {"assign": f"t = {p['symbol']}^2"},
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
