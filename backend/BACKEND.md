# Backend — پیاده‌سازی فاز ۱ (MVP)

> این سند هر چیزی که در بک‌اند ساخته شده را مستند می‌کند: چرا این‌طور، چه چیزی عمداً ساده گرفته شده،
> و چه چیزی به فازهای بعدی موکول شده. مرجع محصول: [`PRD.md`](../PRD.md).
> آخرین به‌روزرسانی: ۳۱ آگوست ۲۰۲۶ (شامل بازسازی Go API با معماری لایه‌ای)

---

## ۱. معماری پیاده‌سازی‌شده

دقیقاً طبق بخش ۲۲/۲۳/۳۸ PRD — سه سرویس مجزا با مسئولیت جدا:

```
React Native  ──HTTP/JSON──>  Go API (Echo)  ──HTTP/JSON──>  Math Engine (Python + SymPy)
                                    │
                                    ▼
                                PostgreSQL
```

**قانون معماری (بخش ۳۸ PRD) که در کد رعایت شده:**
Go API هرگز خودش محاسبه یا verify نمی‌کند — فقط orchestration، persistence و auth انجام می‌دهد.
تمام منطق ریاضی (parse → solve → verify) در Math Engine پایتون با SymPy است.

```
backend/
├── go-api/           # سرویس عمومی — Go + Echo، معماری لایه‌ای (بخش ۱.۱)
│   ├── cmd/api/main.go             نقطه‌ی ورود، DI دستی، migration
│   └── internal/
│       ├── config/                  Config
│       ├── domain/                  موجودیت‌های خالص (user, problem)
│       ├── service/                 Use Caseها + Repository interface
│       │   ├── user/                 EnsureUser
│       │   └── problem/              Parse, Solve, History + کلاینت Math Engine
│       ├── repository/
│       │   ├── postgres/             پیاده‌سازی Repository با pgx
│       │   │   └── migrations/        فایل‌های نسخه‌دار sql-migrate
│       │   └── migrator/             اجرای migration در استارتاپ
│       ├── delivery/
│       │   ├── httpserver/           Echo handlers + routes
│       │   └── middleware/           device (auth-free user) + rate-limit
│       └── pkg/                     richerror, errmesg, errorhandling
├── math-engine/       # سرویس داخلی (Python + FastAPI + SymPy) — بدون تغییر
│   └── app/
│       ├── main.py        اندپوینت‌های /parse و /solve
│       ├── schemas.py      مدل‌های pydantic درخواست/پاسخ
│       └── solver/
│           ├── normalize.py    یونیکد (², ×, ÷, −) → ASCII قابل‌parse
│           ├── parser.py       تشخیص نوع مسئله (خطی/درجه۲/عبارت)
│           ├── linear.py       تولید گام‌به‌گام معادله خطی
│           ├── quadratic.py    تولید گام‌به‌گام معادله درجه۲ (تجزیه یا فرمول)
│           ├── expression.py   ساده‌سازی عبارت بدون تساوی
│           ├── verify.py       جایگذاری جواب در معادله اصلی
│           └── formatting.py   چاپ sympy به شکل textbook (2x نه 2*x)
└── docker-compose.yml  # postgres + math-engine + go-api
```

### ۱.۱ چرا این معماری لایه‌ای — هماهنگ‌سازی با `Shadowing-backend`

Go API اولین‌بار با یک ساختار ساده‌ی تخت (`handlers/`, `db/`, `middleware/`) نوشته شد. کاربر بعداً
پرسید این معماری چقدر شبیه یک پروژه‌ی دیگه‌ش (`../Shadowing-backend`, یک اپ یادگیری زبان با Go+Echo+PostgreSQL)
هست، و بعد از مقایسه خواست **همون الگو** پیاده بشه. این بخش کل بک‌اند Go را بازسازی کرد:

| جنبه | قبل (نسخه‌ی اول) | الان (هماهنگ با Shadowing) |
|---|---|---|
| فریم‌ورک | فقط stdlib `net/http` | **Echo v4** |
| لایه‌بندی | تخت: `handlers/db/mathengine/middleware/models` | **Clean Architecture**: `domain/service/repository/delivery` |
| خطا | پیام‌های دستی در هر handler | **`richerror`** (Op+Kind+Message) + **`errorhandling`** مرکزی، عیناً از Shadowing |
| Migration | `CREATE TABLE IF NOT EXISTS` در استارتاپ | **`sql-migrate`** با فایل‌های نسخه‌دار (`001_...sql`, `002_...sql`) + `migrator.Up()` |
| UUID | تولید دستی با `crypto/rand` | **`github.com/google/uuid`** (همون کتابخانه‌ی Shadowing) |
| DI | ساخت مستقیم داخل `main.go` | همون الگو: DI دستی در `cmd/api/main.go`، بدون container |

**چیزهایی که عمداً هماهنگ نشدن** (چون از PRD خود MathMotion میان، نه یک gap در کپی‌برداری):
- **Auth**: Shadowing از JWT واقعی (access+refresh) + bcrypt استفاده می‌کند. MathMotion هنوز
  device-scoped user بدون login داره — چون بخش ۳۹ PRD صریحاً auth پیچیده را در MVP نمی‌خواهد
  (توضیح کامل در بخش ۴.۱). لایه‌بندی (`domain/user`, `service/user`, `repository/postgres/user`,
  `delivery/middleware/device.go`) دقیقاً همون شکلیه که یک JWT واقعی بعداً جایگزینش می‌شه.
- **نام‌گذاری middleware**: پوشه `internal/delivery/middleware` (نه `middlware`). خود
  `Shadowing-backend/PROJECT_OVERVIEW.md` این غلط املایی را در فهرست «باقی‌مانده برای بهبود»
  گذاشته؛ دلیلی نداشت یک باگ شناخته‌شده کپی بشه.
- **Value Objectها**: Shadowing برای `UserID`/`Phone`/`Password` تایپ‌های اعتبارسنجی‌شده‌ی جدا
  دارد (`domain/user/valueobject`). دامنه‌ی MathMotion (ID ساده + مسئله/راه‌حل) به این سطح از
  اعتبارسنجی نیاز ندارد، پس IDها رشته‌ی ساده ماندند تا پیچیدگی غیرضروری اضافه نشود.
- **آداپتور خارجی**: در ابتدا یک پوشه‌ی `internal/adapter/` جدا برای کلاینت Math Engine ساختم،
  ولی بعد از چک کردن کد واقعی Shadowing دیدم پوشه‌ی `internal/adapter` آنجا خالی/بلااستفاده است و
  کلاینت واقعی سرویس کناری (`whisper_client.go`) داخل خودِ پکیج سرویس مصرف‌کننده (`speecheval`)
  قرار دارد — پس همون الگوی واقعی را دنبال کردم: `internal/service/problem/mathengine_client.go`.

---

## ۲. چرا Go برای API عمومی و Python برای موتور ریاضی

این تصمیم توسط کاربر در PRD مشخص شده (نه انتخاب من): بخش ۲۲–۲۳ صراحتاً Go API را
مسئول auth/user/problem-management/rate-limit/logging می‌داند و بخش ۱۱ صراحتاً می‌گوید
**"Math Engine نباید LLM باشد"** و باید Python + SymPy باشد. این جداسازی یعنی موتور ریاضی
هیچ‌وقت مستقیم در معرض اینترنت نیست — فقط از طریق Go API صدا زده می‌شود.

