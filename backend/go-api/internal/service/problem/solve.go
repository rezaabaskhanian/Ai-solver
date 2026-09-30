package problemservice

import (
	"context"
	"log"

	domain "mathmotion/go-api/internal/domain/problem"
	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
	"mathmotion/go-api/internal/service/quota"
)

// Solve orchestrates the math engine call and persists problem+
// solution for history. It never computes or verifies the answer
// itself — PRD section 38's core architectural rule.
//
// The usage quota (internal/service/quota — admin-configurable) is
// checked before the Math Engine is even called, so a quota-exhausted
// request never wastes an engine round trip or persists anything.
func (s Service) Solve(ctx context.Context, userID string, isPremium bool, rawInput string) (dto.SolveResult, error) {
	const op = "problemservice.Solve"

	if err := s.quota.Allow(ctx, userID, isPremium, quota.KindSolve); err != nil {
		return dto.SolveResult{}, err
	}

	result, err := s.engine.Solve(ctx, rawInput)
	if err != nil {
		return dto.SolveResult{}, wrapEngineErr(richerror.Op(op), err)
	}

	steps := make([]domain.Step, len(result.Steps))
	dtoSteps := make([]dto.Step, len(result.Steps))
	for i, s := range result.Steps {
		steps[i] = domain.Step{
			ID: s.ID, Before: s.Before, After: s.After,
			Operation: s.Operation, Value: s.Value, Target: s.Target,
			Explanation: s.Explanation,
		}
		dtoSteps[i] = dto.Step{
			ID: s.ID, Before: s.Before, After: s.After,
			Operation: s.Operation, Value: s.Value, Target: s.Target,
			Explanation: s.Explanation,
		}
	}

	problemID, err := s.repo.SaveProblemAndSolution(
		ctx, userID, rawInput, result.Problem, result.Type,
		result.Answer, result.Verified, steps, result.Plot,
	)
	if err != nil {
		return dto.SolveResult{}, richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not save the solution.")
	}

	if err := s.quota.Record(ctx, userID, quota.KindSolve); err != nil {
		log.Printf("%s: recording usage: %v", op, err)
	}

	return dto.SolveResult{
		ProblemID: problemID,
		Answer:    result.Answer,
		Verified:  result.Verified,
		Type:      result.Type,
		Steps:     dtoSteps,
		Plot:      result.Plot,
	}, nil
}
