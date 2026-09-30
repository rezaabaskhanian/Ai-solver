-- +migrate Up
-- The mathmotion.ir landing page, managed from the admin panel's
-- «صفحه‌ی معرفی» tab — the same tables as LingoFlow (Shadowing-backend
-- migrations 023 + 024):
--   landing_settings    one row: hero, download links, closing banner
--   landing_highlights  icon/title/text cards: kind 'feature' («چرا
--                       MathMotion») or 'step' («چطور کار می‌کنه»)
--   landing_sections    extra text + screenshots blocks
--   landing_faqs        frequently asked questions
-- Seeded with starter content so the page isn't empty before it's edited.

CREATE TABLE landing_settings (
    id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    hero_title      TEXT NOT NULL DEFAULT '',
    hero_subtitle   TEXT NOT NULL DEFAULT '',
    hero_image_url  TEXT NOT NULL DEFAULT '',
    google_play_url TEXT NOT NULL DEFAULT '',
    bazaar_url      TEXT NOT NULL DEFAULT '',
    cta_title       TEXT NOT NULL DEFAULT '',
    cta_subtitle    TEXT NOT NULL DEFAULT '',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO landing_settings (id, hero_title, hero_subtitle, bazaar_url, cta_title, cta_subtitle)
VALUES (
    1,
    'حل قدم‌به‌قدم ریاضی با یک عکس',
    'از مسئله عکس بگیر یا تایپش کن؛ MathMotion مثل یک معلم خصوصی، راه‌حل رو مرحله‌به‌مرحله و با توضیح فارسی نشونت می‌ده — از معادله و مشتق تا حد، لگاریتم و رسم نمودار.',
    'https://cafebazaar.ir/app/com.mathmotion',
    'همین حالا ریاضی رو آسون کن',
    'MathMotion رو رایگان نصب کن و اولین مسئله‌ات رو حل کن.'
);

CREATE TABLE landing_highlights (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind        TEXT NOT NULL CHECK (kind IN ('feature', 'step')),
    icon        TEXT NOT NULL DEFAULT '',
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    position    INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_highlights_kind ON landing_highlights (kind, position);

INSERT INTO landing_highlights (kind, icon, title, description, position) VALUES
    ('feature', '📸', 'اسکن با دوربین', 'از مسئله‌ی دست‌نویس یا کتاب عکس بگیر؛ خودش تشخیص می‌ده و حل می‌کنه.', 1),
    ('feature', '🪜', 'قدم‌به‌قدم مثل کتاب درسی', 'هر مرحله با توضیح فارسی، دقیقاً به روشی که سر کلاس یاد گرفتی.', 2),
    ('feature', '✅', 'جواب تأییدشده', 'هر جواب دوباره در مسئله جای‌گذاری و بررسی می‌شه تا مطمئن باشی درسته.', 3),
    ('step', '✍️', 'مسئله رو بده', 'عکس بگیر یا با صفحه‌کلید ریاضی تایپش کن.', 1),
    ('step', '🧮', 'راه‌حل رو ببین', 'مراحل حل، یکی‌یکی و با انیمیشن نمایش داده می‌شن.', 2),
    ('step', '🎯', 'تمرین کن', 'با کوییز و آزمون، همون مبحث رو خودت حل کن.', 3);

CREATE TABLE landing_sections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tab_label   TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    position    INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE landing_section_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES landing_sections (id) ON DELETE CASCADE,
    image_url  TEXT NOT NULL,
    position   INT  NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_section_images_section_id ON landing_section_images (section_id);

INSERT INTO landing_sections (tab_label, title, description, position) VALUES
    ('مباحث', 'از معادله تا رسم نمودار',
     'معادله‌ی درجه یک و دو، عبارت‌های جبری و مثلثاتی، مشتق و انتگرال، حد، لگاریتم، مجموعه‌ها، بردار، هندسه و رسم نمودار تابع — مطابق کتاب‌های درسی ایران.', 1);

CREATE TABLE landing_faqs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question   TEXT NOT NULL,
    answer     TEXT NOT NULL DEFAULT '',
    position   INT  NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO landing_faqs (question, answer, position) VALUES
    ('MathMotion رایگانه؟', 'بله؛ هر روز چند حل رایگان داری. برای حل نامحدود می‌تونی اشتراک پرمیوم رو از کافه‌بازار بگیری.', 1),
    ('جواب‌ها چقدر دقیقن؟', 'حل با یک موتور ریاضی دقیق انجام می‌شه، نه حدس هوش مصنوعی؛ و هر جواب دوباره در مسئله بررسی می‌شه.', 2),
    ('اگه گوشیم رو عوض کنم اشتراکم چی می‌شه؟', 'اشتراک به حساب کاربریت (شماره موبایل) وصله؛ روی گوشی جدید وارد شو، همه‌چیز برمی‌گرده.', 3);

-- +migrate Down
DROP TABLE IF EXISTS landing_faqs;
DROP TABLE IF EXISTS landing_section_images;
DROP TABLE IF EXISTS landing_sections;
DROP TABLE IF EXISTS landing_highlights;
DROP TABLE IF EXISTS landing_settings;
