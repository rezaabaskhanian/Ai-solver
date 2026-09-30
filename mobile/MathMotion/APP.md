# Mobile — پیاده‌سازی فاز ۱ (MVP)

> این سند تصمیم‌های پیاده‌سازی اپ موبایل را مستند می‌کند. مرجع محصول: [`../../PRD.md`](../../PRD.md)،
> مرجع بک‌اند: [`../../backend/BACKEND.md`](../../backend/BACKEND.md).
> UI/UX فعلی یک نسخه‌ی حداقلی و placeholder است تا طراحی نهایی آماده شود (بخش ۲۹ PRD:
> Minimal/Modern/Educational/Friendly/Fast) — رنگ/فاصله/تایپوگرافی همه از `src/theme` می‌آیند تا
> جایگزین کردن بعدی فقط همان چند فایل را لمس کند، نه کل کدبیس را.

## ۱. اسکوپ این فاز

طبق بخش ۳۹ PRD («Type Problem → Math Engine → Solution JSON → Static Solution UI» قبل از
Animation/Camera): چهار صفحه‌ی Home، Type Problem، Solution (استاتیک، بدون انیمیشن) و History،
متصل به Go API که در فاز بک‌اند ساخته شد. دوربین/OCR (فاز ۲) و Animation Engine (بعد از این فاز
طبق بخش ۳۹) عمداً ساخته نشدند؛ کارت «Scan Problem» در Home غیرفعال با برچسب «به‌زودی» است.

## ۲. ساختار پوشه‌ها (بخش ۲۶ PRD)

```
src/
├── screens/          هر صفحه یک فایل نازک که کامپوننت‌های زیر را می‌چیند
│   ├── Home/
│   ├── ProblemInput/
│   ├── Solution/
│   └── History/
├── components/       دسته‌بندی‌شده بر اساس دامنه، هر فایل < ۱۰۰ خط
│   ├── common/         AppText, AppButton, Card, Badge, ScreenContainer, StatusNotice
│   ├── MathExpression/ رندر توکن‌به‌توکن معادله (بخش ۲۸ PRD)
│   ├── StepViewer/      کارت مرحله + دکمه‌های قبلی/بعدی + progress dots (بخش ۱۶/۱۷)
│   ├── Home/
│   ├── ProblemInput/
│   ├── Solution/
│   └── History/
├── services/api/      axios client + device-id header + توابع parse/solve/history
├── store/             zustand — فعلاً فقط زبان (persisted)
├── hooks/             useHistory, useParsePreview, useDebouncedValue, useStepNavigation, useIsRTL
├── navigation/        native-stack با ۴ صفحه
├── i18n/              i18next + fa.json/en.json
├── theme/             colors/spacing/typography — تنها منبع مقادیر ظاهری
├── types/             شکل‌های JSON بک‌اند (باید با dto.go هماهنگ بماند)
└── assets/fonts/      Vazirmatn (لینک‌شده به هر دو پلتفرم)
```

هیچ کامپوننتی بیش از ~۱۰۰ خط نشد (بزرگ‌ترین فایل، `ProblemInputScreen.tsx`، ۹۸ خط است)؛
منطق مشترک (وضعیت loading/empty/error، کارت‌های خانه، تبدیل خطا) به کامپوننت/hook جدا استخراج شد
تا صفحه‌ها فقط «چیدمان» باشند.

## ۳. زبان دوگانه (فارسی/انگلیسی)

