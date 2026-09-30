package billing

import (
	"context"
	"errors"
	"time"
)

// ErrNotFound is returned by the repository for an unknown plan or user.
var ErrNotFound = errors.New("not found")

// Plan is one Cafe Bazaar in-app product that adds DurationDays of
// Premium (subscription_plans).
type Plan struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DurationDays int    `json:"duration_days"`
	PriceToman   int    `json:"price_toman"`
	ProductID    string `json:"product_id"`
	// Admin panel only: verified purchases of this plan so far.
	PurchaseCount int `json:"purchase_count"`
}

// UserSummary is a user as the admin panel's «کاربران» tab lists them.
type UserSummary struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	// Set once the user signed up (internal/service/account).
	Phone           string     `json:"phone,omitempty"`
	Nickname        string     `json:"nickname,omitempty"`
	PremiumLifetime bool       `json:"premium_lifetime"`
	PremiumUntil    *time.Time `json:"premium_until,omitempty"`
	IsUnlimited     bool       `json:"is_unlimited"`
	SolveCount      int        `json:"solve_count"`
	PurchaseCount   int        `json:"purchase_count"`
	CreatedAt       time.Time  `json:"created_at"`
	LastSeenAt      time.Time  `json:"last_seen_at"`
}

// Repository is intentionally independent of problemservice.Repository
// and userservice.Repository (even though all three end up querying
// the same Postgres pool) — each service owns only the interface slice
// it needs, matching the layering already used across this codebase.
type Repository interface {
	ListPlans(ctx context.Context) ([]Plan, error)
	PlanByProductID(ctx context.Context, productID string) (Plan, error)
	// UpsertPlan creates a plan, or updates the one with the same product_id.
	UpsertPlan(ctx context.Context, p Plan) (Plan, error)
	DeletePlan(ctx context.Context, id string) error

	// PurchaseRecorded reports whether purchaseToken was already verified.
	PurchaseRecorded(ctx context.Context, purchaseToken string) (bool, error)
	// RecordPurchase stores a verified purchase token and, when days > 0,
	// extends the user's premium_until by that many days (from now, or
	// from the current expiry if it's still in the future) — both in one
	// transaction. isNew is false (and nothing is extended) when the token
	// was already recorded.
	RecordPurchase(ctx context.Context, userID, productID, purchaseToken string, days int) (isNew bool, err error)
	// SetPremium grants the old one-time lifetime unlock.
	SetPremium(ctx context.Context, userID string) error

	// Admin panel.
	SearchUsers(ctx context.Context, query string, limit int) ([]UserSummary, error)
	AddPremiumDays(ctx context.Context, userID string, days int) error
	SetUnlimited(ctx context.Context, userID string, unlimited bool) error
	RevokePremium(ctx context.Context, userID string) error
}

// Validator confirms a purchase with Cafe Bazaar (BazaarClient).
type Validator interface {
	ValidatePurchase(ctx context.Context, packageName, productID, purchaseToken string) error
}

type Service struct {
	repo        Repository
	bazaar      Validator
	packageName string
	// lifetimeProductID is the old one-time Premium unlock SKU, still
	// honoured for everyone who bought it (and for restores).
	lifetimeProductID string
}

func New(repo Repository, bazaar Validator, packageName, lifetimeProductID string) Service {
	return Service{repo: repo, bazaar: bazaar, packageName: packageName, lifetimeProductID: lifetimeProductID}
}

// ListPlans is what the app's plan picker shows (GET /api/v1/billing/plans).
func (s Service) ListPlans(ctx context.Context) ([]Plan, error) {
	return s.repo.ListPlans(ctx)
}
