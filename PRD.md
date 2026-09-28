# PRD — AI Math Visual Solver

**Version:** 1.0
**Status:** MVP
**Platform:** Android / iOS
**Frontend:** React Native + TypeScript
**Backend:** Go
**Math Engine:** Python + SymPy
**Database:** PostgreSQL

---

## 1. Product Overview

AI Math Visual Solver یک اپلیکیشن آموزشی ریاضی است که کاربر می‌تواند یک مسئله ریاضی را **تایپ کند یا از آن عکس بگیرد** و اپلیکیشن مسئله را تشخیص داده، حل معتبر آن را پیدا کرده و سپس فرآیند حل را به صورت **مرحله‌به‌مرحله، بصری و انیمیشنی** نمایش دهد.

هدف اصلی محصول این نیست که فقط جواب را نمایش دهد.

هدف:

> **Help the user understand how the problem is solved.**

مثال:

```text
2x + 5 = 17
```

سیستم باید مراحل زیر را نمایش دهد:

```text
2x + 5 = 17

2x + 5 - 5 = 17 - 5

2x = 12

2x / 2 = 12 / 2

x = 6
```

هر مرحله باید با animation اجرا شود.

---

# 2. Product Vision

تبدیل حل مسائل ریاضی از یک خروجی متنی خشک به یک تجربه بصری و تعاملی.

محصول باید حس زیر را ایجاد کند:

> "مسئله جلوی چشم من دارد حل می‌شود."

در نسخه‌های آینده، این تجربه می‌تواند به AR نیز گسترش پیدا کند؛ به شکلی که کاربر کتاب ریاضی را با دوربین بگیرد و حل مسئله روی همان صفحه نمایش داده شود.

---

# 3. MVP Scope

نسخه MVP فقط روی **Algebra** تمرکز دارد.

### Supported Problems

* Arithmetic
* Linear equations
* One-variable equations
* Simplifying expressions
* Fractions
* Powers
* Basic quadratic equations

### Examples

```text
2x + 5 = 17

3(x + 2) = 15

x / 3 + 4 = 9

2x - 7 = 15

x² - 5x + 6 = 0
```

### خارج از MVP

* Geometry
* Trigonometry
* Calculus
* Complex handwritten math
* Full AR
* Multiplayer
* Teacher dashboard
* Social features

---

# 4. Target Users

### Primary Users

دانش‌آموزان 10 تا 18 سال.

### Secondary Users

* دانشجویان
* والدین
* معلمان
* افرادی که قصد یادگیری ریاضی دارند

---

# 5. Core User Flow

```text
Open App
    ↓
Home
    ↓
Choose Input
 ┌──────────────┐
 │              │
Camera        Type
 │              │
 └──────┬───────┘
        ↓
Problem Preview
        ↓
Solve
        ↓
Parse Problem
        ↓
Math Engine
        ↓
Generate Solution Steps
        ↓
Verify Solution
        ↓
Animation
        ↓
Final Answer
```

---

# 6. Home Screen

Home باید بسیار ساده باشد.

### Main CTA

**Scan Problem**

دکمه اصلی برای باز کردن دوربین.

### Secondary CTA

**Type Problem**

برای وارد کردن دستی مسئله.

### Recent Problems

لیست آخرین مسائل حل‌شده.

هر آیتم:

```text
2x + 5 = 17
Linear Equation
x = 6
```

---

# 7. Type Problem

کاربر باید بتواند مسئله را وارد کند.

### Input

یک Math Input مناسب برای فرمول‌ها.

مثلاً:

```text
2x + 5 = 17
```

### Actions

* Clear
* Solve

### Validation

اگر مسئله قابل تشخیص نباشد:

```text
We couldn't understand this problem.
Please check your equation.
```

---

# 8. Camera Scanner

کاربر می‌تواند از مسئله عکس بگیرد.

Camera باید:

1. تصویر را دریافت کند.
2. ناحیه مسئله را تشخیص دهد.
3. متن/فرمول را استخراج کند.
4. مسئله استخراج‌شده را نمایش دهد.
5. امکان اصلاح به کاربر بدهد.
6. بعد از تأیید، مسئله را حل کند.

Flow:

```text
Camera
 ↓
Capture
 ↓
OCR / Vision
 ↓
Detected Equation
 ↓
User Confirmation
 ↓
Solve
```

### نکته

