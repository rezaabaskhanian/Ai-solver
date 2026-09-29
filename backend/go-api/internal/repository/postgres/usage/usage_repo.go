// Package postgresusage stores usage_events for internal/service/quota.
package postgresusage

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"mathmotion/go-api/internal/service/quota"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

// CountUsage implements [quota.Repository].
func (r DB) CountUsage(ctx context.Context, userID string, kinds []quota.Kind, since time.Time) (int, error) {
	names := make([]string, len(kinds))
	for i, k := range kinds {
		names[i] = string(k)
	}
	var count int
	err := r.conn.QueryRow(ctx, `
		SELECT COUNT(*) FROM usage_events
		WHERE user_id = $1 AND kind = ANY($2) AND created_at >= $3
	`, userID, names, since).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting usage: %w", err)
	}
	return count, nil
}

// RecordUsage implements [quota.Repository].
func (r DB) RecordUsage(ctx context.Context, userID string, kind quota.Kind) error {
	if _, err := r.conn.Exec(ctx,
		`INSERT INTO usage_events (user_id, kind) VALUES ($1, $2)`, userID, string(kind),
	); err != nil {
		return fmt.Errorf("recording usage: %w", err)
	}
	return nil
}