این الگو («Go API + میکروسرویس پایتون برای یک کار تخصصی») دقیقاً همان چیزی است که
`Shadowing-backend` هم دارد (`whisper-service` برای تشخیص گفتار، به‌جای SymPy برای ریاضی) —
یک تشابه واقعی بین دو پروژه که از قبل هم از PRD خود MathMotion می‌آمد.

---

## ۳. آنچه ساخته شد (Phase 1 دقیقاً طبق بخش ۳۹ PRD)

طبق «Developer Instruction» بخش ۳۹: شروع با **Type Problem → Math Engine → Solution JSON → Static Solution UI**،
بدون دوربین/OCR (فاز ۲) و بدون auth پیچیده/subscription/social (خارج از MVP). این backend دقیقاً همان لایه است.

### Math Engine (`POST /parse`, `POST /solve`)

| قابلیت | فایل | توضیح |
|---|---|---|
| نرمال‌سازی ورودی | `solver/normalize.py` | `x²`→`x^2`، `×`→`*`، `÷`→`/`، `−`→`-`، `π`→`pi` |
| تشخیص نوع مسئله | `solver/parser.py` | ابتدا با regex نماد مشتق/انتگرال را قبل از رسیدن به پارسر sympy تشخیص می‌دهد (توضیح کامل در بخش ۳.۱)؛ در غیر این صورت با `sympy.Poly(...).degree()` روی `lhs - rhs`: `linear_equation` / `quadratic_equation` / `expression` / `arithmetic` / `arithmetic_equation` / `trig_expression`؛ بیش از یک متغیر یا درجه>۲ یا معادله‌ی غیرچندجمله‌ای (مثل `sin(x)=0.5`) → خطای پشتیبانی‌نشده |
| گام‌های معادله خطی | `solver/linear.py` | الگوریتم دستی (نه `sympy.solve` مستقیم) که مثل انسان قدم می‌زند: expand → حذف جمله متغیر از طرف مقابل → حذف عدد ثابت → تقسیم/ضرب برای تنها گذاشتن متغیر |
| گام‌های معادله درجه۲ | `solver/quadratic.py` | حالت اول: تجزیه (`factor`) اگر ریشه‌ها گویا باشند → zero-product property. حالت دوم (fallback): فرمول درجه۲ با محاسبه صریح دیسکریمینant |
| ساده‌سازی عبارت (شامل مثلثاتی) | `solver/expression.py` | برای ورودی بدون `=` (بخش ۳: حساب، کسر، توان)؛ همان مسیر برای `trig_expression` هم استفاده می‌شود چون `sympy.simplify` خودش هویت‌های مثلثاتی را می‌شناسد (`sin²+cos²=1` و مشابه) |
| گام‌های مشتق | `solver/derivative.py` | خارج از PRD (بخش ۳.۱) — تجزیه به جمله‌های جمعی (sum rule) و نام‌گذاری قانون هر جمله (constant/power/trig)؛ برای الگوهای ناشناخته (حاصل‌ضرب، ترکیب توابع) به `sympy.diff` مستقیم برمی‌گردد اما توضیح عمومی نشان می‌دهد — مقدار همیشه از `sympy.diff` می‌آید، گام‌ها فقط روایتند |
| گام‌های انتگرال | `solver/integral.py` | خارج از PRD (بخش ۳.۱) — همان الگو برای انتگرال‌گیری (reverse power rule، قانون لگاریتم برای `1/x`، پادمشتق مثلثاتی)، در پایان جمله‌ی «+ C» اضافه می‌شود. اگر sympy پادمشتق مقدماتی پیدا نکند (`IntegrationUnsupported`)، پاسخ `422 unsupported_problem_type` است، نه یک `Integral` حل‌نشده |
| Verification | `solver/verify.py` | برای معادلات: جواب در معادله **اصلی** جایگذاری و با `sympy.simplify` صفر بودن اختلاف چک می‌شود (بخش ۱۳ PRD). برای انتگرال: پادمشتق دوباره مشتق گرفته می‌شود و با عبارت اصلی مقایسه می‌شود (`verify_integral`) — همون فلسفه، پیاده‌سازی متفاوت چون انتگرال معادله نیست. برای مشتق نیازی به verify مستقل نیست چون `sympy.diff` یک تبدیل دقیق است، نه یک ریشه‌ی حدسی |
| فرمت خروجی | `solver/formatting.py` | خروجی sympy (`2*x + 5`, `x**2`, `log(x)`) به شکل textbook (`2x + 5`, `x^2`, `ln(x)`) تبدیل می‌شود؛ قانون حذف `*` بین نماد و پرانتز به‌گونه‌ای اصلاح شد که جلوی نام تابع (`sin`, `cos`, ...) را نگیرد (`x*cos(x)` نه `xcos(x)`) |

**مثال‌های تست‌شده (مطابق بخش ۳ PRD):**
`2x + 5 = 17` → subtract 5 → divide 2 → `x = 6`
`3(x + 2) = 15` → expand → subtract 6 → divide 3 → `x = 3`
`x / 3 + 4 = 9` → subtract 4 → multiply 3 → `x = 15`
`x² - 5x + 6 = 0` → move_term → factor `(x-2)(x-3)` → zero_product → `x = 2 or x = 3`

### ۳.۱ مشتق/انتگرال/مثلثات (خارج از PRD — درخواست جداگانه‌ی کاربر)

بخش ۳ PRD صریحاً Calculus را از MVP بیرون گذاشته (برای فاز ۳، بخش ۳۶)؛ این بخش با درخواست مستقیم
کاربر اضافه شد، **همچنان کاملاً با SymPy** (بدون AI/LLM) — دقیقاً طبق قانون معماری بخش ۳۸ که
Math Engine هیچ‌وقت نباید LLM باشد. یک پنل ادمین/API key برای این کار لازم نبود و ساخته نشد.

**نحوه‌ی تایپ کردن (چون کیبورد موبایل نماد ∫/d را به‌سختی می‌دهد، هر دو حالت پشتیبانی می‌شود):**
- مشتق: `d/dx(x^2 + 3x)` یا `diff(x^2, x)` یا `derivative(sin(x), x)`
- انتگرال: `∫x^2 dx` یا `integrate(x^2, x)` یا `integral(sin(x), x)`
- مثلثات: نیازی به نحو خاص نیست — هر عبارت حاوی `sin`/`cos`/`tan` که بدون `=` تایپ شود خودکار
  `trig_expression` تشخیص داده می‌شود (مثلاً `sin(x)^2 + cos(x)^2`)

**نکته‌ی فنی مهم که باعث این تشخیص با regex قبل از پارس شد:** پارسر sympy (`parse_expr`) یک
فراخوانی مثل `diff(x^2, x)` را بلافاصله در لحظه‌ی پارس **واقعاً اجرا می‌کند** و `2*x` را حاضر و
آماده برمی‌گرداند — یعنی اگر مستقیم به پارسر عمومی پاس داده می‌شد، کل روایت گام‌به‌گام از دست
می‌رفت. به همین دلیل `parser.py` این نحوها را با regex قبل از رسیدن به پارسر تشخیص می‌دهد و فقط
عبارت داخلی (بدون نام تابع بیرونی) را پارس می‌کند.