- **i18next + react-i18next**، دیکشنری‌ها در `src/i18n/locales/{en,fa}.json`.
- **فونت**: [Vazirmatn](https://github.com/rastikerdar/vazirmatn) (ادامه‌ی فعال پروژه‌ی «وزیر») —
  سه وزن Regular/Medium/Bold در `src/assets/fonts/`, لینک‌شده به iOS (`Info.plist` + Xcode
  Resources group) و اندروید (`android/app/src/main/assets/fonts/`) با `react-native-asset`.
  `AppText` بر اساس زبان جاری بین فونت Vazirmatn (فارسی) و فونت سیستم (انگلیسی) سوییچ می‌کند —
  هیچ‌جای دیگری مستقیماً `fontFamily` ست نمی‌کند.
- **RTL**: به‌جای فلیپ کردن `I18nManager` (که در React Native فقط بعد از ری‌استارت اپ اثر می‌کند
  و برای MVP تجربه‌ی ناخوشایندی می‌سازد)، هر متن با `useIsRTL()`/`AppText` جهت و چینش خودش را
  به‌صورت نرم (per-component: `textAlign`, `writingDirection`) عوض می‌کند. معادلات ریاضی همیشه
  چپ‌به‌راست می‌مانند (قرارداد جهانی نماد ریاضی) — `MathExpression` این را صریح force می‌کند.
  تصمیم نهایی درباره‌ی میزان RTL mirroring (مثل جهت اسلاید ناوبری) به طراحی UI/UX نهایی موکول شد.
- سوییچ زبان در Home (`LanguageSwitch`) و انتخاب با zustand + AsyncStorage پایدار می‌ماند.

## ۴. اتصال به بک‌اند

- `src/config/env.ts`: آدرس پیش‌فرض `http://10.0.2.2:8080` روی اندروید (امولاتور) و
  `http://localhost:8080` روی iOS — دقیقاً پورت Go API در `backend/docker-compose.yml`. برای
  دستگاه واقعی باید IP لن دستگاه دولوپر جایگزین شود.
- `src/services/api/client.ts`: هدر `X-Device-Id` را از AsyncStorage می‌خواند و می‌فرستد؛ device id
  برگشتی از پاسخ سرور (بخش ۴.۱ BACKEND.md) دوباره ذخیره می‌شود — دقیقاً مطابق قرارداد Device
  middleware سمت Go.
- `src/services/api/apiError.ts`: چون همه‌ی خطاهای اعتبارسنجی از Go با یک کد یکسان
  (`invalid_input`) و پیام انگلیسی متفاوت برمی‌گردند (`errmesg.go`)، ترجمه بر اساس **متن دقیق
  پیام** انتخاب می‌شود، نه کد؛ پیام‌های ناشناخته به‌صورت خام (انگلیسی) نمایش داده می‌شوند تا هیچ
  خطایی بی‌صدا گم نشود.
- **صفحه‌ی Solve نتیجه را خودش می‌گیرد، نه صفحه‌ی Solution**: دکمه‌ی Solve در `ProblemInputScreen`
  مستقیم `POST /problems/solve` را صدا می‌زند و نتیجه را همراه با متن خام مسئله به Solution
  پاس می‌دهد؛ چون پاسخ `/solve` سمت Go خودِ رشته‌ی مسئله را برنمی‌گرداند (`dto.SolveResult` را
  ببینید)، این از یک round-trip اضافه یا state loading تکراری در Solution جلوگیری می‌کند.

## ۵. کتابخانه‌های اضافه‌شده

| کتابخانه | برای |
|---|---|
| `@react-navigation/native` + `native-stack` | ناوبری بین ۴ صفحه |
| `react-native-screens`, `react-native-gesture-handler` | وابستگی‌های لازم native-stack |
| `zustand` (+ `persist`) | استیت زبان (بخش ۲۷ PRD این کتابخانه را پیشنهاد داده) |
| `i18next`, `react-i18next` | دوزبانگی |
| `@react-native-async-storage/async-storage` | پایدارسازی زبان و device id |
| `axios` | HTTP client با interceptor برای هدر device id |
| `@cafebazaar/react-native-poolakey` | خرید درون‌برنامه‌ای بازار (بخش ۶) — اندروید-فقط، با یک patch محلی |
| `patch-package` (dev) | اعمال خودکار اصلاح باگ upstream بالا بعد از هر `npm install` |
| `react-native-reanimated` | Animation Engine (بخش ۱۰) — بدون Skia، جزئیات و دلیل در همان بخش |

هیچ‌کدام برای Camera/OCR (فازهای بعدی) اضافه نشدند — طبق بخش ۳۹ عمداً بیرون از اسکوپ.

## ۵.۱ تپ روی یک مسئله‌ی قبلی (History / Recent Problems)

`HistoryItemCard` (مشترک بین Home's `RecentProblemsList` و صفحه‌ی History) با تپ مستقیم به Solution
navigate می‌کند و همان `steps`/`answer`/`verified` ذخیره‌شده را پاس می‌دهد — **بدون صدا زدن دوباره‌ی
`/solve`**. این یعنی `GET /api/v1/history` سمت بک‌اند باید کل آرایه‌ی steps را برگرداند، نه فقط
جواب نهایی؛ چون این داده از قبل در ستون JSONB جدول `solutions` ذخیره شده بود (بخش ۲۵ PRD)، فقط
کوئری `ListHistory` در `backend/go-api/internal/repository/postgres/problem/problem_repo.go`
عوض شد تا `s.steps` را هم انتخاب/Unmarshal کند — نه یک اندپوینت جدید. با یک Postgres واقعی
(نه fake repo) تست شد: solve دو مسئله → history هر دو را با steps کامل برگرداند.

## ۶. مانتیزیشن — پرداخت درون‌برنامه‌ای بازار (Cafe Bazaar IAP)

مدل: **۵ حل رایگان در کل عمر دستگاه، بعدش خرید یک‌بارمصرف «پرمیوم»** برای حل نامحدود — تصمیم کاربر
(نه چیزی که خودم انتخاب کرده باشم)، جزئیات کامل در `~/.claude/plans/cryptic-questing-dusk.md`.

### ۶.۱ بک‌اند (سهمیه + verify خرید)

- سقف سمت **Go API** اعمال می‌شود، نه موبایل: `problemservice.Solve` قبل از صدا زدن Math Engine
  چک می‌کند (`internal/service/problem/solve.go`) — `SELECT COUNT(*) FROM problems WHERE user_id
  = $1` (متد جدید `CountProblems`) در برابر `FREE_SOLVE_LIMIT` (پیش‌فرض ۵). اگر کاربر Premium
  نباشد و سهمیه تمام شده باشد، خطای جدید `richerror.KindPaymentRequired` → **HTTP 402**
  `{"error":"quota_exceeded"}` برمی‌گردد، بدون تماس با Math Engine یا persist.
- `GET /api/v1/entitlement` وضعیت را برمی‌گرداند (`is_premium`, `free_solves_used`,
  `free_solves_limit`) تا موبایل بتواند paywall را **قبل از رد شدن Solve** نشان دهد.
- `POST /api/v1/billing/verify` توکن خرید بازار را با API واقعی Cafe Bazaar (Purchase Validator:
  OAuth با `client_id`/`client_secret`/`refresh_token`، سپس `GET .../validate/...`) در
  `internal/service/billing` تأیید می‌کند — **هیچ‌وقت ادعای خودِ کلاینت مبنی بر پرداخت پذیرفته
  نمی‌شود.** جدول جدید `purchases` (migration 003) با `purchase_token UNIQUE` باعث می‌شود verify
  دوباره‌ی همان توکن (مثلاً چک بازیابی خرید موبایل) idempotent باشد.
- Credentialهای بازار (`BAZAAR_CLIENT_ID`/`BAZAAR_CLIENT_SECRET`/`BAZAAR_REFRESH_TOKEN`) فقط از
  پنل پیشخان (Pishkhan) به دست می‌آیند — کاری‌ست که فقط خود کاربر می‌تواند انجام دهد؛ بدون آنها
  سرور بالا می‌آید و سهمیه‌ی رایگان کار می‌کند، فقط `/billing/verify` با خطای واضح (نه crash) شکست
  می‌خورد. با Postgres واقعی تست شد: ۳ حل موفق، حل چهارم `402 quota_exceeded`، و verify بدون
  credential واقعی یک ۵۰۰ تمیز داد (نه panic).

### ۶.۲ موبایل — `@cafebazaar/react-native-poolakey`

**تصحیح مهم نسبت به فرض اولیه‌ی من:** اول فکر کردم Poolakey (کتابخانه‌ی native خود بازار، Kotlin)
هیچ RN wrapper رسمی ندارد و شروع کردم به نوشتن یک native module دستی — این فرض غلط بود. کاربر
پکیج رسمی `@cafebazaar/react-native-poolakey` را نشان داد؛ ماژول دستی حذف شد و همه‌چیز روی این
پکیج سوار شد.

- `src/services/billing/poolakey.ts`: wrapper نازک روی پکیج (`connect`, `purchaseProduct`,
  `queryOwnedPurchases`, `getProductPrice`) با گارد `Platform.OS === 'android'` — بازار روی iOS
  اصلاً وجود ندارد. چون local security check را در سرور خودمان انجام می‌دهیم (`internal/service/
  billing`)، `connect(null)` صدا زده می‌شود — دقیقاً همان چیزی که مستندات خودِ Poolakey برای حالت
  «استفاده از REST API validator» توصیه می‌کند؛ یعنی نیازی به RSA public key در موبایل نیست.
- **باگ واقعی upstream پیدا و patch شد**: کد native این پکیج (`ReactNativePoolakeyModule.kt`) با
  نسخه‌ی React Native این پروژه (0.87، معماری جدید) کامپایل نمی‌شد — `currentActivity` در دو تابع
  (`purchaseProduct`/`subscribeProduct`) resolve نمی‌شد. با `patch-package` اصلاح شد
  (`patches/@cafebazaar+react-native-poolakey+3.1.2.patch`؛ `postinstall: patch-package` در
  `package.json` باعث می‌شود این اصلاح بعد از هر `npm install` دوباره اعمال شود). با
  `./gradlew :app:compileDebugKotlin` واقعی تأیید شد که کامپایل موفق است.
- `src/store/useEntitlementStore.ts`: زوستند بدون persist (برخلاف زبان) — همیشه از سرور
  refetch می‌شود چون منبع حقیقت سمت Go API است.
- `src/hooks/usePurchasePremium.ts`: `connect → purchaseProduct → verifyPurchase (سرور) →
  refresh استیت`. `src/hooks/useRestorePurchases.ts`: در Home mount، خریدهای مالکیت‌شده‌ی حساب
  بازار را می‌خواند و دوباره به سرور verify می‌کند — چون اکانت واقعی نداریم (بخش ۴.۱ BACKEND.md)،
  این تنها راه است که نصب مجدد اپ، Premium را گم نکند؛ به لطف `purchase_token UNIQUE` بی‌خطر است.
- UI: `FreeSolvesBadge` (Home + ProblemInput) و `PaywallCard` (جایگزین دکمه‌ی Solve وقتی سهمیه
  تمام شده، هم از مسیر UI و هم به‌صورت defensive روی خطای `quota_exceeded`).

### ۶.۳ اشتراک زمان‌دار (ماهانه و ...) — جایگزین مدل یک‌باره

مدل فروش حالا **پلن‌های زمان‌دار** است، مثل لینگوفلو (`Shadowing-backend`): هر پلن یک «محصول
درون‌برنامه‌ای» در پیشخان بازار است که خریدش N روز پرمیوم اضافه می‌کند (`users.premium_until`).
خرید دوباره قبل از تمام شدن، روزها را روی هم می‌گذارد. خرید یک‌باره‌ی قدیمی
(`mathmotion_premium_unlock`، `users.is_premium`) برای کسانی که خریده‌اند همچنان کار می‌کند و
بازیابی می‌شود، ولی دیگر فروخته نمی‌شود.

- **تأیید خرید با API جدید پیشخان** (`internal/service/billing/bazaar_client.go`): یک توکن
  (`BAZAAR_API_SECRET`) در هدر `CAFEBAZAAR-PISHKHAN-API-SECRET`؛ دیگر OAuth
  (`client_id`/`client_secret`/`refresh_token`) لازم نیست. توکن از پنل ادمین (تب «اشتراک‌ها»)
  یا `.env` خوانده می‌شود و بدون ری‌استارت اعمال می‌شود.
- **پلن‌ها** در جدول `subscription_plans` (migration 007) و از تب «اشتراک‌ها»ی پنل ادمین قابل
  تعریف‌اند. اپ لیست را از `GET /api/v1/billing/plans` می‌گیرد و قیمت واقعی را از خود بازار.
- **خرید در اپ** (`screens/Premium`, `hooks/usePurchasePremium.ts`): `purchaseProduct →
  verifyPurchase(product_id, token) → consumePurchase`. مصرف (consume) لازم است تا بازار اجازه‌ی
  خرید دوباره‌ی همان پلن را بدهد. اگر consume قطع شود، `useRestorePurchases` در اجرای بعدی آن را
  verify و consume می‌کند (سرور روزها را فقط یک بار برای هر توکن اضافه می‌کند).
- **کد کاربری**: هر کاربر یک کد ۸ حرفی دارد (`users.code`) که در «تنظیمات» نشان داده می‌شود. ادمین
  با این کد (یا شماره موبایل) در تب «اشتراک‌ها» کاربر را پیدا می‌کند و می‌تواند روز اضافه کند،
  «نامحدود» کند (هیچ سقفی، حتی سقف اسکن) یا اشتراک را لغو کند.

### ۶.۴ حساب کاربری (ثبت‌نام / ورود) — دقیقاً مثل لینگوفلو

ورود **اجباری** است: اولین اجرا ← معرفی (onboarding) ← صفحه‌ی ورود ← اپ (`App.tsx`,
`screens/Auth/AuthScreen.tsx`)، مثل `App.tsx` لینگوفلو.

- **ثبت‌نام**: نام + شماره موبایل + رمز عبور ← کد ۵ رقمی پیامکی (sms.ir) ← حساب ساخته می‌شود.
- **ورود**: شماره موبایل + رمز عبور. **فراموشی رمز**: شماره ← کد پیامکی ← رمز جدید.
- توکن‌ها JWT (HS256) هستند: access (۲۴ ساعت) روی هر درخواست، refresh (۳۰ روز) فقط برای
  `POST /api/v1/auth/refresh`. کلاینت روی ۴۰۱ یک بار خودکار تمدید می‌کند (`services/api/client.ts`)؛
  فقط اگر تمدید هم ۴۰۱ بگیرد کاربر خارج می‌شود — قطعی اینترنت هیچ‌وقت کاربر را خارج نمی‌کند.
- کدهای پیامکی (`internal/service/otp`، جدول `otp_codes`): ۲ دقیقه اعتبار، ارسال دوباره بعد از ۶۰
  ثانیه، ۵ تلاش؛ کد درست یک توکن یک‌بارمصرف ۱۰ دقیقه‌ای می‌دهد که ثبت‌نام/بازیابی رمز باید بفرستد.
- **تفاوت با لینگوفلو (به نفع کاربر):** ثبت‌نام روی یک گوشی، کاربرِ ناشناسِ همان گوشی را به حساب
  تبدیل می‌کند؛ پس تاریخچه و اشتراکی که قبل از ثبت‌نام خریده شده حفظ می‌شود. حالا با حذف/نصب
  دوباره‌ی اپ یا عوض کردن گوشی، ورود با شماره همه‌چیز را برمی‌گرداند.
- نسخه‌های قدیمی اپ (بدون ورود) هنوز با `X-Device-Id` کار می‌کنند (`middleware.Device`).

### ۶.۵ کارهایی که فقط خود کاربر می‌تواند انجام دهد

۱) در پیشخان بازار، برای هر پلن یک محصول درون‌برنامه‌ای بساز (مثلاً `mathmotion_1m` برای یک ماهه —
همان که migration 007 به‌عنوان پلن پیش‌فرض می‌سازد).
۲) پیشخان ← برنامه ← «API پیشخان بازار» ← «دریافت توکن جدید»، و توکن را در تب «اشتراک‌ها»ی پنل
ادمین (یا `BAZAAR_API_SECRET` در `.env`) ذخیره کن.
۳) تست خرید واقعی فقط روی دستگاه واقعی با اپ نصب‌شده‌ی بازار ممکن است.
۴) در sms.ir یک قالب «ارسال سریع» با پارامتر `#CODE#` بساز؛ کلید API و شناسه‌ی قالب را در پنل ادمین
(کارت «ورود و پیامک») یا `.env` (`SMS_IR_API_KEY`, `SMS_IR_OTP_TEMPLATE_ID`) ذخیره کن.
۵) `JWT_SIGN_KEY` را در `.env` سرور بگذار (`openssl rand -hex 32`) — بدون آن API در production بالا
نمی‌آید.

