-- +migrate Up
-- The drawn curve of a "function_plot" solve (math-engine solver/plot.py),
-- kept so History can reopen it without calling the engine again. NULL for
-- every other problem type.
ALTER TABLE solutions ADD COLUMN plot JSONB;

-- +migrate Down
ALTER TABLE solutions DROP COLUMN IF EXISTS plot;
