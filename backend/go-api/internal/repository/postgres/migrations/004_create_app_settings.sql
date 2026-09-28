-- +migrate Up
-- Runtime-editable settings (AI provider/keys/models, last Xray link) the
-- admin panel writes via PUT /admin/settings — see internal/service/settings.
CREATE TABLE app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +migrate Down
DROP TABLE IF EXISTS app_settings;
