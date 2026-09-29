# دیپلوی MathMotion روی سرور aramina (کنار LingoFlow)

سرور: ۱ vCPU، حدود ۲ گیگ RAM، مشترک با LingoFlow و wallpaper، پشت Traefik (`aramina_traefik`،
شبکه‌ی `arama_aramina_net`، entrypoint `web`). SSL را آروان می‌دهد.

## ۱. DNS در آروان
دو رکورد A به IP سرور، با پروکسی آروان روشن (مثل دامنه‌های LingoFlow):
- `api.mathmotion.ir` (همان `API_HOST`)
- `admin.mathmotion.ir` (همان `ADMIN_HOST`)

حالت ارتباط آروان با سرور (origin) باید **HTTP** باشد، مثل LingoFlow، چون Traefik فقط روی پورت 80
(entrypoint `web`) گوش می‌دهد.

## ۲. گرفتن کد
```bash
cd ~
git clone https://github.com/rezaabaskhanian/Ai-solver.git
cd Ai-solver/backend
```

## ۳. فایل `.env`
```bash
cp .env.prod.example .env
openssl rand -hex 32     # خروجی را برای ADMIN_TOKEN بگذار
openssl rand -hex 16     # خروجی را برای DB_PASSWORD بگذار
nano .env                # API_HOST، ADMIN_HOST، DB_PASSWORD، ADMIN_TOKEN
```

## ۴. build یکی‌یکی
روی ۱ هسته build همزمان همه‌ی سرویس‌ها سرور را سنگین می‌کند. بهتر است یکی‌یکی و در ساعت کم‌ترافیک انجام شود:
```bash
docker compose -f docker-compose.prod.yaml build mathmotion-xray
docker compose -f docker-compose.prod.yaml build mathmotion-math-engine
docker compose -f docker-compose.prod.yaml build mathmotion-api
docker compose -f docker-compose.prod.yaml build mathmotion-admin
```

## ۵. اجرا
```bash
docker compose -f docker-compose.prod.yaml up -d
docker compose -f docker-compose.prod.yaml ps
docker logs -f mathmotion_api_prod     # باید "applied N migrations" و بعد استارت echo را ببینی
```

## ۶. تست
```bash
curl -H "Host: <API_HOST>" http://localhost/health        # از خود سرور، از طریق Traefik
```
سپس در مرورگر `https://<API_HOST>/health` و `https://<ADMIN_HOST>` را باز کن.

## ۷. پنل ادمین
1. با `ADMIN_TOKEN` وارد شو.
2. تب «پراکسی Xray»: همان لینک `vless://` که LingoFlow استفاده می‌کند را بچسبان و «اتصال» را بزن.
   باید IP سرور Xray خارجی نمایش داده شود.
3. تب «هوش مصنوعی»: provider را انتخاب کن و کلید و مدل را بگذار.

## ۸. پاک‌سازی دیسک
build cache روی دیسک می‌ماند (فقط ۶.۵ گیگ آزاد بود):
```bash
docker builder prune -f
docker image prune -f
df -h /
```

## به‌روزرسانی‌های بعدی
```bash
cd ~/Ai-solver && git pull
cd backend
docker compose -f docker-compose.prod.yaml build <سرویسی که عوض شده>
docker compose -f docker-compose.prod.yaml up -d <همان سرویس>
docker builder prune -f --filter 'type!=exec.cachemount'
```
فیلتر `type!=exec.cachemount` کش کامپایلر Go (`--mount=type=cache` در `go-api/Dockerfile`) را نگه
می‌دارد؛ بدون آن build بعدی `mathmotion-api` دوباره همه‌ی وابستگی‌ها را از صفر کامپایل می‌کند (~۶ دقیقه).

## مصرف منابع
```bash
docker stats --no-stream | grep -E 'mathmotion|shadowing'
free -h
```
اگر swap مدام بالا رفت یا لینگوفلو کند شد، Ai-solver را به یک سرور جدا ببر.
