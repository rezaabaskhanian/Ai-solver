-- +migrate Up
-- Konkur progress sync and exam results.
--   konkur_progress      one JSONB document per user (attempts per question,
--                        bookmarks) the app merges and syncs; revision is
--                        the optimistic-concurrency counter
--   konkur_exam_results  best result of a timed full-year exam per user and
--                        paper_key — feeds the approximate rank on the
--                        result screen and the admin panel's stats

CREATE TABLE konkur_progress (
    user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data       JSONB NOT NULL,
    revision   BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE konkur_exam_results (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_key  TEXT NOT NULL,
    percent    DOUBLE PRECISION NOT NULL,
    correct    INT NOT NULL DEFAULT 0,
    wrong      INT NOT NULL DEFAULT 0,
    blank      INT NOT NULL DEFAULT 0,
    seconds    INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, paper_key)
);

CREATE INDEX konkur_exam_results_paper_idx ON konkur_exam_results (paper_key, percent);

-- +migrate Down
DROP TABLE IF EXISTS konkur_exam_results;
DROP TABLE IF EXISTS konkur_progress;
