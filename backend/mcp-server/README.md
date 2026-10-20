# mathmotion-mcp

سرور MCP که API ادمینِ MathMotion را در اختیار Claude می‌گذارد تا محتوای کم‌وکسر (نکته‌ی کنکوری، تست، سؤال بانک آزمون فصل، تمرین کتاب) پیدا و نوشته شود.

## قانون امنیتی
- هر چیزی که نوشته می‌شود **پیش‌نویس** است و در صف «پیش‌نویس‌ها»ی پنل می‌نشیند؛ تا ادمین در پنل تأیید نکند به اپ نمی‌رسد.
- ویرایشِ یک مورد منتشرشده هم پیش‌نویسی با همان id است که در پنل با «جایگزینی» تأیید می‌شود.
- ابزارِ تأیید، رد، حذف، seed، کاربر، اشتراک و تنظیمات وجود ندارد.

## پیش‌نیاز سرور
endpoint جدید `POST /admin/konkur/drafts` در go-api؛ یعنی قبل از استفاده، `mathmotion-api` را روی سرور دوباره build کن.

## ساخت
```bash
cd backend/mcp-server
go build -o mathmotion-mcp .
```

## اتصال به Claude Code
```bash
claude mcp add mathmotion --scope user \
  -e MATHMOTION_API_URL=https://api.mathmotion.ir \
  -e MATHMOTION_ADMIN_TOKEN='همان ADMIN_TOKEN فایل .env سرور' \
  -- /Users/apple/Desktop/project_go/Ai-solvder/backend/mcp-server/mathmotion-mcp
```
بعد Claude Code را دوباره باز کن و با `/mcp` ببین وصل است.

لیست فصل‌ها از `mobile/MathMotion/src/content/curriculum.ts` و `examSyllabus.ts` خوانده می‌شود (دو پوشه بالاتر از فایل اجرایی). اگر فایل اجرایی جای دیگری است، `MATHMOTION_REPO_DIR` را به ریشه‌ی ریپو بده.

برای تست روی سرور محلی: `MATHMOTION_API_URL=http://localhost:8080`.

## ابزارها
| بخش | ابزار |
|---|---|
| فصل‌ها و کمبودها | list_curriculum, content_health |
| نکته | list_tips, get_tip |
| تست | list_questions, get_question |
| تمرین کتاب | list_exercises, get_exercise |
| پیش‌نویس (تنها راه نوشتن) | create_drafts, list_drafts, get_draft, update_draft |
| کمک AI | generate_question_guide, extract_page, upload_image |
| گزارش | get_ai_usage_report, get_analytics |

## نمونه درخواست‌ها
- «content_health: کدام فصل‌ها آزمون ندارند؟ برای g9_sets ده تست بانک بنویس»
- «برای فصل‌های پایه‌ی دهم که نکته ندارند، نکته‌ی کنکوری بنویس»
- «این PDF کتاب ریاضی نهم را صفحه‌به‌صفحه با extract_page به تمرین تبدیل کن»
- «تست‌هایی که مسیر حل ندارند را پیدا کن و برایشان guide بساز»
