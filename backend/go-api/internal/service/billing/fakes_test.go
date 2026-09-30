package billing

import "context"

type fakeRepo struct {
	plans map[string]Plan // by product id

	recorded      map[string]bool // purchase tokens already verified
	recordCalls   int
	recordUserID  string
	recordProduct string
	recordDays    int
	recordErr     error

	setPremiumUser string
	setPremiumErr  error

	addedDays   int
	unlimited   *bool
	revoked     bool
	userMissing bool
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		plans:    map[string]Plan{"mathmotion_1m": {ID: "plan_1m", DurationDays: 30, ProductID: "mathmotion_1m"}},
		recorded: map[string]bool{},
	}
}

func (f *fakeRepo) ListPlans(ctx context.Context) ([]Plan, error) {
	out := []Plan{}
	for _, p := range f.plans {
		out = append(out, p)
	}
	return out, nil
}

func (f *fakeRepo) PlanByProductID(ctx context.Context, productID string) (Plan, error) {
	p, ok := f.plans[productID]
	if !ok {
		return Plan{}, ErrNotFound
	}
	return p, nil
}

func (f *fakeRepo) UpsertPlan(ctx context.Context, p Plan) (Plan, error) {
	f.plans[p.ProductID] = p
	return p, nil
}

func (f *fakeRepo) DeletePlan(ctx context.Context, id string) error { return nil }

func (f *fakeRepo) PurchaseRecorded(ctx context.Context, token string) (bool, error) {
	return f.recorded[token], nil
}

func (f *fakeRepo) RecordPurchase(ctx context.Context, userID, productID, token string, days int) (bool, error) {
	f.recordCalls++
	f.recordUserID, f.recordProduct, f.recordDays = userID, productID, days
	if f.recordErr != nil {
		return false, f.recordErr
	}
	isNew := !f.recorded[token]
	f.recorded[token] = true
	return isNew, nil
}

func (f *fakeRepo) SetPremium(ctx context.Context, userID string) error {
	f.setPremiumUser = userID
	return f.setPremiumErr
}

func (f *fakeRepo) SearchUsers(ctx context.Context, query string, limit int) ([]UserSummary, error) {
	return nil, nil
}

func (f *fakeRepo) AddPremiumDays(ctx context.Context, userID string, days int) error {
	if f.userMissing {
		return ErrNotFound
	}
	f.addedDays += days
	return nil
}

func (f *fakeRepo) SetUnlimited(ctx context.Context, userID string, unlimited bool) error {
	f.unlimited = &unlimited
	return nil
}

func (f *fakeRepo) RevokePremium(ctx context.Context, userID string) error {
	f.revoked = true
	return nil
}

// fakeBazaar stands in for BazaarClient in service tests.
type fakeBazaar struct {
	err   error
	calls int
}

func (f *fakeBazaar) ValidatePurchase(ctx context.Context, packageName, productID, token string) error {
	f.calls++
	return f.err
}