## ۷. دوربین → AR Solution (تکمیل‌شده در این پاس، فقط Android)

یک پاس قبلی، pipeline دوربین را تا نیمه ساخته بود: بک‌اند (`POST /api/v1/problems/recognize` با
Claude vision، `backend/go-api/internal/service/vision`) و گرفتن عکس سمت موبایل
(`ScanScreen.tsx`, `useScanAndSolve.ts`) کامل بودند، اما مسیرهای `Scan`/`ArSolution` اصلاً توی
`RootNavigator.tsx` ثبت نشده بودند (تپ روی Scan در Home کرش می‌کرد) و پوشه‌ی
`src/screens/ArSolution/` کاملاً خالی بود. این پاس همان حلقه را بست.

**طراحی:** `ViroARSceneNavigator` تمام‌صفحه زیر یک overlay دوبعدی RN قرار می‌گیرد — دقیقاً الگوی
استاندارد Viro. عکس گرفته‌شده به‌عنوان AR image-tracking target در لحظه‌ی mount ثبت می‌شود
(`ViroARTrackingTargets.createTargets`، با `targetName = problem-${problem_id}` برای جلوگیری از
تداخل بین اسکن‌های مختلف؛ `physicalWidth` یک تخمین ثابت A4 است چون اندازه‌ی واقعی کاغذ معلوم
نیست — فقط روی مقیاس محتوا اثر می‌گذارد، نه تشخیص). داده‌ی پویا (steps/currentIndex) از طریق
`viroAppProps` به صحنه‌ی Viro می‌رود (تنها راه رسمی چون صحنه‌ی Viro بخشی از درخت RN معمولی نیست)؛
وضعیت anchor found/lost از همان مسیر با یک callback برمی‌گردد.