تست شد: `go test`/`pytest` (۳۱ تست جدید) + یک اجرای end-to-end واقعی از موبایل تا Postgres
(مشتق، انتگرال، و مثلثات هر سه با `history` هم چک شدند).

### Go API (لایه‌ی جدید)

| اندپوینت | لایه‌ها | مطابق PRD |
|---|---|---|
| `GET /health` | `delivery/httpserver/server.go` | liveness، بدون device middleware، بدون لمس دیتابیس |
| `POST /api/v1/problems/parse` | `delivery/httpserver/problem/parse.go` → `service/problem.Parse` | بخش ۲۴ — فقط validation، چیزی ذخیره نمی‌شود (پیش‌نمایش قبل از تأیید کاربر، بخش ۷/۸) |
| `POST /api/v1/problems/solve` | `delivery/httpserver/problem/solve.go` → `service/problem.Solve` → `repository/postgres/problem` | بخش ۲۴ — صدا به Math Engine + ذخیره problem+solution در Postgres |
| `GET /api/v1/history?limit=&offset=` | `delivery/httpserver/problem/history.go` → `service/problem.History` | بخش ۲۱ — آخرین جواب هر مسئله برای کاربر جاری، **همراه با کل آرایه‌ی steps** (نه فقط جواب نهایی) تا موبایل بتواند با تپ روی یک آیتم تاریخچه مستقیم صفحه‌ی Solution را با داده‌ی همان حلِ قبلاً verify‌شده باز کند، بدون صدای دوباره به Math Engine |
| `GET /api/v1/entitlement` | `delivery/httpserver/problem/entitlement.go` → `service/problem.Entitlement` | خارج از PRD — وضعیت Premium + سهمیه‌ی رایگان مصرف‌شده (بخش ۷ پایین‌تر: مانتیزیشن) |
| `POST /api/v1/billing/verify` | `delivery/httpserver/billing` → `service/billing.VerifyPurchase` | خارج از PRD — تأیید سرورساید خرید بازار (بخش ۷) |

**میدل‌ورها (`internal/delivery/middleware/`):**
- `device.go` — تصمیم auth برای MVP، توضیح کامل در بخش ۴.۱؛ حالا `IsPremiumFromContext` را هم کنار `UserIDFromContext` ست می‌کند
- `ratelimit.go` — rate limit per-IP با `golang.org/x/time/rate`، فقط روی گروه `/api/v1/*` (بخش ۲۳: API rate limiting)
- لاگ ساختاریافته با `echo/middleware.Logger()` (built-in Echo، نیازی به کد دستی نبود)

**پایگاه‌داده:** جدول‌های بخش ۲۵ PRD (`users`, `problems`, `solutions`) با یک ستون اضافه
(`device_id` روی `users`)، حالا از طریق **migration نسخه‌دار واقعی** (بخش ۴.۲) نه یک اسکریپت ساده.
migration 003 (خارج از PRD، بخش ۷) ستون `is_premium` را به `users` و جدول `purchases` را اضافه کرد.

---

## ۴. تصمیم‌های مهم (و چرا)

### ۴.۱ Auth: بدون login واقعی در MVP — device-scoped user

بخش ۳۹ PRD صراحتاً می‌گوید: *"در MVP از پیاده‌سازی ... authentication پیچیده ... خودداری شود"*.
اما بخش ۲۵ همچنان جدول `users` و بخش ۲۱ «History per user» می‌خواهد. راه‌حل پیاده‌شده:

- کلاینت هدر `X-Device-Id` می‌فرستد (یک UUID که در MMKV ذخیره می‌کند).
- اگر نفرستد، سرور یک UUID جدید می‌سازد (`internal/delivery/middleware/device.go`) و در هدر پاسخ
  (`X-Device-Id`) برمی‌گرداند تا کلاینت آن را ذخیره کند.
- هر درخواست به `/api/v1/*` یک ردیف `users` را upsert می‌کند (`service/user.EnsureUser` →
  `repository/postgres/user`).
- هیچ رمز عبور، JWT یا OTP‌ای در فاز ۱ نیست.

این یعنی history/بخش ۲۱ کار می‌کند بدون این‌که اپ مجبور به ثبت‌نام باشد.
**وقتی auth واقعی (شماره موبایل/OTP یا OAuth، مثل الگوی JWT خود Shadowing) اضافه شود**، فقط کافی
است `internal/delivery/middleware/device.go` با یک middleware مبتنی بر JWT جایگزین شود؛ بقیه‌ی
کد (service/repository/delivery) فقط به یک `userID` رشته‌ای وابسته است، نه به مکانیزم auth —
همین جداسازی لایه‌ای دلیل اصلی هماهنگ‌سازی معماری با Shadowing بود.

### ۴.۲ Migration واقعی با sql-migrate (دیگر shortcut نیست)

نسخه‌ی اول از `CREATE TABLE IF NOT EXISTS` استفاده می‌کرد. الان (بخش ۱.۱) از همون ابزار Shadowing
یعنی **`github.com/rubenv/sql-migrate`** استفاده می‌شود: فایل‌های نسخه‌دار در
`internal/repository/postgres/migrations/` (`001_create_users.sql`, `002_create_problems_and_solutions.sql`)
با بلاک‌های `-- +migrate Up` / `-- +migrate Down`، و `internal/repository/migrator/migrator.go`
آن‌ها را در استارتاپ اجرا می‌کند (`if os.Getenv("ENV") != "production"`, عیناً منطق Shadowing).
این یعنی از این به بعد تغییر schema (نه فقط اضافه‌کردن ستون) هم قابل ردیابی و قابل rollback است.

### ۴.۳ Rate limiting در حافظه (نه Redis)

`delivery/middleware/ratelimit.go` یک token-bucket per-IP در یک map نگه می‌دارد. برای یک instance
تنها کافی است؛ با اسکیل به چند instance باید به یک store مشترک (Redis) منتقل شود.

### ۴.۴ چرا لایه AI (بخش ۱۰ PRD) هنوز ساخته نشده

بخش ۳۹ ترتیب توسعه را صریح مشخص کرده: اول *Type Problem → Math Engine → Solution JSON → Static UI*،
بعد Animation، **بعد** Camera → OCR → Problem Parser. یعنی AI Layer (OCR/Vision، توضیح تولیدی) دقیقاً
همراه با دوربین در فاز ۲ می‌آید — برخلاف Shadowing که از قبل `internal/service/ai` با Anthropic/Gemini
SDK دارد (چون آن پروژه از این نظر بالغ‌تر است). توضیح هر گام در فاز ۱ **template-based** است
(در `linear.py`/`quadratic.py`، نه LLM) چون Math Engine اصلاً نباید LLM باشد (بخش ۱۱).

---

## ۵. اجرا (Local Dev)

### با Docker Compose (پیشنهادی)

```bash
cd backend
docker compose up --build
# go-api:      http://localhost:8080
# math-engine: http://localhost:8000
# postgres:    localhost:5432
```

### بدون Docker

