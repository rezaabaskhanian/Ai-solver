// Package problem is the domain layer for a math problem and its
// solution (PRD sections 9, 12, 25). It holds no math logic itself —
// per PRD section 38's core architectural rule, only the Python math
// engine computes or verifies an answer; this package just models
// the shapes that flow through the Go API.
package problem

import "time"

type Problem struct {
	ID                   string
	UserID               string
	RawInput             string
	NormalizedExpression string
	ProblemType          string
	CreatedAt            time.Time
}

// Step is one entry in a solution's step-by-step breakdown (PRD
// section 12: operation/value/target/before/after/explanation).
type Step struct {
	ID          int     `json:"id"`
	Before      string  `json:"before"`
	After       string  `json:"after"`
	Operation   string  `json:"operation"`
	Value       *string `json:"value,omitempty"`
	Target      *string `json:"target,omitempty"`
	Explanation string  `json:"explanation"`
}

type Solution struct {
	ID        string
	ProblemID string
	Answer    string
	Verified  bool
	Steps     []Step
	CreatedAt time.Time
}
