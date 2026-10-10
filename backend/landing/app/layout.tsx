import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مجهول — حل قدم‌به‌قدم ریاضی با یک عکس",
  description:
    "اپلیکیشن حل مسئله‌ی ریاضی: از مسئله عکس بگیر یا تایپش کن و راه‌حل قدم‌به‌قدم با توضیح فارسی بگیر — معادله، مشتق، انتگرال، حد، لگاریتم و رسم نمودار.",
  metadataBase: new URL("https://mathmotion.ir"),
  openGraph: {
    title: "مجهول — حل قدم‌به‌قدم ریاضی",
    description: "از مسئله عکس بگیر؛ راه‌حل قدم‌به‌قدم با توضیح فارسی.",
    url: "https://mathmotion.ir",
    siteName: "مجهول",
    locale: "fa_IR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lalezar&family=Vazirmatn:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
