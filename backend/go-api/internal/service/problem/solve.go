package problemservice

import (
	"context"

	domain "mathmotion/go-api/internal/domain/problem"
	"mathmotion/go-api/internal/pkg/errmesg"
	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
)

// Solve orchestrates the math engine call and persists problem+
// solution for history. It never computes or verifies the answer
// itself — PRD section 38's core architectural rule.
//
// isPremium gates the free-tier quota: a non-Premium device-scoped user
// gets a lifetime cap of freeSolveLimit solves before the Math Engine
// is even called, so a quota-exhausted request never wastes an engine
// round trip or persists anything.
func (s Service) Solve(ctx context.Context, userID string, isPremium bool, rawInput string) (dto.SolveResult, error) {
	const op = "problemservice.Solve"

	if !isPremium {
		used, err := s.repo.CountProblems(ctx, userID)
		if err != nil {
			return dto.SolveResult{}, richerror.New(richerror.Op(op)).WithErr(err).
				WithKind(richerror.KindUnexpected).WithMessage("Could not check your solve quota.")
		}
		if used >= s.freeSolveLimit {
			return dto.SolveResult{}, richerror.New(richerror.Op(op)).
				WithKind(richerror.KindPaymentRequired).WithMessage(errmesg.ErrQuotaExceeded)
		}
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
		result.Answer, result.Verified, steps,
	)
	if err != nil {
		return dto.SolveResult{}, richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not save the solution.")
	}

	return dto.SolveResult{
		ProblemID: problemID,
		Answer:    result.Answer,
		Verified:  result.Verified,
		Type:      result.Type,
		Steps:     dtoSteps,
	}, nil
}