**بازاستفاده، نه بازسازی:** ناوبری بین stepها، progress dots، دکمه‌های قبلی/بعدی، و کارت جواب
نهایی همان کامپوننت‌های `SolutionScreen` استاتیک هستند (`useStepNavigation`, `StepProgressDots`,
`StepControls`, `FinalAnswerCard`) — به‌عنوان overlay روی صحنه‌ی AR رندر می‌شوند. فقط خود کارت
معادله‌ی شناور در فضای سه‌بعدی جدید ساخته شد (`ArStepCard.tsx` با `ViroFlexView`/`ViroText`، چون
Viro نمی‌تواند کامپوننت RN معمولی رندر کند) — معادل AR همان `StepCard.tsx`.

فایل‌های جدید: `src/components/Ar/ArScene.tsx`, `ArStepCard.tsx`, `ArTrackingHint.tsx` (راهنمای
«دوربین را روی برگه بگیر» تا anchor پیدا شود)، `src/screens/ArSolution/ArSolutionScreen.tsx`.
`arAnimations.ts`/`arMaterials.ts` (که از پاس قبلی مونده بودن ولی استفاده نمی‌شدن) حالا واقعاً
مصرف می‌شوند.

### ۷.۱ یک ناسازگاری واقعی پیدا و patch شد: `@reactvision/react-viro` + RN 0.87

قبل از این پاس، هیچ‌جای کد واقعاً `@reactvision/react-viro` را import نمی‌کرد (چون `ArScene`/
`ArStepCard` وجود نداشتن) — یعنی این باگ تا حالا هیچ‌وقت لمس نشده بود. بعد از وصل کردن همه‌چیز،
باندل Metro با این خطا شکست: `ViroMaterials.js` در لحظه‌ی import یک `require("react-native/
Libraries/Image/AssetRegistry")` انجام می‌دهد — مسیری که در RN 0.87 به
`src/private/assets/AssetRegistry.js` منتقل شده (با یک named export، نه شکل قدیمی). بررسی کامل
`dist/` نشان داد این تنها deep-import مشکل‌دار پکیجه (دو مورد دیگر، `resolveAssetSource` و
`package.json`، هنوز سر جای قدیمی‌شون هستن). دقیقاً مثل باگ upstream قبلی
`@cafebazaar/react-native-poolakey` (بخش ۶.۲)، با **`patch-package`** درست شد:
`patches/@reactvision+react-viro+2.58.1.patch` مسیر require را به مسیر جدید + `.AssetRegistry`
عوض می‌کند؛ `postinstall: patch-package` موجود در `package.json` این را بعد از هر `npm install`
دوباره اعمال می‌کند — نیازی به pull request جدا یا صبر برای نسخه‌ی بعدی پکیج نبود.

## ۹. تشخیص خطا، تولید تمرین، اسکن چندمسئله‌ای، و خروجی راه‌حل (خارج از PRD)

چهار فیچر که کاربر بعد از یک brainstorm انتخاب کرد (لیست کامل ایده‌ها در `../../FEATURES.md`).
هرکدوم سمت بک‌اند مستند شده در `backend/BACKEND.md` بخش ۷.

### ۹.۱ Check My Steps

صفحه‌ی جدید `src/screens/CheckSteps/CheckStepsScreen.tsx`: مسئله را نشان می‌دهد، یک
`StepsInput` چندخطی جدید (خط‌به‌خط، همون قرارداد LTR اجباری `EquationInput.tsx`) می‌گیرد، و بعد
از `POST /problems/check` هر خط را با یک `StepFeedbackCard` (حاشیه‌ی سبز/قرمز) نشان می‌دهد. اگر
اشتباهی پیدا شود یا دانش‌آموز کامل نکرده باشد، `next_step_hint` (که دقیقاً شکل `SolutionStep`
موجود را دارد) با همون کامپوننت **موجود** `StepCard.tsx` رندر می‌شود — چیز جدیدی برای نمایش
before/after لازم نبود. ورودی: دکمه‌ی جدید «Check my steps» در `ProblemInputScreen.tsx` (کنار
Solve، با همون مسئله‌ی تایپ‌شده).

### ۹.۲ Practice Similar

