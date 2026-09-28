# یادداشت کار — آخرین وضعیت و قدم‌های بعدی

> این فایل خلاصه‌ی «تا کجا رسیدیم و بعدش چیکار کنیم»ه، برای وقتی برمی‌گردیم سراغ پروژه.
> جزئیات فنی کامل هر فیچر توی همون مستندات همیشگی‌ان: [`FEATURES.md`](FEATURES.md) (وضعیت کلی)،
> [`backend/BACKEND.md`](backend/BACKEND.md)، [`mobile/MathMotion/APP.md`](mobile/MathMotion/APP.md).
> آخرین به‌روزرسانی: ۲۵ شهریور ۱۴۰۵ (۲۰۲۶-۰۹-۱۵).

---

## ۱. کارهایی که این چند پاس انجام شد

### ۱.۱ اصلاح حدسی خطاهای OCR/تایپی (بک‌اند)
- `backend/math-engine/app/solver/parser.py` — وقتی parse مستقیم شکست می‌خوره، حروف OCR-confusable
  تک‌حرفی (`S O I l B Z G g`) رو با رقم احتمالی‌شون جایگزین و دوباره امتحان می‌کنه؛ فقط اگه دقیقاً
  یک نتیجه‌ی غیرمبهم پیدا بشه، با confidence پایین (`0.6`) قبول می‌شه.
- جزئیات کامل: `backend/BACKEND.md` بخش ۷.۵. تست: ۶ مورد جدید در `test_parser.py`.

### ۱.۲ Animation Engine + Play/Pause/Replay (موبایل)
- با **Reanimated** ساخته شد (نه Skia — دلیلش در `APP.md` بخش ۱۰). هر step با ۶ مرحله‌ی متوالی
  نمایش داده می‌شه: قبل → فلش → برچسب عملیات → فلش → بعد → توضیح.
- کنترل‌های Play/Pause/Replay کنار Previous/Next، هم روی Solution و هم AR Solution.
- فایل‌های کلیدی: `src/components/StepViewer/{animationTiming,FadeInStage,OperationBadge}.ts(x)`،
  `src/hooks/useStepNavigation.ts` (بازنویسی‌شده با playback state).
- **نیاز به `npm install`** (پکیج جدید `react-native-reanimated` + پلاگین بابل).

### ۱.۳ Interactive Learning — Quiz Mode (موبایل)
- دکمه‌ی «با کوییز یاد بگیر» روی صفحه‌ی تایپ مسئله؛ کاملاً سمت موبایل، بدون اندپوینت جدید بک‌اند.
- فایل‌های کلیدی: `src/screens/Quiz/QuizScreen.tsx`، `src/components/Quiz/{quizChoices,QuizChoice}`.
- جزئیات: `APP.md` بخش ۱۱.

### ۱.۴ تست‌های خودکار موبایل فراتر از smoke test
- ۵ فایل jest جدید (منطق pure: tokenize، OperationBadge، quizChoices، apiError،
  useStepNavigation با fake timers).
- **نکته‌ی مهم:** `jest.setup.js` باید `react-native-reanimated` رو mock کنه وگرنه حتی
  `App.test.tsx` هم می‌شکنه (چون `RootNavigator` همه‌ی صفحه‌ها رو eager import می‌کنه).
- جزئیات: `APP.md` بخش ۱۲.

### ۱.۵ پراکسی خروجی Xray (VLESS+Reality) برای فراخوانی‌های Claude Vision (بک‌اند)
- مشکل: اگه IP سرور دیپلوی از سمت Anthropic بلاک بشه، «Scan Problem» می‌شکنه.
- ساخته شد: `internal/pkg/outboundhttp` (کلاینت HTTP با/بدون SOCKS5)، `internal/service/proxy`
  (پارس vless + ساخت کانفیگ Xray + تست اتصال واقعی)، اندپوینت `POST /admin/proxy` (پشت
  `PROXY_ADMIN_TOKEN`)، سایدکار Docker (`backend/deploy/xray/`)، `docker-compose.prod.yaml` جدید.
- جزئیات کامل + مثال curl: [`backend/docs/xray-proxy-setup.md`](backend/docs/xray-proxy-setup.md).
- **این فقط زیرساخت سمت ریپوئه — خودِ سرور Xray (VPS، نصب xray-core، کلید Reality) هنوز راه‌اندازی
  نشده؛ کاربر قراره خودش انجامش بده.**

