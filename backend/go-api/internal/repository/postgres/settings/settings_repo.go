package postgressettings

import (
	"context"
	"fmt"
)

// GetAll implements [settings.Repository].
func (r DB) GetAll(ctx context.Context) (map[string]string, error) {
	rows, err := r.conn.Query(ctx, `SELECT key, value FROM app_settings`)
	if err != nil {
		return nil, fmt.Errorf("querying app_settings: %w", err)
	}
	defer rows.Close()

	result := map[string]string{}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, fmt.Errorf("scanning app_settings row: %w", err)
		}
		result[k] = v
	}
	return result, rows.Err()
}

// Set implements [settings.Repository] (upsert).
func (r DB) Set(ctx context.Context, key, value string) error {
	const query = `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ($1, $2, now())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
	`
	if _, err := r.conn.Exec(ctx, query, key, value); err != nil {
		return fmt.Errorf("upserting app_settings %q: %w", key, err)
	}
	return nil
}