سیستم نباید بدون تأیید کاربر مستقیماً مسئله تشخیص داده‌شده را حل کند.

---

# 9. Problem Parser

Problem Parser وظیفه تبدیل ورودی کاربر به یک ساختار استاندارد ریاضی را دارد.

Input:

```text
2x + 5 = 17
```

Output:

```json
{
  "type": "linear_equation",
  "variables": ["x"],
  "expression": "2*x + 5 = 17"
}
```

Parser باید بتواند خطاهای رایج OCR را اصلاح کند.

مثلاً:

```text
2x + S = 17
```

احتمالاً باید به:

```text
2x + 5 = 17
```

تبدیل شود.

اما اصلاحات مهم باید confidence داشته باشند.

---

# 10. AI Layer

AI برای موارد زیر استفاده شود:

### 1. Understanding

تشخیص نوع مسئله.

### 2. Parsing

تبدیل زبان طبیعی یا تصویر به mathematical representation.

### 3. Explanation

تولید توضیح قابل فهم برای هر مرحله.

### 4. Difficulty

تشخیص سطح تقریبی مسئله.

---

# 11. Math Engine

**Math Engine نباید LLM باشد.**

برای محاسبات واقعی از:

**Python + SymPy**

استفاده شود.

وظایف:

* Solve
* Simplify
* Verify
* Symbolic manipulation
* Generate mathematical expressions

مثال:

```text
Input:
2x + 5 = 17

Output:
x = 6
```

---

# 12. Solution Planner

بعد از حل، سیستم باید یک solution plan تولید کند.

مثال:

```json
{
  "problem": "2x + 5 = 17",
  "answer": "x = 6",
  "steps": [
    {
      "id": 1,
      "operation": "subtract",
      "value": 5,
      "target": "both_sides"
    },
    {
      "id": 2,
      "operation": "divide",
      "value": 2,
      "target": "both_sides"
    }
  ]
}
```

هر step باید شامل:

* Operation
* Target
* Value
* Before expression
* After expression
* Explanation

باشد.

---

# 13. Solution Verification

قبل از نمایش solution باید verify شود.

برای مثال:

```text
2x + 5 = 17
x = 6
```

سیستم باید مقدار 6 را در معادله اصلی جایگذاری کند.

```text
2(6) + 5 = 17
12 + 5 = 17
17 = 17
```

اگر verification موفق نبود، solution نباید نمایش داده شود.

---

# 14. Animation Engine

این مهم‌ترین قسمت محصول است.

Animation Engine باید solution steps را دریافت کند و آنها را به animation تبدیل کند.

Technology:

* React Native Skia
* React Native Reanimated

---

# 15. Animation Requirements

برای هر operation animation اختصاصی وجود داشته باشد.

### Subtract

```text
2x + 5 = 17
       ↓
      -5
       ↓
2x = 12
```

### Divide

```text
2x = 12
 ↓
÷2
 ↓
x = 6
```

### Multiply

```text
x/3 = 5
 ↓
×3
 ↓
x = 15
```

### Move Term

```text
x + 5 = 12
 ↓
x = 12 - 5
```

---

# 16. Solution Screen

ساختار صفحه:

```text
┌─────────────────────────────┐
│                             │
│       Solve                 │
│                             │
│       2x + 5 = 17           │
│                             │
│             ↓               │
│                             │
│       2x = 12               │
│                             │
│   Subtract 5 from both      │
│          sides              │
│                             │
│        ●──────○──────○      │
│                             │
│   ◀ Previous       Next ▶   │
│                             │
└─────────────────────────────┘
```

---

# 17. Animation Controls

کاربر باید بتواند:

* Play
* Pause
* Next
* Previous
* Replay

را انجام دهد.

Animation باید قابل کنترل باشد و کاربر مجبور نباشد تمام مراحل را یکجا مشاهده کند.

---

# 18. Explanation

برای هر step یک توضیح کوتاه نمایش داده شود.

مثلاً:

```text
Subtract 5 from both sides.
```

و برای کاربر فارسی:

```text
عدد ۵ را از هر دو طرف کم می‌کنیم.
```

زبان UI باید از ابتدا قابل localization باشد.

---

# 19. Final Answer

بعد از پایان animation:

```text
Solution Complete

x = 6

✓ Verified
```

نمایش Verified مهم است تا کاربر بداند جواب توسط Math Engine بررسی شده است.

