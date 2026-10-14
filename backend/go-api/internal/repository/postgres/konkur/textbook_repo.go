package postgreskonkur

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"

	konkur "mathmotion/go-api/internal/service/konkur"
)

// «تمرین‌های کتاب» on textbook_exercises (migration 014). Ordered by
// book, chapter, then position (page order as added), then id.

func scanExercises(rows pgx.Rows) ([]konkur.Exercise, error) {
	defer rows.Close()
	ex := []konkur.Exercise{}
	for rows.Next() {
		var data []byte
		if err := rows.Scan(&data); err != nil {
			return nil, err
		}
		var e konkur.Exercise
		if err := json.Unmarshal(data, &e); err != nil {
			return nil, fmt.Errorf("decoding textbook exercise: %w", err)
		}
		ex = append(ex, e)
	}
	return ex, rows.Err()
}

func (r DB) PublishedExercises(ctx context.Context) ([]konkur.Exercise, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT data FROM textbook_exercises
		 WHERE published
		 ORDER BY book_id, chapter_id, position, id
	`)
	if err != nil {
		return nil, fmt.Errorf("listing published textbook exercises: %w", err)
	}
	return scanExercises(rows)
}

func (r DB) ListExercises(ctx context.Context, f konkur.ExerciseFilter) ([]konkur.Exercise, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT data FROM textbook_exercises
		 WHERE ($1::text = '' OR book_id = $1::text)
		   AND ($2::text = '' OR chapter_id = $2::text)
		   AND ($3::text = '' OR data::text ILIKE '%' || $3::text || '%')
		 ORDER BY book_id, chapter_id, position, id
	`, f.BookID, f.ChapterID, f.Query)
	if err != nil {
		return nil, fmt.Errorf("listing textbook exercises: %w", err)
	}
	return scanExercises(rows)
}

// saveExercise writes one exercise. position > 0 sets it explicitly
// (import); otherwise its page * 100 + number keeps the book's order.
func saveExercise(ctx context.Context, tx execer, e konkur.Exercise, mode konkur.SaveMode, position int) error {
	data, err := json.Marshal(e)
	if err != nil {
		return err
	}
	if position <= 0 {
		position = e.Page*100 + e.Number
	}
	switch mode {
	case konkur.ModeReplace:
		tag, err := tx.Exec(ctx, `
			UPDATE textbook_exercises
			   SET book_id = $2, chapter_id = $3, position = $4, data = $5, published = TRUE, updated_at = now()
			 WHERE id = $1
		`, e.ID, e.BookID, e.ChapterID, position, data)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrNotFound
		}
		return nil
	case konkur.ModeUpsert:
		_, err := tx.Exec(ctx, `
			INSERT INTO textbook_exercises (id, book_id, chapter_id, position, data, published)
			VALUES ($1, $2, $3, $4, $5, TRUE)
			ON CONFLICT (id) DO UPDATE SET
				book_id = EXCLUDED.book_id, chapter_id = EXCLUDED.chapter_id, position = EXCLUDED.position,
				data = EXCLUDED.data, published = TRUE, updated_at = now()
		`, e.ID, e.BookID, e.ChapterID, position, data)
		return err
	default:
		tag, err := tx.Exec(ctx, `
			INSERT INTO textbook_exercises (id, book_id, chapter_id, position, data, published)
			VALUES ($1, $2, $3, $4, $5, TRUE)
			ON CONFLICT (id) DO NOTHING
		`, e.ID, e.BookID, e.ChapterID, position, data)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrExists
		}
		return nil
	}
}

func (r DB) SaveExercise(ctx context.Context, e konkur.Exercise, mode konkur.SaveMode) error {
	return r.withTx(ctx, func(tx pgx.Tx) error {
		if err := saveExercise(ctx, tx, e, mode, 0); err != nil {
			return err
		}
		return bump(ctx, tx)
	})
}

func (r DB) DeleteExercise(ctx context.Context, id string) error {
	return r.withTx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM textbook_exercises WHERE id = $1`, id)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return konkur.ErrNotFound
		}
		return bump(ctx, tx)
	})
}

func (r DB) ImportExercises(ctx context.Context, exercises []konkur.Exercise) error {
	return r.withTx(ctx, func(tx pgx.Tx) error {
		for _, e := range exercises {
			if err := saveExercise(ctx, tx, e, konkur.ModeUpsert, 0); err != nil {
				return fmt.Errorf("importing exercise %q: %w", e.ID, err)
			}
		}
		return bump(ctx, tx)
	})
}

func (r DB) ApproveExerciseDraft(ctx context.Context, id string, e konkur.Exercise, overwrite bool) error {
	mode := konkur.ModeCreate
	if overwrite {
		mode = konkur.ModeUpsert
	}
	return r.withTx(ctx, func(tx pgx.Tx) error {
		if err := saveExercise(ctx, tx, e, mode, 0); err != nil {
			return err
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
