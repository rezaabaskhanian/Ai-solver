-- +migrate Up
-- One row per solve / scan / step-check, for the admin-configurable usage
-- limits (internal/service/quota). Previously only solves were counted
-- (via problems), so scans and checks were effectively unlimited.
CREATE TABLE usage_events (
    id          BIGSERIAL PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id),
    kind        TEXT NOT NULL CHECK (kind IN ('solve', 'scan', 'check')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usage_events_user_created ON usage_events (user_id, created_at DESC);

-- Existing solves carry over, so switching to the new counter doesn't
-- hand everyone a fresh lifetime quota.
INSERT INTO usage_events (user_id, kind, created_at)
SELECT user_id, 'solve', created_at FROM problems;

-- +migrate Down
DROP TABLE IF EXISTS usage_events;
