package problemservice

import (
	"context"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
)

// GeneratePractice returns a fresh, unsolved problem of the given type
// (backend/math-engine/app/solver/practice.py). Not quota-gated — like
// Parse, it doesn't solve or reveal anything, just previews a problem
// the student still has to work through themselves.
func (s Service) GeneratePractice(ctx context.Context, problemType string) (dto.PracticeResult, error) {
	const op = "problemservice.GeneratePractice"

	result, err := s.engine.Practice(ctx, problemType)
	if err != nil {
		return dto.PracticeResult{}, wrapEngineErr(richerror.Op(op), err)
	}

	return dto.PracticeResult{Problem: result.Problem, Type: result.Type}, nil
}
