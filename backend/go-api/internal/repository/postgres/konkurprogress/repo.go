// Package postgreskonkurprogress implements [konkurprogress.Repository] on
// the konkur_progress and konkur_exam_results tables (migration 012).
package postgreskonkurprogress

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	kp "mathmotion/go-api/internal/service/konkurprogress"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func (r DB) GetProgress(ctx context.Context, userID string) (kp.Doc, error) {
	var d kp.Doc
	var raw []byte
	err := r.conn.QueryRow(ctx,
		`SELECT revision, updated_at, data FROM konkur_progress WHERE user_id = $1`, userID).
		Scan(&d.Revision, &d.UpdatedAt, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return kp.Doc{}, kp.ErrNotFound
	}
	if err != nil {
		return kp.Doc{}, fmt.Errorf("reading konkur progress: %w", err)
	}
	d.Data = json.RawMessage(raw)
	return d, nil
}

func (r DB) SaveProgress(ctx context.Context, userID string, baseRevision int64, data json.RawMessage) (kp.Doc, error) {
	var d kp.Doc
	var raw []byte
	var err error
	if baseRevision == 0 {
		// First save: only succeeds if no row exists yet.
		err = r.conn.QueryRow(ctx, `
			INSERT INTO konkur_progress (user_id, data, revision, updated_at)
			VALUES ($1, $2::jsonb, 1, now())
			ON CONFLICT (user_id) DO NOTHING
			RETURNING revision, updated_at, data`, userID, []byte(data)).
			Scan(&d.Revision, &d.UpdatedAt, &raw)
	} else {
		err = r.conn.QueryRow(ctx, `
			UPDATE konkur_progress
			SET data = $2::jsonb, revision = revision + 1, updated_at = now()
			WHERE user_id = $1 AND revision = $3
			RETURNING revision, updated_at, data`, userID, []byte(data), baseRevision).
			Scan(&d.Revision, &d.UpdatedAt, &raw)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return kp.Doc{}, kp.ErrConflict
	}
	if err != nil {
		return kp.Doc{}, fmt.Errorf("saving konkur progress: %w", err)
	}
	d.Data = json.RawMessage(raw)
	return d, nil
}

func (r DB) UpsertExamResult(ctx context.Context, userID string, e kp.ExamResult) error {
	_, err := r.conn.Exec(ctx, `
		INSERT INTO konkur_exam_results (user_id, paper_key, percent, correct, wrong, blank, seconds)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id, paper_key) DO UPDATE
		SET percent = EXCLUDED.percent, correct = EXCLUDED.correct, wrong = EXCLUDED.wrong,
		    blank = EXCLUDED.blank, seconds = EXCLUDED.seconds, updated_at = now()
		WHERE EXCLUDED.percent > konkur_exam_results.percent`,
		userID, e.PaperKey, e.Percent, e.Correct, e.Wrong, e.Blank, e.Seconds)
	if err != nil {
		return fmt.Errorf("saving konkur exam result: %w", err)
	}
	return nil
}

func (r DB) PaperStats(ctx context.Context, paperKey, userID string) (kp.PaperStats, error) {
	var st kp.PaperStats
	err := r.conn.QueryRow(ctx, `
		SELECT count(*),
		       COALESCE(percentile_cont(0.5)  WITHIN GROUP (ORDER BY percent), 0),
		       COALESCE(percentile_cont(0.25) WITHIN GROUP (ORDER BY percent), 0),
		       COALESCE(percentile_cont(0.75) WITHIN GROUP (ORDER BY percent), 0)
		FROM konkur_exam_results WHERE paper_key = $1`, paperKey).
		Scan(&st.Count, &st.Median, &st.P25, &st.P75)
	if err != nil {
		return kp.PaperStats{}, fmt.Errorf("reading konkur exam stats: %w", err)
	}

	var mine float64
	err = r.conn.QueryRow(ctx,
		`SELECT percent FROM konkur_exam_results WHERE paper_key = $1 AND user_id = $2`,
		paperKey, userID).Scan(&mine)
	if errors.Is(err, pgx.ErrNoRows) {
		return st, nil
	}
	if err != nil {
		return kp.PaperStats{}, fmt.Errorf("reading own konkur exam result: %w", err)
	}
	var others, lower int
	err = r.conn.QueryRow(ctx, `
		SELECT count(*), count(*) FILTER (WHERE percent < $3)
		FROM konkur_exam_results WHERE paper_key = $1 AND user_id <> $2`,
		paperKey, userID, mine).Scan(&others, &lower)
	if err != nil {
		return kp.PaperStats{}, fmt.Errorf("computing konkur percentile: %w", err)
	}
	p := 0.0
	if others > 0 {
		p = float64(lower) * 100 / float64(others)
	}
	st.Percentile = &p
	return st, nil
}

func (r DB) AdminStats(ctx context.Context) ([]kp.PaperSummary, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT paper_key, count(*), avg(percent), max(percent)
		FROM konkur_exam_results GROUP BY paper_key ORDER BY paper_key DESC`)
	if err != nil {
		return nil, fmt.Errorf("listing konkur exam stats: %w", err)
	}
	defer rows.Close()
	var out []kp.PaperSummary
	for rows.Next() {
		var s kp.PaperSummary
		if err := rows.Scan(&s.PaperKey, &s.Count, &s.AveragePercent, &s.BestPercent); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