```bash
# Math Engine
cd backend/math-engine
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Go API (نیاز به Postgres در دسترس - می‌توانید فقط سرویس postgres را از compose بالا بیاورید)
cd backend/go-api
export DB_HOST=localhost DB_PORT=5432 DB_USERNAME=mathmotion DB_PASSWORD=mathmotion DB_NAME=mathmotion
export MATH_ENGINE_URL="http://localhost:8000"
go run ./cmd/api   # migration در استارتاپ خودکار اجرا می‌شود (ENV != production)
```

> نکته: `migrator.go` مسیر migrations را به‌صورت رشته‌ی نسبی (`internal/repository/postgres/migrations`)
> نگه می‌دارد — دقیقاً مثل Shadowing — پس باینری باید از ریشه‌ی `go-api/` اجرا شود (`go run ./cmd/api`
> این را خودکار رعایت می‌کند؛ در Docker هم `Dockerfile` این پوشه را جدا کنار باینری کپی می‌کند).

### تست دستی

```bash
curl -s http://localhost:8000/solve -H 'Content-Type: application/json' \
  -d '{"problem": "2x + 5 = 17"}' | python3 -m json.tool

curl -s http://localhost:8080/api/v1/problems/solve -H 'Content-Type: application/json' \
  -d '{"problem": "2x + 5 = 17"}' | python3 -m json.tool

curl -s http://localhost:8080/api/v1/history -H "X-Device-Id: <همون device id از پاسخ solve>"
```

---

## ۵.۱ مانتیزیشن — سهمیه‌ی رایگان + خرید بازار (خارج از PRD)

این بخش در PRD نیست؛ درخواست جداگانه‌ی کاربر بود: **۵ حل رایگان در کل عمر یک device_id، بعدش
خرید یک‌بارمصرف «Premium»** برای حل نامحدود، با پرداخت درون‌برنامه‌ای Cafe Bazaar (نه App Store —
این اپ روی بازار توزیع می‌شود).

**چرا سهمیه سمت Go API چک می‌شود، نه موبایل:** موبایل فقط UI رو نشون می‌ده؛ اعتماد به کلاینت برای
«من پول دادم» یا «هنوز ۵ تام رو مصرف نکردم» امکان دور زدن ساده داره. `problemservice.Solve`
(`internal/service/problem/solve.go`) قبل از هر تماس با Math Engine، برای کاربر غیر Premium
`CountProblems` (شمارش ردیف‌های `problems` برای همون user_id) را با `FREE_SOLVE_LIMIT` (پیش‌فرض
۵، env) مقایسه می‌کند. رد شدن از سهمیه یعنی **نه تماس با Math Engine، نه persist** — دقیقاً همون
الگوی موجود برای `unsupported_problem_type`/`verification_failed`.

**`richerror.KindPaymentRequired`** کایند جدیدیه که `errorhandling.go` به **HTTP 402** با
`{"error":"quota_exceeded"}` نگاشت می‌کند — انتخاب عمدی به‌جای اورلود کردن دوباره‌ی `KindInvalid`
(۴۲۲)، چون مفهوماً «باید پول بدی» با «ورودی نامعتبره» فرق دارد و موبایل باید بتواند این دو را
جدا از هم مدیریت کند (یکی paywall نشون می‌ده، یکی پیام خطا).

**`internal/service/billing`** (پکیج جدید، دقیقاً هم‌شکل `problemservice`/`MathEngineClient`):
- `BazaarClient` توکن OAuth بازار را کش می‌کند (`POST .../auth/token/` با refresh_token grant)
  و خرید را با `GET .../validate/{package}/inapp/{product}/purchases/{token}/` تأیید می‌کند.
  `purchaseState == 0` یعنی خرید واقعی؛ ۱ (refunded) و ۲ (canceled) رد می‌شوند.
- `Service.VerifyPurchase` بعد از تأیید، خرید را در جدول جدید `purchases` ثبت می‌کند
  (`purchase_token UNIQUE` → idempotent، چون موبایل موقع بازیابی نصب مجدد ممکنه همون توکن رو
  دوباره بفرسته) و `users.is_premium` را true می‌کند.
- `internal/repository/postgres/billing` عمداً مستقل از `postgresproblem`/`postgresuser` است —
  حتی یک کوئری تکراری کوچک (`CountProblems`) دارد به‌جای وابسته شدن به Repository یک سرویس دیگر؛
  همون قانونی که همه‌جای این کدبیس رعایت شده (هر سرویس فقط زیرمجموعه‌ای که خودش لازم داره رو
  declare می‌کنه).

**توکن API پیشخان بازار** (`BAZAAR_API_SECRET` — روش جدید بازار، جایگزین OAuth قدیمی
`BAZAAR_CLIENT_ID`/`BAZAAR_CLIENT_SECRET`/`BAZAAR_REFRESH_TOKEN`) از پیشخان ← برنامه ← «API پیشخان
بازار» گرفته می‌شود و در تب «اشتراک‌ها»ی پنل ادمین یا `.env` ذخیره می‌شود. بدون آن سرور نرمال بالا
می‌آید (فقط یک warning لاگ می‌شود) و سهمیه‌ی رایگان کار می‌کند؛ فقط `POST /billing/verify` با یک
خطای تمیز شکست می‌خورد. پلن‌های زمان‌دار (ماهانه و ...)، کد کاربری و مدیریت اشتراک از پنل ادمین:
`mobile/MathMotion/APP.md` بخش ۶.۳.

تست end-to-end واقعی (Postgres محلی، `FREE_SOLVE_LIMIT=3`): سه حل موفق → `GET /entitlement`
`free_solves_used:3` → حل چهارم `402 {"error":"quota_exceeded"}`.

**به‌روزرسانی — سهمیه‌ی قابل‌تنظیم از پنل ادمین (`internal/service/quota`):** شمارش حالا با جدول
`usage_events` (migration 005) است، نه `CountProblems`: هر حل، **اسکن** و «بررسی حل خودم» یک ردیف
ثبت می‌کند. (قبلاً اسکن و check شمرده نمی‌شدند، پس کاربر رایگان می‌توانست بی‌نهایت اسکن کند و هر
اسکن هزینه‌ی هوش مصنوعی داشت.) migration حل‌های قبلی را هم به این جدول منتقل می‌کند.
- کاربر رایگان: هر سه نوع از یک سهمیه کم می‌کنند؛ `FREE_QUOTA_PERIOD` = `daily` (پیش‌فرض، ریست
  ساعت ۰۰:۰۰ تهران، `FREE_DAILY_LIMIT` پیش‌فرض ۳) یا `lifetime` (`FREE_LIFETIME_LIMIT`، و اگر ست
  نشده `FREE_SOLVE_LIMIT`، پیش‌فرض ۵).
- کاربر Premium: حل و check نامحدود؛ فقط اسکن سقف روزانه دارد (`PREMIUM_DAILY_SCAN_LIMIT`، پیش‌فرض
  ۳۰، ۰ = بدون سقف) → `429 {"error":"daily_limit_reached"}` (کایند جدید `KindTooManyRequests`،
  جدا از `rate_limited` ریت‌لیمیتر).
- هر چهار کلید در `app_settings` ذخیره می‌شوند و از تب «سهمیه و محدودیت‌ها»ی پنل ادمین (و
  `PUT /admin/settings`) همان لحظه عوض می‌شوند؛ مقدار env فقط fallback است.
