# پنل ادمین MathMotion (Next.js)

پنل مدیریت سمت سرور، با همان ساختار و ظاهر پنل ادمین LingoFlow (`Shadowing-backend/admin-panel`).
دو تب دارد:

- **هوش مصنوعی**: انتخاب ارائه‌دهنده‌ی فعال برای Scan Problem (Claude / OpenRouter / DeepSeek)،
  و ثبت کلید API و مدل هر کدام. تغییرها بدون ری‌استارت سرور، از درخواست بعدی اعمال می‌شوند.
- **پراکسی Xray**: چسباندن لینک `vless://`، اتصال، و تست وضعیت (IP / کشور / ISP خروجی).

## پیش‌نیاز
- go-api در حال اجرا (پیش‌فرض `http://localhost:8080`) با `ADMIN_TOKEN` ست‌شده در `.env`
- Node.js نسخه‌ی ۱۸ به بالا

## راه‌اندازی
```bash
cd backend/admin-panel
cp .env.local.example .env.local   # در صورت نیاز NEXT_PUBLIC_API_URL را عوض کن
npm install
npm run dev
```
سپس مرورگر: **http://localhost:3000** → توکن ادمین (`ADMIN_TOKEN`) را وارد کن.

## ورود
کاربر ادمین جدا نداریم (MVP کاربر device-scoped است). ورود با همان Bearer token ثابتِ
`ADMIN_TOKEN` انجام می‌شود که `middleware.Admin` روی همه‌ی `/admin/*` چک می‌کند. توکن در
localStorage مرورگر نگه داشته می‌شود. `PROXY_ADMIN_TOKEN` (نام قدیمی) هنوز پذیرفته می‌شود.

## متغیرهای محیطی مرتبط در go-api
| متغیر | کاربرد |
|---|---|
| `ADMIN_TOKEN` | توکن ورود پنل و همه‌ی `/admin/*` (خالی = همه‌ی آن‌ها `503`) |
| `ADMIN_PANEL_ORIGINS` | originهای مجاز پنل برای CORS، با کاما (پیش‌فرض `http://localhost:3000`) |
| `AI_PROVIDER` | `anthropic` (پیش‌فرض) / `openrouter` / `deepseek` |
| `ANTHROPIC_API_KEY`، `OPENROUTER_API_KEY`، `DEEPSEEK_API_KEY` | کلیدها |
| `CLAUDE_MODEL`، `OPENROUTER_MODEL`، `DEEPSEEK_MODEL` | مدل‌ها (خالی = پیش‌فرض) |

هر مقداری که از پنل ذخیره شود (جدول `app_settings`، migration ۰۰۴) بر مقدار `.env` اولویت دارد.
هر instance از go-api هر ۳۰ ثانیه تنظیمات را از دیتابیس دوباره می‌خواند.

## اندپوینت‌ها (همه با `Authorization: Bearer <ADMIN_TOKEN>`)
| متد | مسیر | کار |
|---|---|---|
| `GET` | `/admin/settings` | وضعیت provider، کلیدهای ماسک‌شده و مدل‌ها |
| `PUT` | `/admin/settings` | `{"key": "...", "value": "..."}` برای ذخیره‌ی یک کلید |
| `POST` | `/admin/proxy` | `{"vless_link": "vless://..."}` → نوشتن کانفیگ Xray + تست اتصال |
| `GET` | `/admin/proxy/status` | تست زنده‌ی اتصال + آخرین لینک ثبت‌شده |

## نکته درباره‌ی DeepSeek
Scan Problem عکس می‌فرستد (فرمت `image_url` سازگار با OpenAI). اگر مدلِ انتخاب‌شده در API رسمی
DeepSeek ورودی تصویر نپذیرد، اسکن خطا می‌دهد و پیام خطای خودِ DeepSeek در لاگ سرور دیده می‌شود.
برای مدل‌های vision بهتر است از OpenRouter استفاده شود.

## دیپلوی
سرویس `admin-panel` در `backend/docker-compose.prod.yaml` تعریف شده. `ADMIN_PANEL_API_URL` باید
آدرسی از go-api باشد که **مرورگر** به آن دسترسی دارد (در زمان build داخل باندل قرار می‌گیرد)، و
origin خودِ پنل باید در `ADMIN_PANEL_ORIGINS` باشد.
