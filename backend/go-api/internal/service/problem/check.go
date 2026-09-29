package problemservice

import (
	"context"
	"log"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
	"mathmotion/go-api/internal/service/quota"
)

// Check tells the student whether their own step-by-step attempt is
// correct, and where the first mistake is if not (see
// backend/math-engine/app/solver/check.py). It never persists anything
// — checking work isn't a "solve" the way /solve is. Counted by the same
// usage quota as Solve/Recognize (internal/service/quota), so /check
// can't serve as an unlimited step-by-step hint extractor once the free
// quota is used up.
func (s Service) Check(ctx context.Context, userID string, isPremium bool, problem string, studentSteps []string) (dto.CheckResult, error) {
	const op = "problemservice.Check"

	if err := s.quota.Allow(ctx, userID, isPremium, quota.KindCheck); err != nil {
		return dto.CheckResult{}, err
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

	if err := s.quota.Record(ctx, userID, quota.KindCheck); err != nil {
		log.Printf("%s: recording usage: %v", op, err)
	}

	return dto.CheckResult{
		Status:          result.Status,
		StepStatuses:    result.StepStatuses,
		FirstErrorIndex: result.FirstErrorIndex,
		NextStepHint:    hint,
		CorrectAnswer:   result.CorrectAnswer,
	}, nil
}
