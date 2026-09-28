package billing

import "context"

type fakeRepo struct {
	recordCalled   bool
	recordUserID   string
	recordProduct  string
	recordToken    string
	recordIsNew    bool
	recordErr      error
	setPremiumErr  error
	setPremiumCall string
}

func (f *fakeRepo) RecordPurchase(ctx context.Context, userID, productID, purchaseToken string) (bool, error) {
	f.recordCalled = true
	f.recordUserID = userID
	f.recordProduct = productID
	f.recordToken = purchaseToken
	if f.recordErr != nil {
		return false, f.recordErr
	}
	return f.recordIsNew, nil
}

func (f *fakeRepo) SetPremium(ctx context.Context, userID string) error {
	f.setPremiumCall = userID
	return f.setPremiumErr
}
