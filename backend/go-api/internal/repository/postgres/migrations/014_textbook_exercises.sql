-- +migrate Up
-- «تمرین‌های کتاب»: the official textbooks' exercises (statement as in the
-- book, solution written by us), edited from the admin panel next to the
-- konkur content and fetched by the app from GET /api/v1/public/textbook.
--   textbook_exercises  one JSONB document per exercise, in the exact
--                       camelCase shape of the app's TextbookExercise type;
--                       book_id / chapter_id are copied out for filtering
--   konkur_drafts       AI-extracted exercises wait for review here too
--                       (kind 'exercise')
-- Every change bumps konkur_meta.version, the same cache key as konkur.

CREATE TABLE textbook_exercises (
    id         TEXT PRIMARY KEY,
    book_id    TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    position   INT NOT NULL DEFAULT 0,
    data       JSONB NOT NULL,
    published  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_textbook_exercises_chapter ON textbook_exercises (book_id, chapter_id, position);

ALTER TABLE konkur_drafts DROP CONSTRAINT IF EXISTS konkur_drafts_kind_check;
ALTER TABLE konkur_drafts ADD CONSTRAINT konkur_drafts_kind_check
    CHECK (kind IN ('question', 'tip', 'exercise'));

-- +migrate Down
DELETE FROM konkur_drafts WHERE kind = 'exercise';
ALTER TABLE konkur_drafts DROP CONSTRAINT IF EXISTS konkur_drafts_kind_check;
ALTER TABLE konkur_drafts ADD CONSTRAINT konkur_drafts_kind_check
    CHECK (kind IN ('question', 'tip'));
DROP TABLE IF EXISTS textbook_exercises;
