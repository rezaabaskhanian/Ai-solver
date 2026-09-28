package postgresproblem

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "mathmotion/go-api/internal/domain/problem"
)

// HistoryItemRow is the flattened row the history query returns —
// the concrete type that service/problem/dto.HistoryItem aliases.
//
// Steps is included (not just the final answer) so the mobile History
// screen can reopen a past problem straight into the Solution screen
// without re-calling the Math Engine — the step-by-step breakdown was
// already verified once and persisted in solutions.steps.
type HistoryItemRow struct {
	ProblemID   string        `json:"problem_id"`
	Problem     string        `json:"problem"`
	ProblemType string        `json:"problem_type"`
	Answer      string        `json:"answer"`
	Verified    bool          `json:"verified"`
	Steps       []domain.Step `json:"steps"`
	CreatedAt   time.Time     `json:"created_at"`
}

// SaveProblemAndSolution implements [problemservice.Repository].
func (r DB) SaveProblemAndSolution(
	ctx context.Context,
	userID, rawInput, normalizedExpression, problemType, answer string,
	verified bool,
	steps []domain.Step,
) (string, error) {
	stepsJSON, err := json.Marshal(steps)
	if err != nil {
		return "", fmt.Errorf("marshaling steps: %w", err)
	}

	tx, err := r.conn.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	problemID := uuid.NewString()
	_, err = tx.Exec(ctx, `
		INSERT INTO problems (id, user_id, raw_input, normalized_expression, problem_type)
		VALUES ($1, $2, $3, $4, $5)
	`, problemID, userID, rawInput, normalizedExpression, problemType)
	if err != nil {
		return "", fmt.Errorf("inserting problem: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO solutions (id, problem_id, answer, verified, steps)
		VALUES ($1, $2, $3, $4, $5)
	`, uuid.NewString(), problemID, answer, verified, stepsJSON)
	if err != nil {
		return "", fmt.Errorf("inserting solution: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("committing transaction: %w", err)
	}

	return problemID, nil
}

// ListHistory implements [problemservice.Repository].
func (r DB) ListHistory(ctx context.Context, userID string, limit, offset int) ([]HistoryItemRow, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT p.id, p.normalized_expression, p.problem_type, s.answer, s.verified, s.steps, p.created_at
		FROM problems p
		JOIN LATERAL (
			SELECT answer, verified, steps
			FROM solutions
			WHERE problem_id = p.id
			ORDER BY created_at DESC
			LIMIT 1
		) s ON true
		WHERE p.user_id = $1
		ORDER BY p.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("querying history: %w", err)
	}
	defer rows.Close()

	items := []HistoryItemRow{}
	for rows.Next() {
		var item HistoryItemRow
		var stepsJSON []byte
		if err := rows.Scan(&item.ProblemID, &item.Problem, &item.ProblemType, &item.Answer, &item.Verified, &stepsJSON, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning history row: %w", err)
		}
		if err := json.Unmarshal(stepsJSON, &item.Steps); err != nil {
			return nil, fmt.Errorf("unmarshaling steps: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// CountProblems implements [problemservice.Repository] — backs the
// free-tier quota (PRD-adjacent monetization: a lifetime cap on solves
// for non-Premium users, see internal/service/problem/solve.go).
func (r DB) CountProblems(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.conn.QueryRow(ctx, `SELECT COUNT(*) FROM problems WHERE user_id = $1`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting problems: %w", err)
	}
	return count, nil
}