- اسکنی که به هوش مصنوعی رسید شمرده می‌شود (حتی «چیزی پیدا نشد»)؛ خطای سرور/ارائه‌دهنده نه.
- `GET /entitlement` علاوه بر `free_solves_used/limit`: `quota_period`، `resets_at`،
  `premium_scans_used`، `premium_scan_limit`.

---

## ۶. وضعیت فعلی و ادامه‌ی کار

| مورد | وضعیت |
|---|---|
| Math Engine: parse/solve/verify برای arithmetic, linear, quadratic, expression | ساخته شد + تست دستی موفق |
| Math Engine: مشتق، انتگرال، ساده‌سازی مثلثاتی (خارج از PRD، بخش ۳.۱) | ساخته شد + تست end-to-end واقعی |
| Go API با معماری لایه‌ای (domain/service/repository/delivery) + Echo | بازسازی شد + تست دستی موفق |
| Migration واقعی (sql-migrate) | ساخته شد + تست دستی موفق (روی Postgres تازه) |
| Device-scoped user (auth-free) | ساخته شد + تست دستی موفق |
| Rate limiting (فقط روی `/api/v1/*`) | ساخته شد + تست دستی موفق |
| docker-compose + Dockerfile (کپی جدای migrations) | به‌روزرسانی شد؛ روی این ماشین Docker daemon بالا نبود، پس end-to-end با Postgres محلی (homebrew) تست شد نه با compose خودش |
| تست خودکار (unit/integration) | ساخته شد — `go test ./...` (شامل richerror/errorhandling/service/middleware/handler/billing، بدون نیاز به Postgres یا Math Engine واقعی) و `pytest` روی `math-engine` (۵۰ تست، solver + FastAPI endpoints) |
| مانتیزیشن (سهمیه‌ی رایگان + verify خرید بازار) | ساخته شد + تست end-to-end با Postgres واقعی — بخش ۵.۱ بالا |
| Vision (Claude، تشخیص چند مسئله در یک عکس) | ساخته شد — بخش ۷ پایین‌تر |
| Check my steps (`/check`) و Practice generator (`/practice`) | ساخته شد — بخش ۷ پایین‌تر |
| Animation Engine (React Native Skia/Reanimated سمت کلاینت، بخش ۱۴) | خارج از اسکوپ backend — کار موبایل |
| Auth واقعی (OTP/OAuth مثل Shadowing) | عمداً ساخته نشده، طبق بخش ۳۹ — اما لایه‌بندی برایش آماده است |

### ۶.۱ نتیجه‌ی تست واقعی بعد از بازسازی (نه فرضی)

با یک Postgres تازه (خالی، بدون هیچ schema‌ی قبلی) اجرا و تست شد:

- `go build ./cmd/api`، `go vet ./...`، `gofmt -l .` همه تمیز.
- استارتاپ: `applied 2 migrations` چاپ شد (هر دو فایل migration واقعاً روی یک دیتابیس خالی اجرا شدند، نه فقط کامپایل).
- `POST /problems/parse` → پیش‌نمایش صحیح، بدون persist.
- `POST /problems/solve` (بدون `X-Device-Id`) → سرور یک device id مینت کرد و در پاسخ برگرداند؛ معادله‌ی
  خطی (`2x+5=17`) و درجه۲ (`x²-5x+6=0`) هر دو با گام‌های درست ذخیره شدند.
- `GET /history` با همان device id → هر دو مسئله به ترتیب زمان نزولی برگشتند.
- ورودی نامفهوم → `422 {"error":"invalid_input","message":"We couldn't understand this problem..."}`
  (از `richerror` → `errorhandling` → پیام دقیق بخش ۳۰ PRD).
- Rate limit (۵ req/s, burst ۱۰) روی `/api/v1/history`: ۱۰ درخواست اول `200`، بعدش `429` — رفتار درست.
  (`/health` عمداً از rate limit و device middleware مستثنی است چون بیرون از گروه `/api/v1` تعریف شده.)

### ۶.۲ نکته‌ی امنیتی که در حین مقایسه دیدم (نه بخشی از این کار، صرفاً هشدار)

هنگام خواندن `Shadowing-backend/.env` برای فهمیدن الگوی کانفیگ، یک کلید واقعی‌به‌نظر Anthropic
(`ANTHROPIC_API_KEY`) و کلیدهای Gemini/SMS.ir را دیدم که به‌صورت plain-text کامیت شده‌اند. خودِ
`PROJECT_OVERVIEW.md` همان پروژه هم این را در فهرست «باقی‌مانده برای بهبود» گذاشته
(«کلید Anthropic لو‌رفته... هنوز Revoke نشده»). من چیزی در آن پروژه تغییر ندادم، ولی چون مستقیم
دیدمش لازم بود اینجا هم بگویم: اگر هنوز باطل نشده، در پنل Anthropic/Google/SMS.ir باطلش کن.

### ۶.۳ تست‌های خودکار (اضافه شد)

- **Go (`go test ./...`، بدون نیاز به Postgres یا Math Engine واقعی):**
  `richerror`/`errorhandling` (نگاشت Kind → status code)، `service/user` و `service/problem`
  (Repository جعلی در حافظه + `httptest.Server` به‌جای Math Engine واقعی — پوشش مسیرهای موفق،
  `parse_error`/`unsupported_problem_type`/`verification_failed`/عدم دسترسی به engine، و خطای
  repository)، `delivery/middleware` (device-id mint/reuse، رد شدن وقتی EnsureUser خطا می‌دهد،
  rate limiter با burst/reset)، و `delivery/httpserver/problem` (بدنه‌ی JSON نامعتبر، مسیر موفق،
  و نگاشت خطای engine به ۴۲۲ در سطح handler).
- **Python (`pytest` یا `python -m pytest` از داخل `backend/math-engine`؛ نیاز به
  `pip install -r requirements-dev.txt`):** ۵۰ تست روی `normalize`/`parser`/`linear`/`quadratic`/
  `expression`/`verify`/`formatting` به‌علاوه اندپوینت‌های `/health`, `/parse`, `/solve` با
  `fastapi.testclient.TestClient` (شامل مثال‌های دقیق PRD بخش ۳ و خطای ۴۲۲ برای معادله‌ی نامعتبر).

**قدم بعدی پیشنهادی:** اتصال صفحه Static Solution UI در React Native به `POST /api/v1/problems/solve`
(فاز بعدی طبق بخش ۳۹ PRD)، و در CI اجرای همین دو مجموعه تست قبل از merge.

---

## ۷. تشخیص خطا، تولید تمرین، و اسکن چندمسئله‌ای (خارج از PRD — درخواست جداگانه‌ی کاربر)

سه فیچر جدید، هرکدوم با همون الگوی لایه‌ای موجود (Math Engine → Go API → Mobile) پیاده‌سازی شد.

### ۷.۱ Check my steps — `POST /check`

ایده‌ی اصلی: `solve_linear`/`solve_quadratic` نیازی به مسئله‌ی اصلی ندارن، هر جفت `(lhs, rhs)` رو
می‌گیرن و گام درست بعدی رو تولید می‌کنن. پس چک کردن کار دانش‌آموز یعنی خط‌به‌خط جلو رفتن و در هر
خط چک کردن که آیا هنوز با آخرین حالت درستِ قبلی **معادل** هست:

