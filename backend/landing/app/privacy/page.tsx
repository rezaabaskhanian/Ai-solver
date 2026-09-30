import type { Metadata } from "next";

const SUPPORT_EMAIL = "rezaabaskhanian1367kash@gmail.com";

export const metadata: Metadata = {
  title: "سیاست حریم خصوصی — MathMotion",
  description: "اطلاعاتی که اپلیکیشن MathMotion جمع‌آوری می‌کند و نحوه‌ی استفاده از آن",
};

export default function PrivacyPage() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="navpill">
            <a href="/" className="brand">
              <span className="brand-dot" />
              MathMotion
            </a>
          </div>
        </div>
      </header>

      <main className="wrap privacy">
        <span className="eyebrow">حریم خصوصی</span>
        <h1>سیاست حریم خصوصی MathMotion</h1>
        <p className="privacy-updated">آخرین به‌روزرسانی: مهر ۱۴۰۵</p>

        <h2>اطلاعاتی که جمع‌آوری می‌کنیم</h2>
        <ul>
          <li>
            <strong>شماره‌ی موبایل و نام:</strong> برای ثبت‌نام و ورود با کد تأیید پیامکی، و تا اشتراک
            و تاریخچه‌ی شما روی هر گوشی در دسترس باشد.
          </li>
          <li>
            <strong>مسئله‌هایی که حل می‌کنید:</strong> متن مسئله و راه‌حل آن ذخیره می‌شود تا در بخش
            «تاریخچه» دوباره ببینیدش.
          </li>
          <li>
            <strong>عکس مسئله:</strong> وقتی از مسئله عکس می‌گیرید، عکس فقط برای تشخیص متن مسئله فرستاده
            می‌شود و روی سرور ما ذخیره نمی‌شود.
          </li>
          <li>
            <strong>شناسه‌ی دستگاه و آمار استفاده:</strong> برای محاسبه‌ی سهمیه‌ی رایگان روزانه.
          </li>
        </ul>

        <h2>استفاده از سرویس‌های هوش مصنوعی</h2>
        <p>
          برای خواندن متن مسئله از روی عکس، عکس برای پردازش به ارائه‌دهندگان سرویس هوش مصنوعی فرستاده
          می‌شود. حل خود مسئله با موتور ریاضی خود MathMotion انجام می‌شود. این اطلاعات فقط برای ارائه‌ی
          همان خدمت استفاده می‌شود.
        </p>

        <h2>پرداخت</h2>
        <p>
          پرداخت‌ها از طریق کافه‌بازار انجام می‌شود و ما به اطلاعات کارت بانکی شما دسترسی نداریم.
        </p>

        <h2>اشتراک‌گذاری اطلاعات</h2>
        <p>ما اطلاعات شما را نمی‌فروشیم و برای تبلیغات در اختیار دیگران قرار نمی‌دهیم.</p>

        <h2>حذف حساب</h2>
        <p>
          برای حذف حساب و همه‌ی اطلاعاتتان، از همان شماره‌ای که با آن ثبت‌نام کرده‌اید به{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> پیام بدهید.
        </p>

        <h2>تماس با ما</h2>
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} MathMotion</span>
            <a href="/">mathmotion.ir</a>
          </div>
        </div>
      </footer>
    </>
  );
}
