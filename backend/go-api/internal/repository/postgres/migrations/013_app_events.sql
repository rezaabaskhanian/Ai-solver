-- +migrate Up
-- Self-hosted crash / error / usage reporting (internal/service/telemetry).
-- One row per event the mobile app sends to POST /api/v1/telemetry.
-- No phone numbers or tokens are stored (stripped from `extra` server-side).
CREATE TABLE app_events (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id     TEXT,
    device_id   TEXT NOT NULL DEFAULT '',
    kind        TEXT NOT NULL CHECK (kind IN ('crash', 'error', 'screen', 'event')),
    name        TEXT NOT NULL DEFAULT '',
    message     TEXT NOT NULL DEFAULT '',
    stack       TEXT NOT NULL DEFAULT '',
    screen      TEXT NOT NULL DEFAULT '',
    app_version TEXT NOT NULL DEFAULT '',
    platform    TEXT NOT NULL DEFAULT '',
    os_version  TEXT NOT NULL DEFAULT '',
    extra       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_app_events_created_at ON app_events (created_at);
CREATE INDEX idx_app_events_kind_created ON app_events (kind, created_at DESC);
CREATE INDEX idx_app_events_device_created ON app_events (device_id, created_at);

-- +migrate Down
DROP TABLE IF EXISTS app_events;
