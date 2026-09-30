-- +migrate Up
-- One row per AI call (today: each photo scan, internal/service/vision) —
-- what it cost, for the admin panel's «هزینه‌ی هوش مصنوعی» report, like
-- LingoFlow's ai_daily_usage but per call, so the cost of each scan is
-- visible, not only daily totals. cost_estimated is false when the
-- provider reported the charge itself (OpenRouter's usage.cost), true
-- when it was computed from AI_TOKEN_PRICING.
CREATE TABLE ai_usage (
    id             BIGSERIAL PRIMARY KEY,
    user_id        TEXT REFERENCES users (id) ON DELETE SET NULL,
    feature        TEXT NOT NULL DEFAULT 'scan',
    provider       TEXT NOT NULL,
    model          TEXT NOT NULL DEFAULT '',
    input_tokens   INT  NOT NULL DEFAULT 0,
    output_tokens  INT  NOT NULL DEFAULT 0,
    cost_usd       NUMERIC(14, 8) NOT NULL DEFAULT 0,
    cost_estimated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_created_at ON ai_usage (created_at);

-- +migrate Down
DROP TABLE IF EXISTS ai_usage;
