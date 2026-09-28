package problemservice

import (
	"errors"

	"mathmotion/go-api/internal/pkg/errmesg"
	"mathmotion/go-api/internal/pkg/richerror"
)

// wrapEngineErr translates a math-engine EngineError into a
// richerror with the PRD section 30 wording and the right Kind, so
// the delivery layer's generic error mapper (errorhandling package)
// produces the correct HTTP status without knowing anything about
// the math engine.
func wrapEngineErr(op richerror.Op, err error) error {
	var engineErr *EngineError
	if errors.As(err, &engineErr) {
		switch engineErr.Code {
		case "parse_error":
			return richerror.New(op).WithErr(err).WithKind(richerror.KindInvalid).
				WithMessage(errmesg.ErrCouldNotUnderstandProblem)
		case "unsupported_problem_type":
			return richerror.New(op).WithErr(err).WithKind(richerror.KindInvalid).
				WithMessage(errmesg.ErrUnsupportedProblemType)
		case "verification_failed":
			return richerror.New(op).WithErr(err).WithKind(richerror.KindInvalid).
				WithMessage(errmesg.ErrVerificationFailed)
		}
		return richerror.New(op).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage(engineErr.Message)
	}
	return richerror.New(op).WithErr(err).WithKind(richerror.KindUnexpected).
		WithMessage(errmesg.ErrMathEngineUnavailable)
}