دکمه‌ی جدید در `SolutionScreen.tsx` (کنار Done) که `POST /problems/practice` را با نوع مسئله‌ی
فعلی صدا می‌زند و مستقیم به **همون** `CheckSteps` (بخش ۹.۱) با مسئله‌ی تازه navigate می‌کند —
یعنی تولید تمرین و چک‌کردن خطا به هم وصل شدن: به‌جای اینکه فقط یک مسئله‌ی دیگر برای خواندن جواب
بدهیم، دانش‌آموز مجبور است خودش حلش کند و روی همون تلاش feedback بگیرد. فقط برای انواعی که
`practice.py` تولید می‌کند (`linear_equation`/`quadratic_equation`/`expression`/`arithmetic`)
نمایش داده می‌شود — برای مشتق/انتگرال/مثلثات/arithmetic_equation دکمه اصلاً ظاهر نمی‌شود.

### ۹.۳ اسکن چندمسئله‌ای — و بستن یک gap واقعی PRD

بخش ۸ PRD صریح می‌گه سیستم نباید بدون تأیید کاربر مستقیم مسئله‌ی اسکن‌شده رو حل کنه. پیاده‌سازی
قبلی (`useScanAndSolve.ts`) دقیقاً همین کار رو می‌کرد — capture → recognize → solve همه در یک
تابع، بدون توقف برای تأیید. حالا که بک‌اند چند مسئله در یک عکس برمی‌گردونه (`recognized_problems:
[]string`)، این gap هم بسته شد:

- `useScanAndSolve.ts` حذف و با `useScanAndRecognize.ts` جایگزین شد — فقط capture + recognize،
  بدون صدا زدن solve.
- `ScanScreen.tsx` حالا به صفحه‌ی جدید `src/screens/RecognizedProblems/RecognizedProblemsScreen.tsx`
  navigate می‌کند: لیست مسائل تشخیص‌داده‌شده (هرکدوم یک `Card` قابل‌تپ با `MathExpression`)، تپ
  روی هرکدوم همون `solveProblem` موجود (`services/api/problems.ts`، دقیقاً همونی که
  `ProblemInputScreen` استفاده می‌کند) را صدا می‌زند و به `ArSolution` می‌رود — پایین‌دست این
  صفحه چیزی عوض نشد.

### ۹.۴ خروجی راه‌حل به‌صورت عکس

دو کتابخانه‌ی جدید: `react-native-view-shot` (screenshot) و `react-native-share` (share sheet
بومی) — فقط Android در این پاس، هم‌راستا با تصمیم قبلی بخش ۷ برای هر کار native جدید. در
`SolutionScreen.tsx`، بلوک مسئله+گام‌ها+جواب نهایی (نه دکمه‌های عمل) داخل یک `<ViewShot>` قرار
گرفت؛ دکمه‌ی «Share» جدید `capture()` می‌گیرد و با `Share.open({ url })` share sheet بومی را باز
می‌کند. رد کردن share sheet توسط کاربر (نه خطای واقعی) به‌صورت جدا مدیریت می‌شود تا پیام خطای
اشتباه نشان داده نشود.

**نصب:** این دو پکیج به `package.json` اضافه شدند ولی `npm install` اجرا نشد (طبق تصمیم این پاس،
اجرا/تست دست خود کاربره) — قبل از build باید `npm install` (و `pod install` اگر iOS هدف باشه،
هرچند این پاس فقط Android است) اجرا بشه.

### ۹.۵ تست

`pytest`/`go test` جدید نوشته شدن سمت بک‌اند (بخش ۷ BACKEND.md) ولی **اجرا نشدن** — طبق تصمیم
این پاس، تست/build دست خود کاربره. سمت موبایل هم `tsc`/`eslint`/gradle اجرا نشد. قدم بعدی: اجرای
دستی همه‌ی این‌ها، به‌علاوه تست end-to-end واقعی روی یک دستگاه Android (اسکن چندمسئله‌ای و
share sheet هر دو نیاز به دستگاه واقعی دارن، مثل AR در بخش ۷).

## ۱۰. Animation Engine — Play/Pause/Replay (بخش ۱۴/۱۵/۱۷ PRD)

FEATURES.md بخش ۳ دو ردیف «ساخته نشده» داشت: انیمیشن دوبعدی صفحه‌ی Solution، و کنترل‌های
Play/Pause/Replay (قبلاً فقط Previous/Next بود). هر دو با هم ساخته شدن چون از یک state مشترک
تغذیه می‌کنن.

**چرا فقط Reanimated، بدون Skia:** PRD این دو تکنولوژی رو کنار هم اسم می‌بره، ولی چیزی که بخش ۱۵
واقعاً توصیف می‌کنه (فلش پایین، یک برچسب عملیات مثل `-5`، فلش پایین، نتیجه) یک دنباله‌ی
fade/slide/scale روی View/Text معمولیه، نه رسم سفارشی روی canvas — دقیقاً همون چیزی که
Reanimated به‌تنهایی خوب انجامش می‌ده. اضافه‌کردن Skia یعنی یک وابستگی native سنگین دیگه
(هم‌رده‌ی همون ریسکی که `@reactvision/react-viro` در بخش ۷.۱ داشت) بدون اینکه چیزی به تجربه‌ی
کاربر اضافه کنه؛ اگر بعداً یک انیمیشن واقعاً canvas-محور (مثل مسیر حرکت منحنی یک جمله بین دو
طرف تساوی) لازم شد، Skia رو می‌شه جدا اضافه کرد.

**معماری:**
- `src/components/StepViewer/animationTiming.ts` — تنها منبع زمان‌بندی (`STAGE_GAP_MS`,
  `REVEAL_DURATION_MS`, `AUTOPLAY_STEP_MS`)، مشترک بین صحنه‌آرایی بصری و تایمر autoplay، تا این
  دو هیچ‌وقت از هم عقب/جلو نیفتن.
- `FadeInStage.tsx` — یک پریمیتیو عمومی (fade + translateY + scale، با تأخیر پارامتری) که هر
  ۶ مرحله (`before` → فلش → `OperationBadge` → فلش → `after` → توضیح) از همون یکی استفاده
  می‌کنن؛ به `useReducedMotion()` احترام می‌ذاره (اگر کاربر Reduce Motion سیستم رو روشن کرده
  باشه، مستقیم حالت نهایی رندر می‌شه، بدون انیمیشن).
- `OperationBadge.tsx` — بخش ۱۵ PRD یک انیمیشن اختصاصی برای هر operation می‌خواد؛ عملیات‌های
  حسابی (`subtract`/`add`/`divide`/`multiply`) دقیقاً همون برچسب `− 5` / `÷ 2` دیاگرام PRD رو
  می‌گیرن، و همه‌ی ۱۵ نوع operation دیگه (`move_term`, `factor`, `power_rule`, ...) یک برچسب
  ترجمه‌شده‌ی مخصوص خودشون از `solution.operations.*` — یعنی هیچ نوع step‌ای بدون برچسب رد
  نمی‌شه، نه فقط چهار موردی که PRD دیاگرام کشیده.