- معادلات: `sympy.solveset` دو طرف باید برابر باشه (هر خطایی که solution set رو عوض کنه — علامت،
  عملیات فقط روی یک طرف، اشتباه محاسباتی — گرفته می‌شه).
- عبارت‌ها: `sympy.simplify(expr_i - expr_قبلی) == 0`.

اولین خط ناهمخوان = اشتباه. `next_step_hint` از همون حالت آخرِ درست با `solve_linear`/
`solve_quadratic` واقعی دوباره تولید می‌شه — یعنی هم «باید این کار رو می‌کردی» (بعد از اشتباه) و
هم «قدم بعدی اینه» (وقتی دانش‌آموز نصفه‌کاره متوقف شده) از یک مسیر کد میان، بدون منطق جدا.
پیاده‌سازی: `backend/math-engine/app/solver/check.py`. محدودیت مستندشده: برای معادله‌ی درجه۲،
«حل کامل» فقط وقتی تشخیص داده می‌شه که دانش‌آموز به فرم تجزیه‌شده‌ی zero-product برسه (`(x-2)(x-3)
= 0`) — چون جواب نهایی («x=2 or x=3») یک تساوی واحد نیست که مدل خط‌به‌خط ما بتونه نمایندگیش کنه؛
مسیر fallback فرمول درجه۲ (ریشه‌ی گنگ) هم همیشه `correct_so_far` می‌مونه، هیچ‌وقت `solved`.

**Go API:** `internal/service/problem/check.go` — دقیقاً با همون الگوی سهمیه‌ی
`internal/service/vision/recognize.go` (چک می‌کنه، ولی چیزی را persist نمی‌کنه؛ درون سهمیه‌ی
موجود کاربر هیچ محدودیت تازه‌ای اضافه نمی‌کنه، فقط جلوی استخراج نامحدود hint بعد از اتمام سهمیه
رو می‌گیره).

### ۷.۲ Practice generator — `POST /practice`

`backend/math-engine/app/solver/practice.py` مستقیم آبجکت‌های sympy می‌سازه (نه رشته‌ی دستی) تا
`format_eq`/`format_expr` موجود فرمت textbook رو رایگان بدن. برای `expression`، جمله‌ها عمداً
داخل یک ضرب باز‌نشده نگه داشته می‌شن (`a*(x+b) + c*x`) — چون sympy جمع‌های سطح بالا رو خودکار
ترکیب می‌کنه و اگر مستقیم جمع می‌ساختیم چیزی برای ساده‌سازی باقی نمی‌موند (همون دلیلی که
`3(x+2)=15` در `linear.py` به یک گام `expand` جدا نیاز داره). اعتبارسنجی: مسئله‌ی تولیدشده از
همون `parse_problem` واقعی رد می‌شه و `problem_type` باید با نوع درخواستی یکی باشه (به‌جای یک مسیر
اعتبارسنجی دستی جدا) — یک draw منحط (مثلاً ضریب صفر) به‌سادگی retry می‌شه.

**Go API:** `internal/service/problem/practice.go` — **بدون** gate سهمیه (مثل `/parse`، چون چیزی
حل یا فاش نمی‌کنه).

### ۷.۳ اسکن چندمسئله‌ای — `internal/service/vision`

پرامپت Claude از «یک معادله» به «هر مسئله‌ی مجزا، هرکدوم یک خط» عوض شد؛
`Client.RecognizeEquations`/`Service.RecognizeEquations` حالا `[]string` برمی‌گردونن، و پاسخ JSON
`recognized_text` → `recognized_problems: []string` تغییر کرد (breaking، ولی این endpoint هنوز
release نشده، پس مشکلی نداره). Gate سهمیه بدون تغییر موند — یک عکس یعنی یک چک سهمیه، فارغ از
اینکه چندتا مسئله توش پیدا بشه.

**نکته‌ی مهم موبایل که همراه این کار حل شد:** بخش ۸ PRD صریحاً می‌گه سیستم نباید بدون تأیید کاربر
مستقیم مسئله‌ی تشخیص‌داده‌شده رو حل کنه — ولی پیاده‌سازی قبلی (`useScanAndSolve`) دقیقاً همین کار
رو می‌کرد. همراه با اضافه‌شدن پشتیبانی چندمسئله‌ای، این gap هم بسته شد: recognize و solve حالا دو
قدم جدا هستن همه‌جا، نه فقط وقتی چند مسئله پیدا می‌شه (جزئیات کامل در `mobile/MathMotion/APP.md`).

### ۷.۴ تست

`backend/math-engine/tests/test_check.py`, `test_practice.py`, و اضافات `test_api.py` (۳۲ تست
جدید pytest، مثال‌های دقیق PRD به‌علاوه چند اشتباه دیجیتالی برای هر نوع). سمت Go:
`internal/service/problem/check_test.go`, `practice_test.go`, و به‌روزرسانی
`internal/service/vision/client_test.go`/`recognize_test.go` برای امضای `[]string` جدید — همه با
همون الگوی fake-repo + `httptest.Server` که `solve_test.go` قبلاً داشت.

**قدم بعدی:** اجرای واقعی `pytest`/`go test` (این پاس فقط نوشته شد، اجرا و تأیید نهایی با کاربره)،
و تست دستی end-to-end مطابق پلن (`/check` با یک اشتباه عمدی، `/practice` برای هر ۴ نوع،
`/recognize` روی عکسی با ۲+ مسئله).

### ۷.۵ اصلاح حدسی خطاهای OCR/تایپی — `parser.py` (بخش ۹ PRD)

تنها موردی که در FEATURES.md بخش ۱ «جزئی» مونده بود: بخش ۹ PRD صریح یک مثال می‌ده
(`2x + S = 17` باید حدس زده بشه `2x + 5 = 17`) و می‌گه «اصلاحات مهم باید confidence داشته
باشند» — قبل از این پاس فقط نویسه‌های یونیکد (`× ÷ − ²`) نرمال می‌شدن، حدس زدن حروف OCR اصلاً
پیاده نشده بود.

**طراحی:** `app/solver/parser.py` — `_parse_core()` منطق قبلی `parse_problem` رو (بدون
raw/confidence) در خودش داره تا هم برای parse مستقیم و هم برای هر candidate اصلاح‌شده دوباره
استفاده بشه. `parse_problem` اول همیشه parse مستقیم رو امتحان می‌کنه؛ **فقط وقتی این شکست
بخوره** (`ParseError`)، `_try_ocr_correction` روی توکن‌های تک‌حرفیِ ایزوله (بین دو کاراکتر
غیر-word) که عضو نگاشت `_OCR_DIGIT_CONFUSABLES` هستن (`S→5, O/o→0, I/l→1, B→8, Z→2, G→6, g→9`)
همه‌ی زیرمجموعه‌های ممکن رو می‌سازه و هرکدوم رو دوباره با `_parse_core` امتحان می‌کنه.

سه تصمیم برای جلوگیری از حدس اشتباه:
- **فقط fallback، نه preemptive:** چون تلاش اصلاح فقط بعد از شکست parse مستقیم اجرا می‌شه، یک
  معادله‌ی تک‌مجهولیِ واقعی که اتفاقاً از یکی از این حروف به‌عنوان متغیر استفاده کرده
  (مثلاً `S + 5 = 17`) هیچ‌وقت دست‌کاری نمی‌شه — چون همون بار اول با confidence عادی (`0.99`)
  parse می‌شه.
