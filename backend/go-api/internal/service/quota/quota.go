// Package quota decides whether a device-scoped user may solve, scan or
// check right now, and records each use. Every limit is read from the
// admin-editable settings on each call (internal/service/settings), so a
// change in the admin panel applies to the very next request.
//
//   - Free users: solves, scans and step-checks all count toward one
//     limit, per Tehran calendar day ("daily", the default) or for the
//     device's whole lifetime ("lifetime").
//   - Premium users: unlimited solves/checks, but scans — the only action
//     that costs an AI call — have a daily cap (0 = no cap).
package quota

import (
	"context"
	"strconv"
	"strings"
	"time"
	// Embeds the IANA time zone database: the production image is plain
	// alpine without tzdata, and the day boundary is Asia/Tehran.
	_ "time/tzdata"

	"mathmotion/go-api/internal/pkg/errmesg"
	"mathmotion/go-api/internal/pkg/richerror"
	settingskeys "mathmotion/go-api/internal/service/settings"
)

type Kind string

const (
	KindSolve Kind = "solve"
	KindScan  Kind = "scan"
	KindCheck Kind = "check"
)

var allKinds = []Kind{KindSolve, KindScan, KindCheck}

const (
	PeriodDaily    = "daily"
	PeriodLifetime = "lifetime"
)

// Defaults when neither the admin panel nor .env sets a value.
const (
	defaultFreeDailyLimit        = 3
	defaultFreeLifetimeLimit     = 5
	defaultPremiumDailyScanLimit = 30
)

type Settings interface {
	Get(key string) string
}

type Repository interface {
	// CountUsage counts the user's events of the given kinds at or after
	// since (the zero time counts everything).
	CountUsage(ctx context.Context, userID string, kinds []Kind, since time.Time) (int, error)
	RecordUsage(ctx context.Context, userID string, kind Kind) error
}

type Service struct {
	repo     Repository
	settings Settings
	now      func() time.Time
	loc      *time.Location
}

func New(repo Repository, settings Settings) Service {
	loc, err := time.LoadLocation("Asia/Tehran")
	if err != nil {
		// Unreachable with time/tzdata embedded; Iran has no DST, so a
		// fixed +03:30 offset is an exact fallback.
		loc = time.FixedZone("IRST", 3*60*60+30*60)
	}
	return Service{repo: repo, settings: settings, now: time.Now, loc: loc}
}

// Config is the effective limits right now (settings, then .env, then the
// defaults above).
type Config struct {
	FreePeriod            string `json:"free_quota_period"`
	FreeDailyLimit        int    `json:"free_daily_limit"`
	FreeLifetimeLimit     int    `json:"free_lifetime_limit"`
	PremiumDailyScanLimit int    `json:"premium_daily_scan_limit"`
}

func (s Service) Config() Config {
	period := strings.ToLower(strings.TrimSpace(s.settings.Get(settingskeys.KeyFreeQuotaPeriod)))
	if period != PeriodLifetime {
		period = PeriodDaily
	}
	// FREE_SOLVE_LIMIT is the pre-existing .env name for the lifetime cap.
	lifetimeDefault := intOr(s.settings.Get("FREE_SOLVE_LIMIT"), defaultFreeLifetimeLimit)
	return Config{
		FreePeriod:            period,
		FreeDailyLimit:        intOr(s.settings.Get(settingskeys.KeyFreeDailyLimit), defaultFreeDailyLimit),
		FreeLifetimeLimit:     intOr(s.settings.Get(settingskeys.KeyFreeLifetimeLimit), lifetimeDefault),
		PremiumDailyScanLimit: intOr(s.settings.Get(settingskeys.KeyPremiumDailyScanLimit), defaultPremiumDailyScanLimit),
	}
}

func intOr(raw string, fallback int) int {
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n < 0 {
		return fallback
	}
	return n
}

// startOfDay is today's midnight in Tehran; the next reset is a day later.
func (s Service) startOfDay() time.Time {
	now := s.now().In(s.loc)
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, s.loc)
}

// Status is what GET /api/v1/entitlement reports.
type Status struct {
	Period string
	// Free-tier usage within the current period, and its limit.
	Used  int
	Limit int
	// When the daily free quota (and the Premium scan cap) resets; nil in
	// lifetime mode for free users.
	ResetsAt *time.Time
	// Premium-only: scans used today and the daily cap (0 = no cap).
	ScansUsedToday int
	ScanLimit      int
}

func (s Service) Status(ctx context.Context, userID string, isPremium bool) (Status, error) {
	cfg := s.Config()
	today := s.startOfDay()
	resets := today.AddDate(0, 0, 1)

	if isPremium {
		scans, err := s.repo.CountUsage(ctx, userID, []Kind{KindScan}, today)
		if err != nil {
			return Status{}, err
		}
		return Status{Period: cfg.FreePeriod, ScansUsedToday: scans, ScanLimit: cfg.PremiumDailyScanLimit, ResetsAt: &resets}, nil
	}

	limit, since := cfg.FreeLifetimeLimit, time.Time{}
	var resetsAt *time.Time
	if cfg.FreePeriod == PeriodDaily {
		limit, since, resetsAt = cfg.FreeDailyLimit, today, &resets
	}
	used, err := s.repo.CountUsage(ctx, userID, allKinds, since)
	if err != nil {
		return Status{}, err
	}
	return Status{Period: cfg.FreePeriod, Used: used, Limit: limit, ResetsAt: resetsAt}, nil
}

// Allow returns nil when the user may perform kind now, or a RichError:
// KindPaymentRequired (free quota used up → the app shows the paywall) or
// KindTooManyRequests (Premium daily scan cap → "try again tomorrow").
// It's called before the engine/AI, so a rejected request costs nothing.
func (s Service) Allow(ctx context.Context, userID string, isPremium bool, kind Kind) error {
	const op = "quota.Allow"

	status, err := s.Status(ctx, userID, isPremium)
	if err != nil {
		return richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not check your solve quota.")
	}

	if isPremium {
		if kind == KindScan && status.ScanLimit > 0 && status.ScansUsedToday >= status.ScanLimit {
			return richerror.New(richerror.Op(op)).
				WithKind(richerror.KindTooManyRequests).WithMessage(errmesg.ErrDailyScanLimit)
		}
		return nil
	}

	if status.Used >= status.Limit {
		msg := errmesg.ErrQuotaExceeded
		if status.Period == PeriodDaily {
			msg = errmesg.ErrDailyQuotaExceeded
		}
		return richerror.New(richerror.Op(op)).WithKind(richerror.KindPaymentRequired).WithMessage(msg)
	}
	return nil
}

// Record logs one successful use. Callers treat a failure as non-fatal
// (the student already got their answer), so it only returns the error
// for logging.
func (s Service) Record(ctx context.Context, userID string, kind Kind) error {
	return s.repo.RecordUsage(ctx, userID, kind)
}
