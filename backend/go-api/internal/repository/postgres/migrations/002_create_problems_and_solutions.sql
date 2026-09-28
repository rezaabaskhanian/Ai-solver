-- +migrate Up
CREATE TABLE problems (
    id                     TEXT PRIMARY KEY,
    user_id                TEXT NOT NULL REFERENCES users(id),
    raw_input              TEXT NOT NULL,
    normalized_expression  TEXT NOT NULL,
    problem_type           TEXT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_problems_user_created ON problems (user_id, created_at DESC);

CREATE TABLE solutions (
    id          TEXT PRIMARY KEY,
    problem_id  TEXT NOT NULL REFERENCES problems(id),
    answer      TEXT NOT NULL,
    verified    BOOLEAN NOT NULL,
    steps       JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solutions_problem ON solutions (problem_id);

-- +migrate Down
DROP TABLE IF EXISTS solutions;
DROP TABLE IF EXISTS problems;
