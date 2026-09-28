-- +migrate Up
CREATE TABLE users (
    id         TEXT PRIMARY KEY,
    device_id  TEXT NOT NULL UNIQUE,
    name       TEXT,
    email      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +migrate Down
DROP TABLE IF EXISTS users;
