// Package postgreskonkur implements [konkurservice.Repository] on the
// konkur_* tables (migration 011).
package postgreskonkur

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	konkur "mathmotion/go-api/internal/service/konkur"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

// execer is what both the pool and a transaction offer.
type execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// withTx runs fn in a transaction, committing only if it succeeds.
func (r DB) withTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	tx, err := r.conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// bump increments the version the app uses as its cache key.
func bump(ctx context.Context, tx execer) error {
	_, err := tx.Exec(ctx, `UPDATE konkur_meta SET version = version + 1, updated_at = now() WHERE id = 1`)
	return err
}

func (r DB) Version(ctx context.Context) (int64, error) {
	var v int64
	if err := r.conn.QueryRow(ctx, `SELECT version FROM konkur_meta WHERE id = 1`).Scan(&v); err != nil {
		return 0, fmt.Errorf("reading konkur version: %w", err)
	}
	return v, nil
}

// ---------- tips ----------

func (r DB) readTips(ctx context.Context, onlyPublished bool) ([]konkur.Tip, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT data FROM konkur_tips
		 WHERE ($1 = FALSE OR published)
		 ORDER BY position, id
	`, onlyPublished)
	if err != nil {
		return nil, fmt.Errorf("listing konkur tips: %w", err)
	}
	defer rows.Close()
	tips := []konkur.Tip{}
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil {
			return nil, err
		}
		var t konkur.Tip
		if err := json.Unmarshal(data, &t); err != nil {
			return nil, fmt.Errorf("decoding konkur tip: %w", err)
		}
		tips = append(tips, t)
	}
	return tips, rows.Err()
}

func (r DB) ListTips(ctx context.Context) ([]konkur.Tip, error) {
	return r.readTips(ctx, false)
}

func (r DB) SaveTip(ctx context.Context, t konkur.Tip, mode konkur.SaveMode) error {
	data, err := json.Marshal(t)
	if err != nil {
		return err
	}
	return r.withTx(ctx, func(tx pgx.Tx) error {
		if err := saveTip(ctx, tx, t.ID, data, mode, 0); err != nil {
			return err
		}
		return bump(ctx, tx)
	})
}

// saveTip writes one tip. position > 0 sets it explicitly (import);
// otherwise a new tip goes last and an existing one keeps its place.
func saveTip(ctx context.Context, tx execer, id string, data []byte, mode konkur.SaveMode, position int) error {
	switch mode {
	case konkur.ModeReplace:
		tag, err := tx.Exec(ctx, `UPDATE konkur_tips SET data = $2, published = TRUE, updated_at = now() WHERE id = $1`, id, data)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrNotFound
		}
		return nil
	case konkur.ModeUpsert:
		_, err := tx.Exec(ctx, `
			INSERT INTO konkur_tips (id, position, data, published)
			SELECT $1::text, CASE WHEN $3::int > 0 THEN $3::int ELSE COALESCE(MAX(position), 0) + 1 END, $2::jsonb, TRUE FROM konkur_tips
			ON CONFLICT (id) DO UPDATE SET
				position = CASE WHEN $3::int > 0 THEN $3::int ELSE konkur_tips.position END,
				data = EXCLUDED.data, published = TRUE, updated_at = now()
		`, id, data, position)
		return err
	default:
		tag, err := tx.Exec(ctx, `
			INSERT INTO konkur_tips (id, position, data, published)
			SELECT $1::text, COALESCE(MAX(position), 0) + 1, $2::jsonb, TRUE FROM konkur_tips
			ON CONFLICT (id) DO NOTHING
		`, id, data)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrExists
		}
		return nil
	}
}

func (r DB) DeleteTip(ctx context.Context, id string) error {
	return r.withTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM konkur_tips WHERE id = $1`, id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrNotFound
		}
		return bump(ctx, tx)
	})
}

// ---------- questions ----------

func scanQuestions(rows pgx.Rows) ([]konkur.Question, error) {
	defer rows.Close()
	qs := []konkur.Question{}
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil {
			return nil, err
		}
		var q konkur.Question
		if err := json.Unmarshal(data, &q); err != nil {
			return nil, fmt.Errorf("decoding konkur question: %w", err)
		}
		qs = append(qs, q)
	}
	return qs, rows.Err()
}