- `useStepNavigation.ts` (بازنویسی) — همون هوک قبلی currentIndex/isFirst/isLast/goToNext/
  goToPrevious را نگه داشته، به‌علاوه‌ی `isPlaying`/`play`/`pause`/`replay` و یک `playToken` که
  روی هر جابه‌جایی (تپ یا autoplay) افزایش پیدا می‌کنه — چون Replay ممکنه برگرده به step‌ای که
  محتوایش عوض نشده (step ۰)، پس صرفاً دنبال‌کردن تغییر `step.id` برای re-trigger انیمیشن کافی
  نیست. Autoplay خودش رو با `AUTOPLAY_STEP_MS` پیش می‌بره و در آخرین step خودش رو pause می‌کنه
  (Play یعنی «باقیمانده رو نشون بده»، نه loop بی‌نهایت — Replay راه صریح برگشتن به اول است).
- `StepControls.tsx` — ردیف Previous/Play‌یا‌Pause/Next، به‌علاوه‌ی دکمه‌ی Replay؛ در آخرین step،
  Play غیرفعال می‌شه چون چیزی برای autoplay باقی نمونده.
- `StepCard.tsx` از این همه استفاده می‌کنه ولی `playToken` را **اختیاری** نگه داشته (پیش‌فرض
  `step.id`) — یعنی مصرف‌کننده‌ی دیگه‌ش، `CheckStepsScreen`'s `next_step_hint` (بخش ۹.۱)، بدون
  هیچ تغییری همچنان کار می‌کنه و یک بار روی mount انیمیشن می‌گیره.

AR Solution (بخش ۷) هم از همون `useStepNavigation` استفاده می‌کنه، پس `StepControls` جدید
(که حالا `isPlaying`/`onTogglePlay`/`onReplay` را required می‌خواد) اونجا هم به‌روزرسانی شد —
`ArSolutionScreen.tsx` حالا Play/Pause/Replay رو هم نشون می‌ده. خودِ نمایش step روی عکس هنوز
انیمیشن جداگانه‌ی Viro (`arAnimations.ts` — `ViroAnimations`) رو داره، نه Reanimated؛ این دو
سیستم انیمیشن کاملاً مستقلن (یکی 2D View/Text، یکی AR scene)، فقط دکمه‌های پخش رو مشترک کردیم.

**نصب:** `react-native-reanimated` **نسخه‌ی ۴** (+ `react-native-worklets` 0.13.x که پیش‌نیاز
نسخه‌ی ۴ است) در `package.json`. پلاگین بابل `react-native-worklets/plugin` است، نه
`react-native-reanimated/plugin` نسخه‌ی ۳ (`babel.config.js`، باید آخرین پلاگین باشه). نسخه‌ی ۳ با
React Native 0.87 سازگار نیست؛ Reanimated 4.7 برای RN 0.86 تا 0.88 است و New Architecture
می‌خواهد (`newArchEnabled=true` از قبل روشن است).

## ۱۱. Interactive Learning — Quiz Mode (بخش ۲۰ PRD)

FEATURES.md بخش ۳ این رو «فاز ۲ محصول، ساخته نشده» علامت زده بود. تصمیم گرفتم بسازمش چون همه‌ی
داده‌ی لازمش از قبل توی همون `SolveResult` هست که `/problems/solve` برمی‌گردونه — نیازی به
اندپوینت جدید بک‌اند نبود؛ کاملاً سمت موبایل ساخته شد.

**تفاوت با Solution:** به‌جای نشون‌دادن همه‌ی stepها یکجا، `ProblemInputScreen` یک دکمه‌ی سوم
اضافه کرد («با کوییز یاد بگیر»، کنار Solve و Check my steps) که همون `solveProblem` رو صدا
می‌زنه ولی به‌جای Solution، به `Quiz` navigate می‌کنه — یعنی جواب هیچ‌وقت زودتر از وقتش لو
نمی‌ره؛ دانش‌آموز باید هر step رو با انتخاب عملیات درست «به‌دست بیاره».

**تولید گزینه‌های غلط:** `src/components/Quiz/quizChoices.ts` — دقیقاً مثال بخش ۲۰ PRD رو بازتولید
می‌کنه (`2x + 5 = 17` → «Subtract 5» درست، «Add 5»/«Divide by 2»/«Multiply by 5» غلط) با استفاده
از همون سیستم برچسب `OperationBadge.tsx` که برای Animation Engine (بخش ۱۰) ساختم — دو تابعش
(`arithmeticBadgeText`, `translatedOperationLabel`) رو export کردم تا این‌جا دوباره استفاده بشن،
نه اینکه یک کپی دوم از نگاشت عملیات→برچسب بسازم:
- اگر operation واقعی حسابیه (`subtract`/`add`/`divide`/`multiply` با یک `value`)، سه گزینه‌ی
  غلط دقیقاً سه عملیات حسابی دیگه با همون value هستن — همیشه دقیقاً ۳ تا می‌شن چون این مجموعه
  کلاً ۴ عضو داره.
- اگر operation چیز دیگه‌ایه (`move_term`, `factor`, `power_rule`, ...) که value حسابی نداره،
  سه گزینه‌ی غلط از یک pool ثابت عملیات‌های دیگه (`move_term`/`factor`/`expand`/`simplify`،
  هرکدوم غیر از خودِ عملیات درست) میان.
- ترتیب گزینه‌ها با یک shuffle seed‌شده با `step.id` مشخص می‌شه — یعنی برای یک step ثابت، جای
  گزینه‌ی درست بین re-renderها عوض نمی‌شه (وگرنه با هر تلاش غلط، دکمه‌ها جابه‌جا می‌شدن)، ولی
  همه‌ی stepها هم لزوماً گزینه‌ی درست رو توی همون خونه نشون نمی‌دن.

**رفتار جواب غلط:** برخلاف چیزی که PRD صریح نگفته، تصمیم گرفتم انتخاب غلط باعث خاتمه یا نمایش
جواب درست نشه — فقط همون گزینه به رنگ قرمز/غیرفعال می‌شه («خط می‌خوره») و بقیه‌ی گزینه‌ها باز
می‌مونن تا دانش‌آموز واقعاً به جواب درست برسه، نه فقط یک بار امتحان کنه و جواب رو ببینه. این با
لحن «AI Math Tutor» بخش ۲۰ PRD هم‌خون‌تره تا یک کوییز تک‌تلاشی.

