package problemservice

import (
	"context"

	"mathmotion/go-api/internal/pkg/errmesg"
	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
)

// Check tells the student whether their own step-by-step attempt is
// correct, and where the first mistake is if not (see
// backend/math-engine/app/solver/check.py). It never persists anything
// — checking work isn't a "solve" the way /solve is. Gated by the same
// free-tier quota as Solve/Recognize (mirrors
// internal/service/vision/recognize.go's exact pattern): within quota
// this doesn't restrict anything a user couldn't already get from
// /solve directly, and once quota is exhausted it closes off using
// /check as an unlimited step-by-step hint extractor.
func (s Service) Check(ctx context.Context, userID string, isPremium bool, problem string, studentSteps []string) (dto.CheckResult, error) {
	const op = "problemservice.Check"

	if !isPremium {
		used, err := s.repo.CountProblems(ctx, userID)
		if err != nil {
			return dto.CheckResult{}, richerror.New(richerror.Op(op)).WithErr(err).
				WithKind(richerror.KindUnexpected).WithMessage("Could not check your solve quota.")
		}
		if used >= s.freeSolveLimit {
			return dto.CheckResult{}, richerror.New(richerror.Op(op)).
				WithKind(richerror.KindPaymentRequired).WithMessage(errmesg.ErrQuotaExceeded)
		}
	}

	result, err := s.engine.Check(ctx, problem, studentSteps)
	if err != nil {
		return dto.CheckResult{}, wrapEngineErr(richerror.Op(op), err)
	}

	var hint *dto.Step
	if result.NextStepHint != nil {
		hint = &dto.Step{
			ID: result.NextStepHint.ID, Before: result.NextStepHint.Before,
			After: result.NextStepHint.After, Operation: result.NextStepHint.Operation,
			Value: result.NextStepHint.Value, Target: result.NextStepHint.Target,
			Explanation: result.NextStepHint.Explanation,
		}
	}

	return dto.CheckResult{
		Status:          result.Status,
		StepStatuses:    result.StepStatuses,
		FirstErrorIndex: result.FirstErrorIndex,
		NextStepHint:    hint,
		CorrectAnswer:   result.CorrectAnswer,
	}, nil
}
