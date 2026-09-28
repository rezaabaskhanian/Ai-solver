package vision

import (
	"context"

	"mathmotion/go-api/internal/pkg/errmesg"
	"mathmotion/go-api/internal/pkg/richerror"
)

// RecognizeEquations reads every math problem in a photo and returns
// each as plain text for the caller to hand to the existing Solve flow,
// one at a time, after the user picks which one(s) to solve (PRD
// section 8: never solve without confirmation). Gated by the same
// free-tier quota as Solve (internal/service/problem/solve.go) —
// otherwise a non-Premium user could recognize unlimited images without
// the quota ever counting them.
func (s Service) RecognizeEquations(ctx context.Context, userID string, isPremium bool, imageBase64, mediaType string) ([]string, error) {
	const op = "vision.RecognizeEquations"

	if !isPremium {
		used, err := s.repo.CountProblems(ctx, userID)
		if err != nil {
			return nil, richerror.New(richerror.Op(op)).WithErr(err).
				WithKind(richerror.KindUnexpected).WithMessage("Could not check your solve quota.")
		}
		if used >= s.freeSolveLimit {
			return nil, richerror.New(richerror.Op(op)).
				WithKind(richerror.KindPaymentRequired).WithMessage(errmesg.ErrQuotaExceeded)
		}
	}

	problems, err := s.client.RecognizeEquations(ctx, imageBase64, mediaType)
	if err != nil {
		if IsNotRecognized(err) {
			return nil, richerror.New(richerror.Op(op)).WithErr(err).
				WithKind(richerror.KindInvalid).WithMessage(errmesg.ErrCouldNotUnderstandProblem)
		}
		return nil, richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not read the equation from this photo.")
	}

	return problems, nil
}
