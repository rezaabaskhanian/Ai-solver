// Package errmesg centralizes the user-facing error strings so
// wording stays consistent across handlers (PRD section 30 - Error
// Handling defines the exact copy for each case).
package errmesg

const (
	ErrCouldNotUnderstandProblem = "We couldn't understand this problem. Please check your equation."
	ErrUnsupportedProblemType    = "This type of problem isn't supported yet."
	ErrVerificationFailed        = "Something went wrong solving this problem. Please try again."
	ErrMathEngineUnavailable     = "The math engine is unavailable. Please try again."
	ErrInternal                  = "Something went wrong. Please try again."
	ErrQuotaExceeded             = "You've used all your free solves. Upgrade to Premium to continue."
	ErrPurchaseInvalid           = "This purchase couldn't be verified."
)
