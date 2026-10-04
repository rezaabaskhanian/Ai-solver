-- +migrate Up
-- «نکات کنکوری»: tips and multiple-choice questions, moved out of the
-- mobile app bundle (mobile/MathMotion/src/content/konkur) so they can be
-- edited from the admin panel and fetched by the app.
--   konkur_tips / konkur_questions  one JSONB document per item, in the
--                                   exact camelCase shape of the app's
--                                   KonkurTip / KonkurQuestion types
--                                   (figure -> figureUrl)
--   konkur_drafts                   AI-extracted (or hand-made) items that
--                                   wait for review; invisible to the app
--   konkur_meta                     one row: a counter bumped on every
--                                   change, the app's cache/ETag version

CREATE TABLE konkur_tips (
    id         TEXT PRIMARY KEY,
    position   INT NOT NULL DEFAULT 0,
    data       JSONB NOT NULL,
    published  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE konkur_questions (
    id         TEXT PRIMARY KEY,
    position   INT NOT NULL DEFAULT 0,
    data       JSONB NOT NULL,
    published  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE konkur_drafts (
    id          TEXT PRIMARY KEY,
    kind        TEXT NOT NULL CHECK (kind IN ('question', 'tip')),
    source_name TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    data        JSONB NOT NULL,
    warnings    JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_konkur_drafts_status ON konkur_drafts (status, created_at);

CREATE TABLE konkur_meta (
    id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    version    BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO konkur_meta (id, version) VALUES (1, 1);

-- +migrate Down
DROP TABLE IF EXISTS konkur_meta;
DROP TABLE IF EXISTS konkur_drafts;
DROP TABLE IF EXISTS konkur_questions;
DROP TABLE IF EXISTS konkur_tips;
