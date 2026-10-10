// Package postgrestelemetry implements [telemetry.Repository] on the
// app_events table (migration 013).
package postgrestelemetry

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"mathmotion/go-api/internal/service/telemetry"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func (r DB) Insert(ctx context.Context, events []telemetry.Event) error {
	batch := &pgx.Batch{}
	for _, e := range events {
		extra, err := json.Marshal(e.Extra)
		if err != nil {
			extra = []byte("{}")
		}
		batch.Queue(`
			INSERT INTO app_events (created_at, user_id, device_id, kind, name, message, stack,
			                        screen, app_version, platform, os_version, extra)
			VALUES ($1, NULLIF($2, ''), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
			e.CreatedAt, e.UserID, e.DeviceID, e.Kind, e.Name, e.Message, e.Stack,
			e.Screen, e.AppVersion, e.Platform, e.OSVersion, string(extra))
	}
	res := r.conn.SendBatch(ctx, batch)
	defer res.Close()
	for range events {
		if _, err := res.Exec(); err != nil {
			return fmt.Errorf("inserting app event: %w", err)
		}
	}
	return nil
}

func (r DB) CountByKind(ctx context.Context, since time.Time) (map[string]int, error) {
	rows, err := r.conn.Query(ctx, `SELECT kind, COUNT(*) FROM app_events WHERE created_at >= $1 GROUP BY kind`, since)
	if err != nil {
		return nil, fmt.Errorf("telemetry counts: %w", err)
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var k string
		var n int
		if err := rows.Scan(&k, &n); err != nil {
			return nil, err
		}
		out[k] = n
	}
	return out, rows.Err()
}

const storedCols = `id, created_at, COALESCE(user_id, ''), device_id, kind, name, message, stack,
	screen, app_version, platform, os_version, extra`

func scanStored(rows pgx.Rows) ([]telemetry.Stored, error) {
	defer rows.Close()
	out := []telemetry.Stored{}
	for rows.Next() {
		var s telemetry.Stored
		var extra []byte
		if err := rows.Scan(&s.ID, &s.CreatedAt, &s.UserID, &s.DeviceID, &s.Kind, &s.Name, &s.Message,
			&s.Stack, &s.Screen, &s.AppVersion, &s.Platform, &s.OSVersion, &extra); err != nil {
			return nil, err
		}
		s.Extra = map[string]any{}
		if len(extra) > 0 {
			_ = json.Unmarshal(extra, &s.Extra)
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r DB) ErrorEvents(ctx context.Context, since time.Time, limit int) ([]telemetry.Stored, error) {
	rows, err := r.conn.Query(ctx, `SELECT `+storedCols+` FROM app_events
		WHERE kind IN ('crash', 'error') AND created_at >= $1
		ORDER BY created_at DESC LIMIT $2`, since, limit)
	if err != nil {
		return nil, fmt.Errorf("telemetry errors: %w", err)
	}
	return scanStored(rows)
}

func (r DB) TopScreens(ctx context.Context, since time.Time, limit int) ([]telemetry.ScreenCount, error) {
	rows, err := r.conn.Query(ctx, `SELECT screen, COUNT(*) FROM app_events
		WHERE kind = 'screen' AND screen <> '' AND created_at >= $1
		GROUP BY screen ORDER BY 2 DESC, 1 LIMIT $2`, since, limit)
	if err != nil {
		return nil, fmt.Errorf("telemetry screens: %w", err)
	}
	defer rows.Close()
	out := []telemetry.ScreenCount{}
	for rows.Next() {
		var s telemetry.ScreenCount
		if err := rows.Scan(&s.Screen, &s.Views); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r DB) DailyActiveDevices(ctx context.Context, since time.Time) (map[string]int, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT (created_at AT TIME ZONE 'UTC')::date::text, COUNT(DISTINCT device_id)
		  FROM app_events WHERE device_id <> '' AND created_at >= $1 GROUP BY 1`, since)
	if err != nil {
		return nil, fmt.Errorf("telemetry daily active: %w", err)
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var d string
		var n int
		if err := rows.Scan(&d, &n); err != nil {
			return nil, err
		}
		out[d] = n
	}
	return out, rows.Err()
}

func (r DB) Recent(ctx context.Context, kind, q string, limit int) ([]telemetry.Stored, error) {
	rows, err := r.conn.Query(ctx, `SELECT `+storedCols+` FROM app_events
		WHERE ($1 = '' OR kind = $1)
		  AND ($2 = '' OR strpos(lower(name || ' ' || message || ' ' || screen), lower($2)) > 0)
		ORDER BY created_at DESC, id DESC LIMIT $3`, kind, q, limit)
	if err != nil {
		return nil, fmt.Errorf("telemetry recent: %w", err)
	}
	return scanStored(rows)
}

func (r DB) Purge(ctx context.Context, olderThan time.Time) (int64, error) {
	tag, err := r.conn.Exec(ctx, `DELETE FROM app_events WHERE created_at < $1`, olderThan)
	if err != nil {
		return 0, fmt.Errorf("telemetry purge: %w", err)
	}
	return tag.RowsAffected(), nil
}