func (r DB) ListQuestions(ctx context.Context, f konkur.QuestionFilter) ([]konkur.Question, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT data FROM konkur_questions
		 WHERE ($1::text = '' OR data->'source'->>'year' = $1::text)
		   AND ($2::text = '' OR data->'source'->>'track' = $2::text)
		   AND ($3::text = '' OR data->'tipIds' @> to_jsonb($3::text))
		   AND ($4::text = '' OR data::text ILIKE '%' || $4::text || '%')
		 ORDER BY id
	`, f.Year, f.Track, f.TipID, f.Query)
	if err != nil {
		return nil, fmt.Errorf("listing konkur questions: %w", err)
	}
	return scanQuestions(rows)
}

func (r DB) SaveQuestion(ctx context.Context, q konkur.Question, mode konkur.SaveMode) error {
	data, err := json.Marshal(q)
	if err != nil {
		return err
	}
	return r.withTx(ctx, func(tx pgx.Tx) error {
		if err := saveQuestion(ctx, tx, q.ID, data, mode, 0); err != nil {
			return err
		}
		return bump(ctx, tx)
	})
}

func saveQuestion(ctx context.Context, tx execer, id string, data []byte, mode konkur.SaveMode, position int) error {
	switch mode {
	case konkur.ModeReplace:
		tag, err := tx.Exec(ctx, `UPDATE konkur_questions SET data = $2, published = TRUE, updated_at = now() WHERE id = $1`, id, data)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrNotFound
		}
		return nil
	case konkur.ModeUpsert:
		_, err := tx.Exec(ctx, `
			INSERT INTO konkur_questions (id, position, data, published) VALUES ($1::text, $3::int, $2::jsonb, TRUE)
			ON CONFLICT (id) DO UPDATE SET
				position = CASE WHEN $3::int > 0 THEN $3::int ELSE konkur_questions.position END,
				data = EXCLUDED.data, published = TRUE, updated_at = now()
		`, id, data, position)
		return err
	default:
		tag, err := tx.Exec(ctx, `
			INSERT INTO konkur_questions (id, position, data, published) VALUES ($1::text, $3::int, $2::jsonb, TRUE)
			ON CONFLICT (id) DO NOTHING
		`, id, data, position)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrExists
		}
		return nil
	}
}

func (r DB) DeleteQuestion(ctx context.Context, id string) error {
	return r.withTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM konkur_questions WHERE id = $1`, id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrNotFound
		}
		return bump(ctx, tx)
	})
}

// ---------- published snapshot + import ----------

func (r DB) Published(ctx context.Context) ([]konkur.Tip, []konkur.Question, error) {
	tips, err := r.readTips(ctx, true)
	if err != nil {
		return nil, nil, err
	}
	rows, err := r.conn.Query(ctx, `SELECT data FROM konkur_questions WHERE published ORDER BY id`)
	if err != nil {
		return nil, nil, fmt.Errorf("listing published konkur questions: %w", err)
	}
	qs, err := scanQuestions(rows)
	if err != nil {
		return nil, nil, err
	}
	return tips, qs, nil
}

func (r DB) Import(ctx context.Context, tips []konkur.Tip, questions []konkur.Question) error {
	return r.withTx(ctx, func(tx pgx.Tx) error {
		for i, t := range tips {
			data, err := json.Marshal(t)
			if err != nil {
				return err
			}
			if err := saveTip(ctx, tx, t.ID, data, konkur.ModeUpsert, i+1); err != nil {
				return fmt.Errorf("importing tip %q: %w", t.ID, err)
			}
		}
		for i, q := range questions {
			data, err := json.Marshal(q)
			if err != nil {
				return err
			}
			if err := saveQuestion(ctx, tx, q.ID, data, konkur.ModeUpsert, i+1); err != nil {
				return fmt.Errorf("importing question %q: %w", q.ID, err)
			}
		}
		return bump(ctx, tx)
	})
}

// ---------- drafts ----------

const draftColumns = `id, kind, source_name, status, data, warnings, created_at`

