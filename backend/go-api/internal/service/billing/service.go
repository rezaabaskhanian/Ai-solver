package billing

import "context"

// Repository is intentionally independent of problemservice.Repository
// and userservice.Repository (even though all three end up querying
// the same Postgres pool) — each service owns only the interface slice
// it needs, matching the layering already used across this codebase.
type Repository interface {
	// RecordPurchase stores a verified purchase token. isNew is false
	// when the token was already recorded (e.g. the mobile client's
	// restore-on-reinstall check replaying an old token) — the caller
	// still (idempotently) ensures Premium is set either way.
	RecordPurchase(ctx context.Context, userID, productID, purchaseToken string) (isNew bool, err error)

	SetPremium(ctx context.Context, userID string) error
}

type Service struct {
	repo        Repository
	bazaar      *BazaarClient
	packageName string
	productID   string
}

func New(repo Repository, bazaar *BazaarClient, packageName, productID string) Service {
	return Service{repo: repo, bazaar: bazaar, packageName: packageName, productID: productID}
}