**Edge case:** مسائلی که اصلاً step ندارن (`arithmetic_equation` مثل `2+2=4`، یا یک `expression`
که از قبل کاملاً ساده بوده — هر دو در `backend/math-engine/app/main.py`/`expression.py` می‌تونن
`steps: []` برگردونن) مستقیم جواب نهایی رو نشون می‌دن، بدون UI کوییز خالی.

**نصب/تست:** کتابخانه‌ی جدیدی لازم نداشت (فقط از چیزهای موجود — theme، AppButton/Card/AppText،
i18next — استفاده کرد)، پس هیچ تغییری توی `package.json` نیست. مثل همیشه، `tsc`/`eslint`/جست
دستی اجرا نشد.

## ۱۲. تست‌های خودکار موبایل فراتر از smoke test (بخش ۶ FEATURES.md)

قبل از این پاس تنها تست موبایل `__tests__/App.test.tsx` بود (فقط رندر می‌کنه، هیچ منطقی رو چک
نمی‌کنه). این پاس ۵ فایل تست jest جدید اضافه کرد، همه colocated کنار فایل خودشون
(`*.test.ts`/`*.test.tsx`، نه یک پوشه‌ی `__tests__` جدا) — الگویی که با jest's default
`testMatch` بدون تغییر `jest.config.js` کشف می‌شه:

- `tokenize.test.ts` — پارسر توکن‌های `MathExpression` (اعداد اعشاری، اسم تابع چندحرفی مثل
  `sin`، توان).
- `OperationBadge.test.ts` — سه تابع pure که Animation Engine (بخش ۱۰) و Quiz Mode (بخش ۱۱) هر
  دو ازشون استفاده می‌کنن (`arithmeticBadgeText`, `translatedOperationLabel`,
  `operationDisplayLabel`).
- `quizChoices.test.ts` — بازتولید دقیق مثال بخش ۲۰ PRD، به‌علاوه‌ی یک حلقه روی ۶ نوع عملیات
  مختلف که همیشه دقیقاً ۱ گزینه‌ی درست از ۴ گزینه‌ی غیرتکراری تولید بشه، و اینکه shuffle برای یک
  `step.id` ثابت deterministic بمونه.
- `apiError.test.ts` — نگاشت کد/پیام خطای Axios به کلید ترجمه (`toApiError`,
  `translationKeyForApiError`) — قبلاً هیچ تستی نداشت با اینکه هر صفحه‌ای که به بک‌اند وصله
  بهش تکیه می‌کنه.
- `useStepNavigation.test.tsx` — پیچیده‌ترین منطق جدید امروز: با `jest.useFakeTimers()` چک
  می‌کنه autoplay دقیقاً هر `AUTOPLAY_STEP_MS` یک قدم جلو می‌ره، در آخرین step خودش رو pause
  می‌کنه، یک تعویض دستی وسط پخش تایمر قبلی رو لغو می‌کنه (نه اینکه دوتا تایمر همزمان بدون
  اینکه بدونیم اجرا بشن)، و `replay` حتی وقتی به step‌ای برمی‌گرده که همون index قبلی‌‌ست هم
  `playToken` رو تغییر می‌ده.

هیچ‌کدوم به `@testing-library/react-native` یا `react-hooks-testing-library` نیاز نداشتن —
پروژه فقط `react-test-renderer` (که از قبل devDependency بود) داره، پس `useStepNavigation.test.tsx`
یک نسخه‌ی خیلی کوچیک از الگوی `renderHook` رو خودش پیاده کرده (یک کامپوننت میزبان که مقدار
هوک رو روی یک ref می‌ذاره) به‌جای اضافه‌کردن یک وابستگی تازه.

**نکته‌ی مهم که همراه این کار لازم شد:** اضافه‌شدن `react-native-reanimated` (بخش ۱۰) خودِ
`App.test.tsx` رو می‌شکست — چون `RootNavigator.tsx` همه‌ی صفحه‌ها رو eager import می‌کنه (از
جمله Solution/Quiz که به `StepCard`/reanimated می‌رسن)، حتی یک تست که فقط صفحه‌ی Home رو
رندر می‌کنه هم زنجیره‌ی import رو اجرا می‌کنه. `jest.setup.js` حالا `react-native-reanimated`
رو با mock رسمی خودش (`react-native-reanimated/mock`) جایگزین می‌کنه — دقیقاً همون الگویی که
`@cafebazaar/react-native-poolakey` قبلاً برای همین مشکل (native module موجود نیست تو محیط
Jest) گرفته بود.

**نصب/اجرا:** بدون وابستگی جدید. مثل همیشه `jest` واقعاً اجرا نشد این پاس — طبق تصمیم قبلی،
اجرا/تأیید تست دست خود کاربره.

## ۱۳. زبان اپ: فعلاً فقط فارسی (نسخه‌ی بازار)

- `src/config/language.ts`: `DEFAULT_LANGUAGE = 'fa'` و `LANGUAGE_SWITCH_ENABLED = false`.
  دکمه‌ی تغییر زبان در Home پنهان است و زبانی که نسخه‌های قبلی ذخیره کرده بودند نادیده گرفته می‌شود.
- ترجمه‌ی انگلیسی (`en.json`) کامل و دست‌نخورده نگه داشته شده، چون نسخه‌ی Google Play محتمل است.
  برای آن فقط همین دو ثابت عوض می‌شوند (راهنما داخل همان فایل است).
- **توضیح مراحل حل** (`step.explanation`، هم در Solution و هم در راهنمای «چک کردن مراحل») در
  math-engine ترجمه می‌شود، نه در i18n اپ. اپ زبان فعلی را در هدر `Accept-Language` می‌فرستد
  (`src/services/api/client.ts`)، go-api آن را در context می‌گذارد (`internal/pkg/locale`) و
  به‌صورت `lang` به `/solve` و `/check` می‌دهد. متن‌ها در
  `backend/math-engine/app/solver/messages.py` هستند. عبارت‌های ریاضی داخل جمله‌ی فارسی با
  Unicode isolate (LRI/PDI) چپ‌به‌راست نگه داشته می‌شوند تا مثلاً «-3» به «3-» تبدیل نشود.
- مسئله‌هایی که قبلاً حل و در History ذخیره شده‌اند، به همان زبانی می‌مانند که موقع حل بودند.
- **تست‌نشده:** `ViroText` در صفحه‌ی AR متن را با موتور رندر خود Viro می‌کشد. معلوم نیست حروف فارسی
  را درست به هم بچسباند؛ روی گوشی واقعی چک شود.

## ۱۴. منوی کناری (Drawer) و «مباحث درسی»