- **نگاشت محافظه‌کارانه:** حروفی که این اپ واقعاً به‌عنوان متغیر استفاده می‌کنه (`x y z t n s`)
  عمداً در نگاشت نیستن — دقیقاً همون حروفی انتخاب شدن که کتاب‌های درسی هم به‌خاطر شباهت
  بصری‌شون به رقم، به‌عنوان متغیر ازشون اجتناب می‌کنن.
- **ابهام = بدون حدس:** اگر بیش از یک ترکیبِ اصلاح متفاوت هر دو با موفقیت parse بشن (مثلاً
  `S + O = 17` که هم `5 + O = 17` و هم `S + 0 = 17` جداگانه معتبرن)، `_try_ocr_correction`
  `None` برمی‌گردونه و خطای اصلی بدون حدس نمایش داده می‌شه — این دقیقاً همون «اصلاحات مهم باید
  confidence داشته باشند»ه.

Confidence اصلاح‌شده ثابت `0.6` است (زیر آستانه‌ی `LOW_CONFIDENCE_THRESHOLD=0.9` موجود در
`mobile/.../ParsePreviewBanner.tsx`) — یعنی هیچ تغییری سمت موبایل لازم نبود؛ همون هشدار
«Please check the detected equation» (بخش ۳۰ PRD) که برای unicode confidence=0.85 از قبل کار
می‌کرد، برای این حدس هم خودکار نمایش داده می‌شه.

**تست:** ۶ تست جدید در `tests/test_parser.py` — حدس موفق تک‌حرفی و چندحرفی، عدم دست‌کاری استفاده‌ی
مشروع از حرف confusable، رد حدس مبهم، و عدم پنهان‌شدن خطاهای بی‌ربط (مثل معادله‌ی درجه‌۳) پشت این
fallback. مثل بقیه‌ی این پاس، اجرا نشده — طبق تصمیم قبلی، تست/اجرا دست خود کاربره.

## ۸. پراکسی خروجی Xray برای فراخوانی‌های AI (درخواست جداگانه‌ی کاربر)

مشکل: اگه IP سروری که `go-api` روش دیپلوی می‌شه از سمت Anthropic بلاک/محدود بشه، «Scan Problem»
(که `internal/service/vision` مستقیم Claude Vision رو صدا می‌زنه) شکست می‌خوره — بدون ربط به کد
یا API key. راه‌حل، دقیقاً هم‌الگوی پروژه‌های دیگه‌ی همین توسعه‌دهنده: یه سرور Xray اختصاصی
(VLESS+Reality، خودِ سرور رو کاربر جدا راه‌اندازی می‌کنه) + یه سایدکار محلی که ترافیک خروجی
`go-api` رو از توش رد کنه. مستندات کامل (معماری، env varها، مثال curl، عیب‌یابی) در
[`backend/docs/xray-proxy-setup.md`](docs/xray-proxy-setup.md) — این‌جا فقط خلاصه‌ی تصمیم‌های
طراحی:

- **بدون تغییر در `vision.Client`:** به‌جای عوض کردن امضای `visionservice.NewClient`، خودِ
  `cmd/api/main.go` کلاینت HTTP پراکسی‌شده رو می‌سازه (`internal/pkg/outboundhttp`) و با
  `option.WithHTTPClient` بهش پاس می‌ده — یعنی هیچ‌کدوم از تست‌های موجود `vision` (که با
  `option.WithBaseURL` یه سرور fake می‌سازن) نیازی به تغییر نداشتن.
- **مسیر مستقیم پیش‌فرضه:** `AI_OUTBOUND_PROXY` خالی یعنی dial مستقیم (`outboundhttp.New` همون
  `http.DefaultClient` رو برمی‌گردونه) — این فیچر فقط برای وقتیه که واقعاً لازم بشه، نه یه لایه‌ی
  اجباری جدید روی هر دیپلوی.
- **`POST /admin/proxy` خارج از `/api/v1`:** چون بخشی از API موبایل نیست (اپراتور صداش می‌زنه،
  نه اپ)، بیرون از گروهی که `middleware.Device`/rate limit می‌گیره ثبت شده، و به‌جاش پشت
  `middleware.Admin` (یه Bearer token ثابت از `PROXY_ADMIN_TOKEN`، fail-closed اگه ست نشده باشه)
  محافظت می‌شه.
- **تست واقعی، نه فقط parse موفق:** `proxy.Service.Connect` بعد از نوشتن کانفیگ سایدکار، یه
  `GET https://ipinfo.io/json` واقعی از پشت تونل می‌زنه — همون تستی که در عمل با `curl` دستی انجام
  می‌شد، حالا از توی endpoint. یه لینک بدشکل، خطا (`422`) برمی‌گردونه؛ یه لینک معتبر که تونلش کار
  نمی‌کنه، `200` با `{"connected": false, "error": "..."}` — چون این یه نتیجه‌ی قابل‌انتظار و
  قابل‌عیب‌یابیه، نه یه باگ سرور.
- **سایدکار از باینری رسمی release، نه یه ایمیج آماده:** `deploy/xray/Dockerfile` از
  `github.com/XTLS/Xray-core/releases/latest` دانلود می‌کنه روی یه بیس Alpine (هم‌الگوی
  `go-api/Dockerfile`) — هم کنترل provenance بیشتره، هم مطمئنیم `watch.sh` (که یه shell script
  ساده‌ست) واقعاً شل داره که روش اجرا بشه.
- **`watch.sh` با یه placeholder شروع می‌کنه:** قبل از اولین `POST /admin/proxy`، سایدکار یه
  کانفیگ direct-passthrough داره (نه crash-loop، نه یه پراکسی که چیزی رو مسدود می‌کنه) و هر تغییر
  کانفیگ رو قبل از اعمال با `xray run -test` اعتبارسنجی می‌کنه.

**نصب/تست:** `golang.org/x/net` (که به‌صورت indirect از قبل تو `go.sum` بود، فقط برای
`golang.org/x/net/proxy`) دستی به بخش direct requires بالای `go.mod` منتقل شد؛ `go mod tidy` هنوز
اجرا نشده. مثل همیشه، `go build`/`go test` این پاس اجرا نشدن — طبق تصمیم قبلی، اجرا/تست دست خود
کاربره. تست‌های جدید: `outboundhttp` (۵ تست)، `proxy` (پارس vless + build کانفیگ + سرویس، با
`httptest.Server` به‌جای شبکه‌ی واقعی)، `middleware.Admin` (۳ تست)، `proxyhandler` (مسیرهای خطا).

---

## ۹. نکات کنکوری روی سرور — `internal/service/konkur` (درخواست جداگانه‌ی کاربر)

