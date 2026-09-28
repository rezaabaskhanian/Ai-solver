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
    "compute_roots": {
        "en": "Substitute a, b, c and the discriminant to compute the roots.",
        "fa": "a، b، c و دلتا را جای‌گذاری می‌کنیم تا ریشه‌ها به دست بیایند.",
    },
    # expression.py
    "simplify": {
        "en": "Simplify the expression.",
        "fa": "عبارت را ساده می‌کنیم.",
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
}

# Math fragments some Persian templates show on their own (the English
# sentence spells them inline instead), derived from the same params so
# both languages always describe the same step.
_DERIVED_FA_PARAMS = {
    "standard_form": lambda p: {"form": "ax^2 + bx + c = 0"},
    "integral_constant_rule": lambda p: {"form": f"c·{p['symbol']}"},
    "integral_log_rule": lambda p: {"form": f"1/{p['symbol']}", "result": f"ln|{p['symbol']}|"},
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