---

# 20. Interactive Learning — Phase 2

در نسخه بعدی سیستم بتواند کاربر را وارد فرآیند حل کند.

مثلاً:

```text
2x + 5 = 17

What should we do first?

○ Add 5
● Subtract 5
○ Divide by 2
○ Multiply by 5
```

بعد از انتخاب صحیح:

```text
✓ Correct!

Let's continue.
```

این قابلیت محصول را از یک **AI Calculator** به یک **AI Math Tutor** تبدیل می‌کند.

---

# 21. History

کاربر بتواند مسائل قبلی را مشاهده کند.

هر History Item:

```text
Problem
Type
Answer
Date
```

مثال:

```text
2x + 5 = 17
Linear Equation
x = 6
Today
```

---

# 22. Backend Architecture

```text
                 React Native
                      │
                      ▼
                  Go API
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       AI Service  Math Service  PostgreSQL
          │           │
          ▼           ▼
      Vision/LLM     SymPy
```

---

# 23. Backend Responsibilities

### Go API

* Authentication
* User management
* Problem management
* Solution orchestration
* History
* API rate limiting
* Logging

### AI Service

* OCR/Vision
* Problem classification
* Parsing
* Explanation generation

### Math Service

* Mathematical solving
* Simplification
* Verification

---

# 24. API

## POST `/api/v1/problems/parse`

Parse a problem.

Request:

```json
{
  "input": "2x + 5 = 17"
}
```

Response:

```json
{
  "problem": "2x + 5 = 17",
  "type": "linear_equation",
  "confidence": 0.99
}
```

---

## POST `/api/v1/problems/solve`

Request:

```json
{
  "problem": "2x + 5 = 17"
}
```

Response:

```json
{
  "answer": "x = 6",
  "verified": true,
  "steps": [
    {
      "id": 1,
      "before": "2x + 5 = 17",
      "after": "2x = 12",
      "operation": "subtract",
      "value": 5,
      "explanation": "Subtract 5 from both sides."
    },
    {
      "id": 2,
      "before": "2x = 12",
      "after": "x = 6",
      "operation": "divide",
      "value": 2,
      "explanation": "Divide both sides by 2."
    }
  ]
}
```

---

# 25. Database

### users

```text
id
name
email
created_at
updated_at
```

### problems

```text
id
user_id
raw_input
normalized_expression
problem_type
created_at
```

### solutions

```text
id
problem_id
answer
verified
steps
created_at
```

---

# 26. Mobile Architecture

React Native project باید modular باشد.

```text
src/
 ├── screens/
 │    ├── Home/
 │    ├── Camera/
 │    ├── ProblemInput/
 │    ├── Solution/
 │    └── History/
 │
 ├── components/
 │    ├── MathExpression/
 │    ├── StepViewer/
 │    ├── Animation/
 │    └── CameraScanner/
 │
 ├── services/
 │    ├── api/
 │    └── math/
 │
 ├── hooks/
 ├── store/
 ├── types/
 ├── utils/
 └── navigation/
```

---

# 27. State Management

برای MVP استفاده از:

**Zustand**

پیشنهاد می‌شود.

Stateهای اصلی:

```text
currentProblem
parsedProblem
solution
currentStep
isPlaying
isPaused
history
```

---

# 28. Math Rendering

Expression rendering نباید با Text ساده React Native انجام شود.

برای نمایش حرفه‌ای فرمول‌ها یک Mathematical Renderer ایجاد شود.

مثلاً:

```text
2x + 5 = 17
```

باید بتواند عناصر زیر را مستقل render کند:

```text
2
x
+
5
=
17
```

این موضوع برای animation بسیار مهم است.

هر token باید بتواند:

* Move
* Fade
* Scale
* Highlight
* Transform

شود.

---

# 29. Design Requirements

UI باید:

* Minimal
* Modern
* Educational
* Friendly
* Fast

باشد.

تمرکز اصلی صفحه Solution روی equation باشد.

از شلوغ کردن UI خودداری شود.

---

# 30. Error Handling

اگر مسئله قابل تشخیص نبود:

```text
We couldn't understand this problem.
Try entering it manually.
```

اگر Math Engine نتوانست حل کند:

```text
This type of problem isn't supported yet.
```

اگر AI confidence پایین داشت:

```text
Please check the detected equation.
```

---

# 31. Offline

