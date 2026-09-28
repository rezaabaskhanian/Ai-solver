// Package richerror is an error type carrying an operation name, a
// classification (Kind), a user-facing message, and the wrapped
// cause — so the delivery layer can map it to the right HTTP status
// without the service/repository layers importing net/http.
//
// Pattern mirrors Shadowing-backend's internal/pkg/richerror (same
// author's other Go project) — kept identical on purpose so the two
// codebases read the same way.
package richerror

type Op string

type Kind int

const (
	KindInvalid Kind = iota + 1
	KindNotFound
	KindUnexpected
	KindPaymentRequired
)

type RichError struct {
	op           Op
	wrappedError error
	message      string
	kind         Kind
}

func New(op Op) RichError {
	return RichError{op: op}
}

func (r RichError) WithMessage(message string) RichError {
	r.message = message
	return r
}

func (r RichError) WithKind(kind Kind) RichError {
	r.kind = kind
	return r
}

func (r RichError) WithOp(op Op) RichError {
	r.op = op
	return r
}

func (r RichError) WithErr(err error) RichError {
	r.wrappedError = err
	return r
}

func (r RichError) Error() string {
	return r.message
}

// Unwrap lets errors.Is/errors.As see through RichError to the
// original cause (e.g. pgx.ErrNoRows).
func (r RichError) Unwrap() error {
	return r.wrappedError
}

func (r RichError) Kind() Kind {
	if r.kind != 0 {
		return r.kind
	}
	if re, ok := r.wrappedError.(RichError); ok {
		return re.Kind()
	}
	return 0
}

func (r RichError) Message() string {
	if r.message != "" {
		return r.message
	}
	if re, ok := r.wrappedError.(RichError); ok {
		return re.Message()
	}
	if r.wrappedError != nil {
		return r.wrappedError.Error()
	}
	return ""
}