- `src/navigation/AppDrawer.tsx`: drawer (`@react-navigation/drawer`) کل stack را به‌صورت یک صفحه‌ی
  `Main` در بر می‌گیرد، پس باز کردن «تاریخچه» یا «مباحث» از منو صفحه را روی همان stack باز می‌کند و
  Back طبق معمول کار می‌کند. در فارسی از راست باز می‌شود. دکمه‌ی ☰ در هدر Home است
  (`components/Drawer/MenuButton.tsx`). کشیدن لبه‌ی صفحه فقط روی Home، Topics و History drawer را
  باز می‌کند؛ در Scan و AR و صفحه‌های عمیق‌تر خاموش است.
- منو (`components/Drawer/DrawerMenu.tsx`): خانه، مباحث درسی، مسائل حل‌شده (همان History).
- مباحث: داده در `src/content/topics.ts` (۹ مبحث: محاسبات، کسر، توان، ساده‌سازی، معادله‌ی
  درجه‌یک و درجه‌دو، مثلثات، مشتق، انتگرال) و متن‌ها در i18n (`topics.<id>.title/summary/tip`).
  صفحه‌ی `TopicScreen`: توضیح، نکته، نمونه‌ها و دکمه‌ی تمرین.
  - زدن روی نمونه، `ProblemInput` را با همان مسئله پر می‌کند (`initialProblem`). حل با دکمه‌ی خود
    کاربر انجام می‌شود، پس سهمیه و paywall مثل همیشه اعمال می‌شوند.
  - «تمرین» فقط برای نوع‌هایی است که `practice.py` می‌سازد و مثل «تمرین مشابه» صفحه‌ی Solution
    کاربر را به CheckSteps می‌برد.
  - `backend/math-engine/tests/test_topic_examples.py` همه‌ی نمونه‌ها را از همین فایل می‌خواند و حل
    می‌کند؛ مثال جدیدی که engine نفهمد، همان‌جا fail می‌شود.

## ۱۴.۱ نسخه و انتشار در کافه‌بازار

- **نسخه فقط یک جا:** `"version"` در `package.json` (الان `1.0.0`). `android/app/build.gradle`
  از همان `versionName` را می‌سازد و `versionCode = major*10000 + minor*100 + patch`
  (۱.۰.۰ → ۱۰۰۰۰، ۱.۰.۱ → ۱۰۰۰۱). در تنظیمات اپ هم نمایش داده می‌شود (`src/config/version.ts`).
  برای هر آپدیت بازار فقط این عدد را بالا ببر — بازار versionCode تکراری/کمتر را قبول نمی‌کند.
- **کلید امضا (یک بار):**
  ```bash
  keytool -genkeypair -v -storetype PKCS12 -keystore ~/mathmotion-upload.keystore \
    -alias mathmotion -keyalg RSA -keysize 2048 -validity 10000
  ```
  و در `~/.gradle/gradle.properties` (نه داخل پروژه):
  ```
  MATHMOTION_UPLOAD_STORE_FILE=/Users/<you>/mathmotion-upload.keystore
  MATHMOTION_UPLOAD_STORE_PASSWORD=...
  MATHMOTION_UPLOAD_KEY_ALIAS=mathmotion
  MATHMOTION_UPLOAD_KEY_PASSWORD=...
  ```
  این فایل و رمزها را جای امن بک‌آپ بگیر: بدون همین کلید، آپدیت بعدی در بازار ممکن نیست.
- **ساخت:** `cd android && ./gradlew assembleRelease` →
  `android/app/build/outputs/apk/release/app-release.apk` (بازار APK یا AAB هر دو را می‌پذیرد؛
  `./gradlew bundleRelease` → `app-release.aab`).
- **آیکون فروشگاه ۵۱۲×۵۱۲:** `.design/store-icon-512.png` (ریشه‌ی ریپو). آیکون‌های لانچر در
  `android/app/src/main/res/mipmap-*` هستند.

## ۱۵. وضعیت فعلی

| مورد | وضعیت |
|---|---|
| Home (Scan فعال، Type، Recent Problems، سوییچ زبان، FreeSolvesBadge) | ساخته شد |
| Type Problem (پیش‌نمایش parse با debounce، Clear/Solve/Check my steps، Paywall، خطاهای بخش ۳۰) | ساخته شد |
| Solution + Animation Engine (StepViewer، Play/Pause/Replay، Verified badge، Practice similar، Share) | ساخته شد — بخش ۱۰ |
| History (لیست + pull-to-refresh + تپ برای بازکردن Solution) | ساخته شد |
| مانتیزیشن (سهمیه‌ی رایگان + خرید بازار) | ساخته شد — بخش ۶ بالا |
| Scan → Recognize → لیست انتخاب → Solve → AR Solution (بخش ۷/۹.۳، فقط Android) | ساخته شد — تست واقعی روی دستگاه هنوز مونده |
| Check My Steps + Practice Similar (بخش ۹.۱/۹.۲) | ساخته شد — تست واقعی هنوز مونده |
| خروجی راه‌حل به عکس (بخش ۹.۴) | ساخته شد — نیازمند `npm install` + تست دستگاه واقعی |
| Interactive Learning — Quiz Mode (بخش ۲۰ PRD) | ساخته شد — بخش ۱۱، تست دستی هنوز مونده |
| `go test`/`pytest`, `tsc --noEmit`, `eslint`, gradle, jest | نوشته/به‌روزرسانی شد ولی **اجرا نشد** این پاس — طبق تصمیم کاربر، اجرا/تست دست خودشونه |
| iOS برای Scan/AR/Share (`NSCameraUsageDescription`, Viro در Podfile) | عمداً ساخته نشده — تصمیم کاربر، فقط Android |
| تست‌های خودکار سمت موبایل فراتر از smoke test (بخش ۱۲) | ساخته شد — ۵ فایل jest، اجرای واقعی هنوز مونده |
| تست خرید واقعی روی دستگاه با بازار نصب‌شده | ساخته نشده — نیازمند credential های بخش ۶.۳ |
| تست دستی واقعی همه‌ی فیچرهای native (AR، اسکن چندمسئله‌ای، Share، Animation Engine) روی یک دستگاه Android | ساخته نشده — نیازمند دستگاه واقعی و اجرای `npm install` |

**قدم بعدی پیشنهادی:** `npm install` (برای بخش ۹.۴ و بخش ۱۰)، اجرای `pytest`/`go test`/
`tsc`/`eslint`/gradle/`jest` (۵ تست جدید بخش ۱۲ همراه `App.test.tsx`)، سپس تست دستی کامل هر
فیچر جدید (از جمله Animation Engine و Quiz Mode روی صفحه‌ی Solution/Quiz) + Scan → AR روی یک
دستگاه Android واقعی. بعد از آن: iOS، credential های بازار (بخش ۶.۳)، و تصمیم UI/UX نهایی
(`src/theme`).
