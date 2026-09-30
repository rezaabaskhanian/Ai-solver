package vision

import (
	"context"
	"log"

	"mathmotion/go-api/internal/pkg/errmesg"
	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/aiusage"
	"mathmotion/go-api/internal/service/quota"
)

// RecognizeEquations reads every math problem in a photo and returns
// each as plain text for the caller to hand to the existing Solve flow,
// one at a time, after the user picks which one(s) to solve (PRD
// section 8: never solve without confirmation). Gated and counted by the
// usage quota (internal/service/quota): a scan is the one action that
// costs an AI call, so it counts whenever the photo reached the provider
// — including "nothing recognized" — but not when the call itself failed
// on our/the provider's side.
func (s Service) RecognizeEquations(ctx context.Context, userID string, isPremium bool, imageBase64, mediaType string) ([]string, error) {
	const op = "vision.RecognizeEquations"

	if err := s.quota.Allow(ctx, userID, isPremium, quota.KindScan); err != nil {
		return nil, err
	}

	problems, usage, err := s.client.RecognizeWithUsage(ctx, imageBase64, mediaType)
	if err == nil || IsNotRecognized(err) {
		if recErr := s.quota.Record(ctx, userID, quota.KindScan); recErr != nil {
			log.Printf("%s: recording usage: %v", op, recErr)
		}
		if s.usage != nil {
			s.usage.Record(ctx, aiusage.Entry{
				UserID: userID, Feature: "scan", Provider: usage.Provider, Model: usage.Model,
				InputTokens: usage.InputTokens, OutputTokens: usage.OutputTokens,
				CostUSD: usage.CostUSD, CostReported: usage.CostReported,
			})
		}
	}
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