func scanDraft(row pgx.Row) (konkur.Draft, error) {
	var (
		d        konkur.Draft
		data     []byte
		warnings []byte
	)
	if err := row.Scan(&d.ID, &d.Kind, &d.SourceName, &d.Status, &data, &warnings, &d.CreatedAt); err != nil {
		return d, err
	}
	d.Data = json.RawMessage(data)
	d.Warnings = []string{}
	if len(warnings) > 0 {
		if err := json.Unmarshal(warnings, &d.Warnings); err != nil {
			return d, fmt.Errorf("decoding draft warnings: %w", err)
		}
		if d.Warnings == nil {
			d.Warnings = []string{}
		}
	}
	return d, nil
}

func (r DB) InsertDrafts(ctx context.Context, drafts []konkur.Draft) ([]konkur.Draft, error) {
	saved := make([]konkur.Draft, 0, len(drafts))
	err := r.withTx(ctx, func(tx pgx.Tx) error {
		for _, d := range drafts {
			warnings, err := json.Marshal(d.Warnings)
			if err != nil {
				return err
			}
			row, err := scanDraft(tx.QueryRow(ctx, `
				INSERT INTO konkur_drafts (id, kind, source_name, status, data, warnings)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING `+draftColumns,
				d.ID, d.Kind, d.SourceName, d.Status, []byte(d.Data), warnings))
			if err != nil {
				return fmt.Errorf("inserting draft: %w", err)
			}
			saved = append(saved, row)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return saved, nil
}

func (r DB) ListDrafts(ctx context.Context, status string) ([]konkur.Draft, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT `+draftColumns+` FROM konkur_drafts
		 WHERE ($1::text = '' OR status = $1::text)
		 ORDER BY created_at, id
	`, status)
	if err != nil {
		return nil, fmt.Errorf("listing konkur drafts: %w", err)
	}
	defer rows.Close()
	drafts := []konkur.Draft{}
	for rows.Next() {
		d, err := scanDraft(rows)
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, d)
	}
	return drafts, rows.Err()
}

func (r DB) GetDraft(ctx context.Context, id string) (konkur.Draft, error) {
	d, err := scanDraft(r.conn.QueryRow(ctx, `SELECT `+draftColumns+` FROM konkur_drafts WHERE id = $1`, id))
	if err == pgx.ErrNoRows {
		return d, konkur.ErrNotFound
	}
	return d, err
}

func (r DB) UpdateDraft(ctx context.Context, id string, data json.RawMessage, warnings []string) (konkur.Draft, error) {
	w, err := json.Marshal(warnings)
	if err != nil {
		return konkur.Draft{}, err
	}
	d, err := scanDraft(r.conn.QueryRow(ctx, `
		UPDATE konkur_drafts SET data = $2, warnings = $3 WHERE id = $1
		RETURNING `+draftColumns, id, []byte(data), w))
	if err == pgx.ErrNoRows {
		return d, konkur.ErrNotFound
	}
	return d, err
}

func (r DB) RejectDraft(ctx context.Context, id string) error {
	tag, err := r.conn.Exec(ctx, `UPDATE konkur_drafts SET status = 'rejected' WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return konkur.ErrNotFound
	}
	return nil
}

func (r DB) ApproveDraft(ctx context.Context, id string, tip *konkur.Tip, question *konkur.Question, overwrite bool) error {
	mode := konkur.ModeCreate
	if overwrite {
		mode = konkur.ModeUpsert
	}
	return r.withTx(ctx, func(tx pgx.Tx) error {
		switch {
		case tip != nil:
			data, err := json.Marshal(tip)
			if err != nil {
				return err
			}
			if err := saveTip(ctx, tx, tip.ID, data, mode, 0); err != nil {
				return err
			}
		case question != nil:
			data, err := json.Marshal(question)
			if err != nil {
				return err
			}
			if err := saveQuestion(ctx, tx, question.ID, data, mode, 0); err != nil {
				return err
			}
		default:
			return fmt.Errorf("approve draft %s: nothing to publish", id)
		}
		if err := bump(ctx, tx); err != nil {
			return err
		}
		tag, err := tx.Exec(ctx, `UPDATE konkur_drafts SET status = 'approved' WHERE id = $1`, id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrNotFound
		}
		return nil
	})
}
