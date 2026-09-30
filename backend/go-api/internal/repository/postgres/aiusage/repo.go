// Package postgresaiusage implements [aiusage.Repository] on the ai_usage
// table (migration 010).
package postgresaiusage

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"mathmotion/go-api/internal/service/aiusage"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func (r DB) Insert(ctx context.Context, e aiusage.Entry, costUSD float64, estimated bool) error {
	_, err := r.conn.Exec(ctx, `
		INSERT INTO ai_usage (user_id, feature, provider, model, input_tokens, output_tokens, cost_usd, cost_estimated)
		VALUES (NULLIF($1, ''), $2, $3, $4, $5, $6, $7, $8)
	`, e.UserID, e.Feature, e.Provider, e.Model, e.InputTokens, e.OutputTokens, costUSD, estimated)
	if err != nil {
		return fmt.Errorf("inserting ai usage: %w", err)
	}
	return nil
}

// since limits a query to the last `days` days; days <= 0 means all time.
const since = `($1 <= 0 OR created_at >= now() - make_interval(days => $1))`

func (r DB) Totals(ctx context.Context, days int) (aiusage.Totals, error) {
	var t aiusage.Totals
	err := r.conn.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(input_tokens), 0), COALESCE(SUM(output_tokens), 0),
		       COALESCE(SUM(cost_usd), 0)::float8
		  FROM ai_usage WHERE `+since, days).Scan(&t.Calls, &t.InputTokens, &t.OutputTokens, &t.CostUSD)
	if err != nil {
		return t, fmt.Errorf("ai usage totals: %w", err)
	}
	return t, nil
}

func (r DB) Daily(ctx context.Context, days int) ([]aiusage.Day, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT created_at::date::text, COUNT(*), COALESCE(SUM(input_tokens), 0),
		       COALESCE(SUM(output_tokens), 0), COALESCE(SUM(cost_usd), 0)::float8
		  FROM ai_usage WHERE `+since+`
		 GROUP BY 1 ORDER BY 1 DESC`, days)
	if err != nil {
		return nil, fmt.Errorf("ai usage daily: %w", err)
	}
	defer rows.Close()
	out := []aiusage.Day{}
	for rows.Next() {
		var d aiusage.Day
		if err := rows.Scan(&d.Date, &d.Calls, &d.InputTokens, &d.OutputTokens, &d.CostUSD); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r DB) Models(ctx context.Context, days int) ([]aiusage.ModelTotals, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT provider, model, COUNT(*), COALESCE(SUM(input_tokens), 0),
		       COALESCE(SUM(output_tokens), 0), COALESCE(SUM(cost_usd), 0)::float8
		  FROM ai_usage WHERE `+since+`
		 GROUP BY provider, model ORDER BY 6 DESC`, days)
	if err != nil {
		return nil, fmt.Errorf("ai usage by model: %w", err)
	}
	defer rows.Close()
	out := []aiusage.ModelTotals{}
	for rows.Next() {
		var m aiusage.ModelTotals
		if err := rows.Scan(&m.Provider, &m.Model, &m.Calls, &m.InputTokens, &m.OutputTokens, &m.CostUSD); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r DB) Recent(ctx context.Context, limit int) ([]aiusage.Call, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT to_char(created_at, 'YYYY-MM-DD HH24:MI'), COALESCE(user_id, ''), feature, provider, model,
		       input_tokens, output_tokens, cost_usd::float8, cost_estimated
		  FROM ai_usage ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("recent ai usage: %w", err)
	}
	defer rows.Close()
	out := []aiusage.Call{}
	for rows.Next() {
		var c aiusage.Call
		if err := rows.Scan(&c.CreatedAt, &c.UserID, &c.Feature, &c.Provider, &c.Model,
			&c.InputTokens, &c.OutputTokens, &c.CostUSD, &c.CostEstimated); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