### ۱.۶ پنل ادمین (مثل LingoFlow) + چند provider برای Vision
- `backend/admin-panel/` (Next.js 14، همان ظاهر پنل LingoFlow). دو تب دارد: «هوش مصنوعی» و «پراکسی Xray».
- بک‌اند: جدول `app_settings` (migration 004)، `internal/service/settings` (کش + fallback به env + refresh هر ۳۰ ثانیه)،
  `GET/PUT /admin/settings`، `GET /admin/proxy/status`، و CORS برای پنل (`ADMIN_PANEL_ORIGINS`).
- `internal/service/vision` حالا در هر درخواست `AI_PROVIDER` را می‌خواند: `anthropic` (SDK)،
  `openrouter` یا `deepseek` (هر دو Chat Completions سازگار با OpenAI + تصویر به‌صورت data URL).
- ورود پنل با توکن ثابت `ADMIN_TOKEN` است (`PROXY_ADMIN_TOKEN` قدیمی هم پذیرفته می‌شود).
- **ریسک باز:** API رسمی DeepSeek ممکن است تصویر نپذیرد. برای vision، OpenRouter امن‌تر است.

---

## ۲. قدم‌های بعدی (به ترتیب منطقی)

### فوری — قبل از هر چیز دیگه
- [ ] `cd backend/go-api && go mod tidy` — چون `golang.org/x/net` دستی از indirect به direct
      منتقل شد (برای `outboundhttp`)، باید verify بشه.
- [ ] `cd mobile/MathMotion && npm install` — برای `react-native-reanimated`.
- [ ] `cd backend/admin-panel && npm install && npm run dev` و ست کردن `ADMIN_TOKEN` در `.env` بک‌اند.
- [ ] اجرای `pytest` (math-engine)، `go test ./...` (go-api)، `tsc --noEmit`، `eslint`، `jest`
      (موبایل) — هیچ‌کدوم این چند پاس اجرا نشدن (تصمیم قبلی: تست/اجرا دست خود کاربره).

### راه‌اندازی پراکسی Xray (بخش ۱.۵ بالا)
- [ ] یه VPS خارج از ایران تهیه کن، Xray-core نصب کن، کلید Reality بساز، لینک `vless://` تولید
      کن (این بخش کاملاً دستیه، کدی براش نوشته نشده).
- [ ] `docker compose -f backend/docker-compose.prod.yaml up --build` با env های لازم
      (`ANTHROPIC_API_KEY`, `PROXY_ADMIN_TOKEN`, `DB_PASSWORD`, ...).
- [ ] تست `POST /admin/proxy` با لینک واقعی (مثال curl در `xray-proxy-setup.md`).
- [ ] یه فراخوانی واقعی Scan Problem رو از اپ تست کن تا مطمئن بشی از پشت تونل رد می‌شه.

### تست دستی روی دستگاه واقعی (Android)
- [ ] Scan → Recognize → AR Solution
- [ ] Check My Steps + Practice Similar
- [ ] خروجی راه‌حل به عکس + Share
- [ ] Animation Engine (Play/Pause/Replay) + Quiz Mode

### موارد باقی‌مونده‌ی قدیمی‌تر (از `FEATURES.md`)
- [ ] تست خرید واقعی با بازار نصب‌شده — نیاز به credential پیشخان (بخش ۶.۳ `APP.md`)
- [ ] Auth واقعی (OTP/OAuth) — عمداً فاز بعدی، MVP فعلی device-scoped بدون login
- [ ] iOS برای Scan/AR/Share — عمداً خارج از اسکوپ فعلی
- [ ] هندسه / حساب دیفرانسیل و انتگرال پیشرفته / گراف توابع — فاز ۳، خارج از MVP

---

## ۳. نقشه‌ی سریع مستندات

| سند | محتوا |
|---|---|
| `FEATURES.md` | جدول کامل وضعیت هر فیچر (✅/❌/⚙️) |
| `PRD.md` | چشم‌انداز و اسپک اصلی محصول |
| `backend/BACKEND.md` | معماری بک‌اند + تصمیم‌های فنی هر بخش |
| `backend/docs/xray-proxy-setup.md` | راهنمای پراکسی خروجی Xray |
| `mobile/MathMotion/APP.md` | معماری موبایل + تصمیم‌های فنی هر بخش |