MVP می‌تواند online باشد.

Math Engine در نسخه اول server-side اجرا شود.

در آینده امکان اجرای برخی عملیات محلی اضافه شود.

---

# 32. Analytics

در MVP eventهای زیر ثبت شوند:

```text
app_open
problem_typed
problem_scanned
problem_parsed
solution_started
solution_completed
solution_failed
step_completed
problem_saved
```

هدف analytics:

* تشخیص محبوب‌ترین نوع مسئله
* نرخ موفقیت OCR
* نرخ موفقیت Solver
* completion rate
* زمان حل

---

# 33. Performance Requirements

### Mobile

* UI باید حداقل 60 FPS باشد.
* Animation نباید باعث lag شود.
* Camera preview باید smooth باشد.
* Solution screen باید سریع باز شود.

### Backend

هدف MVP:

```text
Parse: < 5 sec
Solve: < 3 sec
```

این اعداد target هستند، نه hard guarantee.

---

# 34. Security

* API authentication
* HTTPS
* Rate limiting
* Input validation
* API keyها فقط در backend
* عدم قرار دادن secret در React Native

---

# 35. Future AR Architecture

از ابتدا Animation Engine باید مستقل از Camera باشد.

در آینده:

```text
Camera
   ↓
Computer Vision
   ↓
Page Detection
   ↓
Equation Detection
   ↓
AR Coordinate System
   ↓
Math Animation Engine
```

یعنی همان Solution Animation Engine فعلی بتواند به جای Canvas معمولی، روی مختصات صفحه کتاب render شود.

---

# 36. Phase Roadmap

## Phase 1 — MVP

* React Native app
* Home
* Type Problem
* Algebra
* Math Engine
* Solution Planner
* Step-by-step animation
* Solution verification
* History

## Phase 2

* Camera
* OCR
* Vision model
* Handwritten equations
* Better explanations
* Interactive solving

## Phase 3

* Geometry
* Graphs
* Functions
* Trigonometry
* Calculus

## Phase 4

* AR
* Book/page detection
* Real-world equation tracking
* AR animated solution

---

# 37. MVP Acceptance Criteria

MVP زمانی کامل محسوب می‌شود که:

* [ ] کاربر بتواند یک مسئله را تایپ کند.
* [ ] سیستم نوع مسئله را تشخیص دهد.
* [ ] Math Engine مسئله را حل کند.
* [ ] جواب verification شود.
* [ ] solution به stepهای ساختاریافته تبدیل شود.
* [ ] هر step به animation تبدیل شود.
* [ ] کاربر بتواند animation را pause/play کند.
* [ ] کاربر بتواند بین stepها حرکت کند.
* [ ] جواب نهایی نمایش داده شود.
* [ ] مسائل قبلی ذخیره شوند.
* [ ] خطاها به شکل مناسب نمایش داده شوند.
* [ ] UI بدون lag اجرا شود.

---

# 38. مهم‌ترین Architectural Rule

این قانون باید در کل پروژه رعایت شود:

```text
             AI
              │
       Understanding
              │
              ▼
       Mathematical AST
              │
              ▼
        Math Engine
              │
        Verified Result
              │
              ▼
      Solution Step JSON
              │
              ▼
      Animation Engine
              │
              ▼
        React Native UI
```

**LLM نباید مستقیماً جواب نهایی را تعیین کند.**

AI وظیفه فهم و توضیح دارد.

Math Engine وظیفه محاسبه و verification دارد.

Animation Engine وظیفه نمایش دارد.

این separation از مهم‌ترین تصمیم‌های فنی پروژه است.

---

# 39. Developer Instruction

پیاده‌سازی باید به صورت incremental انجام شود.

ابتدا:

```text
Type Problem
      ↓
Math Engine
      ↓
Solution JSON
      ↓
Static Solution UI
```

سپس:

```text
Static UI
   ↓
Animation Engine
```

سپس:

```text
Camera
   ↓
OCR
   ↓
Problem Parser
```

و در نهایت:

```text
AR
```

**در MVP از پیاده‌سازی AR، authentication پیچیده، subscription، social features و قابلیت‌های غیرضروری خودداری شود.**

تمرکز اصلی MVP باید روی یک چیز باشد:

> **تبدیل یک مسئله ریاضی به یک حل مرحله‌به‌مرحله زیبا، دقیق و متحرک.**
