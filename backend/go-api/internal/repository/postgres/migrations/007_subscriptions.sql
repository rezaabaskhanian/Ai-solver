-- +migrate Up
-- Time-limited Premium (monthly etc. plans bought from Cafe Bazaar, or days
-- granted from the admin panel) next to the old one-time lifetime unlock
-- (is_premium, kept for everyone who already bought it). See
-- internal/service/billing.
--
--   code           short id the app shows in Settings, so a user can tell
--                  the operator who they are (there's no login).
--   premium_until  Premium is active while this is in the future.
--   is_unlimited   no limits at all, not even the Premium daily scan cap —
--                  only ever set from the admin panel.
ALTER TABLE users
    ADD COLUMN code          TEXT,
    ADD COLUMN premium_until TIMESTAMPTZ,
    ADD COLUMN is_unlimited  BOOLEAN NOT NULL DEFAULT false;

UPDATE users SET code = upper(substr(md5(id), 1, 8)) WHERE code IS NULL;
CREATE UNIQUE INDEX idx_users_code ON users (code);

-- One row per Cafe Bazaar in-app product: buying product_id adds
-- duration_days of Premium. Editable from the admin panel; product_id must
-- match the SKU created in Bazaar's developer panel (Pishkhan).
CREATE TABLE subscription_plans (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    duration_days INT  NOT NULL CHECK (duration_days > 0),
    price_toman   INT  NOT NULL DEFAULT 0 CHECK (price_toman >= 0),
    product_id    TEXT NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO subscription_plans (id, name, duration_days, price_toman, product_id)
VALUES ('plan_1m', 'یک ماهه', 30, 0, 'mathmotion_1m');

-- How many days each verified purchase added (0 for the lifetime unlock),
-- for the admin panel's sales numbers.
ALTER TABLE purchases ADD COLUMN days_granted INT NOT NULL DEFAULT 0;

-- +migrate Down
ALTER TABLE purchases DROP COLUMN IF EXISTS days_granted;
DROP TABLE IF EXISTS subscription_plans;
DROP INDEX IF EXISTS idx_users_code;
ALTER TABLE users
    DROP COLUMN IF EXISTS code,
    DROP COLUMN IF EXISTS premium_until,
    DROP COLUMN IF EXISTS is_unlimited;
