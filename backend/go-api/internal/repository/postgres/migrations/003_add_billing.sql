-- +migrate Up
ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE purchases (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id),
    product_id     TEXT NOT NULL,
    purchase_token TEXT NOT NULL UNIQUE,
    verified_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +migrate Down
DROP TABLE IF EXISTS purchases;
ALTER TABLE users DROP COLUMN is_premium;
