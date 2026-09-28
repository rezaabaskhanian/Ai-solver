# پراکسی خروجی Xray (VLESS + Reality) برای فراخوانی‌های AI

## چرا این وجود داره

`backend/go-api` برای «اسکن مسئله» یک عکس رو مستقیم به Claude Vision (`internal/service/vision`)
می‌فرسته. اگه IP سروری که go-api روش دیپلوی شده از سمت Anthropic بلاک/محدود بشه (رفتار شناخته‌شده‌ی
خیلی از دیتاسنترها/ASNها)، این فراخوانی شکست می‌خوره — کل «Scan Problem» از کار می‌افته، بدون اینکه
ربطی به کد یا API key داشته باشه.

راه‌حل همون الگوییه که برای پراکسی خروجی سایر پروژه‌ها استفاده شده: یک سرور Xray اختصاصی (VLESS +
**Reality**، بدون نیاز به CDN/دامنه)، به‌علاوه‌ی یک سایدکار محلی که ترافیک خروجی go-api رو از توش
رد می‌کنه.

**این سند فقط زیرساخت سمت این ریپو رو پوشش می‌ده.** راه‌اندازی خودِ سرور Xray (تهیه‌ی VPS، نصب
xray-core، ساخت کلید Reality، نوشتن کانفیگ سمت سرور) کار جداییه که این‌جا مستند نشده — فرض بر اینه
که یه لینک `vless://...` با `security=reality` از یه سرور از‌قبل راه‌اندازی‌شده در دست داری.

## معماری

```
go-api (internal/pkg/outboundhttp)
   │  AI_OUTBOUND_PROXY=socks5://xray:1080
   ▼
xray sidecar (deploy/xray) ──VLESS+Reality──► سرور Xray خودت (جای دیگه)
```

- **`internal/pkg/outboundhttp`** — می‌سازه `*http.Client`ای که اگه `AI_OUTBOUND_PROXY` خالی باشه
  مستقیم dial می‌کنه (پیش‌فرض)، وگرنه هر اتصالی رو از یه SOCKS5 (سایدکار Xray) رد می‌کنه.
  `cmd/api/main.go` این کلاینت رو با `option.WithHTTPClient` به `visionservice.NewClient` پاس
  می‌ده — خودِ `vision.Client` هیچ ایده‌ای از پراکسی نداره.
- **`internal/service/proxy`** — یه لینک `vless://` رو پارس می‌کنه (`vless.go`)، کانفیگ JSON کلاینت
  Xray رو می‌سازه (`xrayconfig.go`)، و توی `service.go`، این کانفیگ رو روی یه volume مشترک با
  سایدکار می‌نویسه و بعد از یه مکث کوتاه (تا سایدکار ری‌لود کنه) یه درخواست واقعی از تونل رد می‌کنه
  تا مطمئن بشه واقعاً کار می‌کنه — نه فقط اینکه parse شده.
- **`deploy/xray/`** — Dockerfile (بیلد از باینری رسمی release، نه یه ایمیج آماده‌ی شخص ثالث) +
  `watch.sh` که با یه کانفیگ placeholder (direct passthrough) شروع می‌کنه و هر وقت فایل کانفیگ
  عوض بشه، بعد از اعتبارسنجی (`xray run -test`) خودش رو با کانفیگ جدید ری‌استارت می‌کنه.
- **`docker-compose.prod.yaml`** — سرویس `xray` + یک named volume (`xray-config`) که بین `go-api`
  و `xray` مشترکه.

## متغیرهای محیطی (`go-api`)

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `AI_OUTBOUND_PROXY` | خالی (مستقیم dial می‌کنه) | باید `socks5://xray:1080` باشه تا فراخوانی‌های Claude Vision از سایدکار رد بشن |
| `ADMIN_TOKEN` (یا نام قدیمی `PROXY_ADMIN_TOKEN`) | خالی (اندپوینت غیرفعال، همیشه `503`) | Bearer token لازم برای `POST /admin/proxy` و بقیه‌ی `/admin/*`. همین کار از تب «پراکسی Xray» در پنل ادمین (`backend/admin-panel`) هم انجام می‌شود |
| `XRAY_CONFIG_PATH` | `/etc/xray/config.json` | مسیر فایل کانفیگی که هم go-api می‌نویسه هم سایدکار می‌خونه (باید روی یک volume مشترک باشن) |

## استفاده — `POST /admin/proxy`

اندپوینتیه که لینک `vless://` رو می‌گیره، کانفیگ سایدکار رو می‌نویسه، و یه تست اتصال واقعی
(`GET https://ipinfo.io/json` از پشتِ تونل) انجام می‌ده. بیرون از گروه `/api/v1` است — یعنی جزو
API موبایل نیست، فقط یک ابزار عملیاتی برای اپراتوره.

```bash
curl -X POST https://<your-host>/admin/proxy \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vless_link": "vless://<uuid>@<server-ip>:443?security=reality&sni=www.microsoft.com&fp=chrome&pbk=<public-key>&sid=&type=tcp&flow=xtls-rprx-vision"
  }'
```

پاسخ موفق:

```json
{ "connected": true, "ip": "<IP سرور Xray خودت>" }
```

پاسخ ناموفق (لینک معتبره ولی تونل کار نمی‌کنه — سرور خاموشه، کلید اشتباهه، و مانند این):

```json
{ "connected": false, "error": "..." }
```

لینک‌های پشتیبانی‌شده: `security` یکی از `reality` / `tls` / `none`، و `type` یکی از `tcp` / `ws` /
`grpc` / `httpupgrade` / `xhttp` — یعنی هم Reality روی سرور اختصاصی، هم لینک‌های معمول
VLESS+TLS پشت CDN (مثل لینک LingoFlow). برای `tls` اگه `sni` نباشه، از `host` و بعد آدرس سرور
استفاده می‌شه.

تست اتصال به‌ترتیب `ipinfo.io`، `api.ipify.org` و `api.myip.com` رو امتحان می‌کنه، چون این
سرویس‌ها به‌ازای هر IP محدودیت نرخ دارن (مثلاً `429` از ipinfo وقتی پروژه‌های دیگه‌ی همون سرور
سهمیه رو مصرف کرده باشن).

یه لینک بدشکل (نه `vless://`، `security`/`type` پشتیبانی‌نشده، یا reality بدون `sni`/`pbk`) به‌جای این، یه `422`
با `{"error": "invalid_input", "message": "..."}` برمی‌گردونه — یعنی خودِ درخواست رد شده، حتی
تلاشی برای نوشتن کانفیگ هم نشده.

**نکته:** این endpoint فقط سایدکار Xray رو کانفیگ می‌کنه. برای اینکه فراخوانی‌های واقعی Claude
Vision هم از توش رد بشن، `AI_OUTBOUND_PROXY=socks5://xray:1080` باید روی `go-api` ست شده باشه
(در `docker-compose.prod.yaml` از قبل هست) — نتیجه‌ی این endpoint فقط می‌گه تونل کار می‌کنه یا نه،
عوض کردن مقصد ترافیک AI با تنظیم همون env var انجام می‌شه که همیشه به همون سایدکار اشاره می‌کنه.

## عیب‌یابی

```bash
docker logs <xray-container> --tail 60
docker exec <go-api-container> wget -qO- --timeout=15 https://ipinfo.io/json
```

اگه `watch.sh` می‌گه کانفیگ جدید validation رو رد کرده، لاگش دقیقاً همون خروجی `xray run -test`
رو نشون می‌ده — معمولاً یعنی یکی از `sni`/`pbk`/`uuid` تو لینک اشتباهه.
