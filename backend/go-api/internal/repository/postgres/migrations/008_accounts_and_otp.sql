-- +migrate Up
-- Accounts, the same way LingoFlow (Shadowing-backend) does them: sign up
-- with nickname + phone + password after an SMS code proves the phone,
-- then log in with phone + password (JWT). A registered account is still a
-- users row — signing up on a device turns that device's anonymous user
-- into the account, so its history and subscription carry over. The
-- existing `name` column holds the nickname.
ALTER TABLE users
    ADD COLUMN phone         TEXT,
    ADD COLUMN password_hash TEXT;

CREATE UNIQUE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;

-- SMS verification codes (sign-up and password reset). Each row is a
-- short-lived code; once verified it gets a one-time token that
-- register / reset-pass must present to prove the phone was confirmed.
-- Same table as LingoFlow's migration 022.
CREATE TABLE otp_codes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone            TEXT NOT NULL,
    purpose          TEXT NOT NULL CHECK (purpose IN ('register', 'reset')),
    code             TEXT NOT NULL,
    attempts         INT  NOT NULL DEFAULT 0,
    expires_at       TIMESTAMPTZ NOT NULL,
    verified_at      TIMESTAMPTZ,
    token            TEXT,
    token_expires_at TIMESTAMPTZ,
    consumed_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_phone_purpose ON otp_codes (phone, purpose, created_at DESC);
CREATE UNIQUE INDEX idx_otp_codes_token ON otp_codes (token) WHERE token IS NOT NULL;

-- +migrate Down
DROP TABLE IF EXISTS otp_codes;
DROP INDEX IF EXISTS idx_users_phone;
ALTER TABLE users
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS password_hash;