محتوای «نکات کنکوری» (نکته‌ها + سؤال‌های تستی) که قبلاً داخل باندل اپ بود، حالا روی سرور نگه‌داری می‌شه:
از پنل ادمین ویرایش می‌شه، اپ از API عمومی می‌خونتش، و می‌شه از روی صفحه‌ی PDF با مدل بینایی (همون
تنظیمات AI پنل ادمین) استخراجش کرد. ساختار هر نکته/سؤال دقیقاً همون تایپ‌های
`mobile/MathMotion/src/content/konkur/types.ts` با فیلدهای camelCase هست (`tipIds`، `choicesMath`،
`chapterId`، `source{kind,year,track,number,abroad,newSystem,round}`، و هر خط `KonkurLine` یا رشته‌ست یا
`{"math": "..."}`)؛ تنها فرق: `figure` (عکس RN) تبدیل شده به `figureUrl` (مثلاً `/uploads/xxx.png`).

فیلد اختیاری `details` (آرایه‌ای از خط‌ها، مثل `body`) «توضیح کامل» نکته‌ست که اپ فقط با باز کردنش نشون می‌ده؛ `body` همون خلاصه‌ی کوتاه می‌مونه، و `details` از ایمپورت/استخراج/پیش‌نویس/تأیید بدون تغییر رد می‌شه (اگه خالی باشه از JSON حذف می‌شه).

**ذخیره‌سازی (migration `011_konkur.sql`، موقع بالا آمدن سرور خودکار اجرا می‌شه):**
`konkur_tips` و `konkur_questions` (هر آیتم یک سند JSONB + `position`/`published`/`updated_at`)،
`konkur_drafts` (پیش‌نویس‌ها)، و `konkur_meta` (یک ردیف با شمارنده‌ی `version`).

**نسخه (`version`):** یک عدد صعودی که با هر ساخت/ویرایش/حذف/ایمپورت/تأیید پیش‌نویس یکی زیاد می‌شه
(داخل همون تراکنش تغییر). اپ با همین عدد می‌فهمه باید دوباره دانلود کنه.

### اندپوینت‌های عمومی (بدون احراز هویت، با rate limit مثل landing)

| مسیر | توضیح |
|---|---|
| `GET /api/v1/public/konkur` | `{"version", "tips":[...], "questions":[...]}` فقط آیتم‌های منتشرشده. نکته‌ها به ترتیب `position` بعد `id`، سؤال‌ها به ترتیب `id`. هدر `ETag` برابر version است و `If-None-Match` با `304` پاسخ داده می‌شه. |
| `GET /api/v1/public/konkur/version` | `{"version": N}` — چک سبک. |

### اندپوینت‌های ادمین (زیر `/admin`، با Bearer token)

- `GET/POST /admin/konkur/tips`، `PUT/DELETE /admin/konkur/tips/:id` — بدنه‌ی POST نکته‌ی کامل (با `id`)؛ PUT جایگزین می‌کنه (id از URL ملاکه). id تکراری در POST: `409`.
- `GET/POST /admin/konkur/questions`، `PUT/DELETE /admin/konkur/questions/:id` — GET فیلترهای `?year=&track=&tipId=&q=` رو می‌فهمه و سند کامل برمی‌گردونه.
- `POST /admin/konkur/import` با بدنه‌ی `{"tips":[...],"questions":[...]}` — همه رو یکجا و در یک تراکنش upsert می‌کنه (منتشرشده)، version فقط یک بار زیاد می‌شه، خروجی `{"tips":N,"questions":M,"version":V}`. اگه یک آیتم نامعتبر باشه هیچ چیز نوشته نمی‌شه (`422` با لیست مشکل‌ها). برای seed کردن از محتوای TS فعلی.
- `POST /admin/konkur/extract` (multipart): فیلد `image` (یک صفحه‌ی PDF که پنل توی مرورگر به PNG/JPEG/WebP تبدیل کرده، حداکثر ۸ مگابایت) و فیلدهای متنی `source_name`، `kind` (`questions` یا `tips`) و اختیاری `year`، `track` (`riazi`/`tajrobi`)، `round`، `abroad`، `page_label`. مدل بینایی با یک prompt مخصوص صفحه‌ی آزمون فارسی صدا زده می‌شه و هر آیتم نتیجه به‌صورت **پیش‌نویس** (نامرئی برای اپ) ذخیره می‌شه. خروجی: `{"drafts":[...],"skipped":[{"index","reason"}]}`.
- `GET /admin/konkur/drafts?status=pending`، `PUT /admin/konkur/drafts/:id` (جایگزینی `data`؛ بدنه یا خود سند است یا `{"data": سند}`؛ هشدارها دوباره محاسبه می‌شن)، `POST /admin/konkur/drafts/:id/approve` (بدنه‌ی اختیاری `{"overwrite":true}`)، `DELETE /admin/konkur/drafts/:id` (وضعیت می‌شه `rejected`).

شکل پیش‌نویس: `{"id","kind":"question"|"tip","source_name","status":"pending"|"approved"|"rejected","data":{...},"warnings":[...],"created_at"}`.

**اعتبارسنجی:**
- سؤال: `id` و `text` غیرخالی؛ `choices` دقیقاً ۴ رشته‌ی غیرخالی؛ `answer` بین ۰ تا ۳؛ `tipIds` حداقل یک مورد (فقط توی پیش‌نویس می‌تونه خالی بمونه)؛ `source.kind` یکی از `authored`/`konkur` و برای `konkur` سال و رشته‌ی معتبر.
- نکته: `id` و `title` غیرخالی؛ `grade` یا `null` یا ۷ تا ۱۲.
- تأیید پیش‌نویس (`approve`) داده رو سخت‌گیرانه چک می‌کنه؛ نامعتبر یا id موجود (بدون `overwrite`) → `422` با پیام فارسی.

### استخراج با AI

- از **همون `vision.Client`** استفاده می‌کنه (متد جدید `Complete(prompt, maxTokens, image, mediaType)`؛ `RecognizeWithUsage` فقط یک wrapper روش شده و رفتار اسکن عوض نشده)، پس provider/کلید/مدل از تنظیمات پنل ادمین خونده می‌شه و پراکسی Xray هم شاملش می‌شه. سقف توکن خروجی برای استخراج ۸۱۹۲ هست (اسکن ۵۱۲).
- هزینه‌ی هر صفحه با `Feature = "konkur_extract"` توی گزارش «هزینه‌ی هوش مصنوعی» (`aiusage`) ثبت می‌شه.
- خروجی مدل حتی اگه داخل ```` ```json ```` یا بین توضیح اضافه باشه پارس می‌شه. آیتم خراب (متن/عنوان خالی، غیر آبجکت) به‌جای شکستن کل صفحه توی `skipped` با دلیل میاد؛ آیتم ناقص (مثلاً بدون پاسخ یا با تعداد گزینه‌ی غلط) پیش‌نویس می‌شه ولی `warnings` داره.
- اگه `year` و `track` داده بشه، `source` از نوع `konkur` ساخته می‌شه و `id` قطعی است (`konkur-1402-riazi-5` و در صورت لزوم `-abroad`/`-r2`)، پس استخراج دوباره‌ی همون صفحه موقع تأیید به «id موجود» می‌خوره.

### تست‌ها

`internal/service/konkur/service_test.go` — با repo و extractor جعلی (بدون دیتابیس و شبکه): اعتبارسنجی سؤال/نکته، افزایش version، import همه‌یا‌هیچ، جریان approve/overwrite/reject، و پارس استخراج (خروجی fenced، متن اضافه، آیتم خراب، نکته‌ها). طبق قرارِ همیشگی اجرای `go test` دست خود کاربره.
