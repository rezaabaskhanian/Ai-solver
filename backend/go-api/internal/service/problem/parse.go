package problemservice

import (
	"context"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
)

// Parse is PRD section 7/24's validation step: it previews what the
// engine understood the input as, without persisting anything, so
// the client can show the user "here's what we detected" before they
// commit to solving it.
func (s Service) Parse(ctx context.Context, input string) (dto.ParseResult, error) {
	const op = "problemservice.Parse"

	result, err := s.engine.Parse(ctx, input)
	if err != nil {
		return dto.ParseResult{}, wrapEngineErr(richerror.Op(op), err)
	}

	return dto.ParseResult{
		Problem:    result.Problem,
		Type:       result.Type,
		Confidence: result.Confidence,
	}, nil
}
