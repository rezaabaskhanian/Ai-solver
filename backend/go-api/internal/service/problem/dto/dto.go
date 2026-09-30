// Package dto holds request/response shapes for the problem service
// use cases — mirrors Shadowing-backend's per-feature service/<x>/dto
// packages.
package dto

import (
	"encoding/json"
	"time"

	postgresproblem "mathmotion/go-api/internal/repository/postgres/problem"
)

type ParseResult struct {
	Problem    string  `json:"problem"`
	Type       string  `json:"type"`
	Confidence float64 `json:"confidence"`
}

type Step struct {
	ID          int     `json:"id"`
	Before      string  `json:"before"`
	After       string  `json:"after"`
	Operation   string  `json:"operation"`
	Value       *string `json:"value,omitempty"`
	Target      *string `json:"target,omitempty"`
	Explanation string  `json:"explanation"`
}

type SolveResult struct {
	ProblemID string `json:"problem_id"`
	Answer    string `json:"answer"`
	Verified  bool   `json:"verified"`
	Type      string `json:"type"`
	Steps     []Step `json:"steps"`
	// The curve to draw for a "function_plot" problem; omitted otherwise.
	Plot json.RawMessage `json:"plot,omitempty"`
}

// HistoryItem is the flattened problem+solution shape the mobile
// History screen renders (PRD section 21). Aliased from the postgres
// package's query-row type — mirrors Shadowing-backend's
// `type UserActivity = postgresuser.UserActivityRow`.
type HistoryItem = postgresproblem.HistoryItemRow

// Entitlement is the free-tier quota + Premium status shown by the
// mobile paywall (see internal/service/billing for how Premium gets
// set).
type Entitlement struct {
	IsPremium bool `json:"is_premium"`
	// Free-tier usage (solves + scans + checks) in the current period.
	FreeSolvesUsed  int `json:"free_solves_used"`
	FreeSolvesLimit int `json:"free_solves_limit"`
	// "daily" or "lifetime" (admin panel setting).
	QuotaPeriod string `json:"quota_period"`
	// Next reset (Tehran midnight); omitted for lifetime free quotas.
	ResetsAt *time.Time `json:"resets_at,omitempty"`
	// Premium only: scans today and the daily cap (0 = no cap).
	PremiumScansUsed int `json:"premium_scans_used"`
	PremiumScanLimit int `json:"premium_scan_limit"`
	// Who this device is (shown in the app's Settings for support) and
	// what kind of Premium it has: a plan's expiry, lifetime, or unlimited.
	UserCode        string     `json:"user_code"`
	PremiumUntil    *time.Time `json:"premium_until,omitempty"`
	PremiumLifetime bool       `json:"premium_lifetime"`
	IsUnlimited     bool       `json:"is_unlimited"`
}

// CheckResult mirrors the math engine's POST /check response — see
// backend/math-engine/app/solver/check.py for how it's computed.
// NextStepHint reuses Step: it's either "what you should have done
// instead" (status == incorrect) or "what to do next" (correct_so_far).
type CheckResult struct {
	Status          string   `json:"status"`
	StepStatuses    []string `json:"step_statuses"`
	FirstErrorIndex *int     `json:"first_error_index"`
	NextStepHint    *Step    `json:"next_step_hint,omitempty"`
	CorrectAnswer   string   `json:"correct_answer"`
}

// PracticeResult is a freshly generated, unsolved problem of the
// requested type (backend/math-engine/app/solver/practice.py).
type PracticeResult struct {
	Problem string `json:"problem"`
	Type    string `json:"type"`
}
