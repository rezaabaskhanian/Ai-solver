package problemservice

import (
	"context"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
)

// History lists a user's past problems+solutions, most recent first
// (PRD section 21).
func (s Service) History(ctx context.Context, userID string, limit, offset int) ([]dto.HistoryItem, error) {
	const op = "problemservice.History"

	items, err := s.repo.ListHistory(ctx, userID, limit, offset)
	if err != nil {
		return nil, richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not load history.")
	}
	return items, nil
}
