package billing

import (
	"context"
	"testing"

	"mathmotion/go-api/internal/pkg/richerror"
)

func TestVerifyPurchase_GrantsPremiumOnGenuinePurchase(t *testing.T) {
	srv, _ := newFakeBazaarServer(t, PurchaseStatePurchased)
	defer srv.Close()

	repo := &fakeRepo{recordIsNew: true}
	svc := New(repo, newTestBazaarClient(srv), "com.mathmotion", "premium_unlock")

	if err := svc.VerifyPurchase(context.Background(), "user-1", "token-1"); err != nil {
		t.Fatalf("VerifyPurchase returned error: %v", err)
	}

	if !repo.recordCalled {
		t.Fatal("expected RecordPurchase to be called")
	}
	if repo.recordUserID != "user-1" || repo.recordToken != "token-1" || repo.recordProduct != "premium_unlock" {
		t.Fatalf("RecordPurchase called with unexpected args: userID=%q token=%q product=%q",
			repo.recordUserID, repo.recordToken, repo.recordProduct)
	}
	if repo.setPremiumCall != "user-1" {
		t.Fatalf("SetPremium called with %q, want %q", repo.setPremiumCall, "user-1")
	}
}

func TestVerifyPurchase_ReplayedTokenStillGrantsPremium(t *testing.T) {
	// RecordPurchase returning isNew=false (the token was already
	// recorded — e.g. the mobile client's restore-on-reinstall check
	// replaying an old token) must still be treated as success.
	srv, _ := newFakeBazaarServer(t, PurchaseStatePurchased)
	defer srv.Close()

	repo := &fakeRepo{recordIsNew: false}
	svc := New(repo, newTestBazaarClient(srv), "com.mathmotion", "premium_unlock")

	if err := svc.VerifyPurchase(context.Background(), "user-1", "token-1"); err != nil {
		t.Fatalf("VerifyPurchase returned error: %v", err)
	}
	if repo.setPremiumCall != "user-1" {
		t.Fatal("expected SetPremium to still be called for a replayed token")
	}
}

func TestVerifyPurchase_RejectsRefundedPurchase(t *testing.T) {
	srv, _ := newFakeBazaarServer(t, PurchaseStateRefunded)
	defer srv.Close()

	repo := &fakeRepo{}
	svc := New(repo, newTestBazaarClient(srv), "com.mathmotion", "premium_unlock")

	err := svc.VerifyPurchase(context.Background(), "user-1", "token-1")
	if err == nil {
		t.Fatal("VerifyPurchase returned nil error, want rejection for a refunded purchase")
	}
	if repo.recordCalled {
		t.Fatal("RecordPurchase should not be called for a refunded purchase")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindInvalid {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindInvalid)
	}
}

func TestVerifyPurchase_RepositoryErrorIsWrapped(t *testing.T) {
	srv, _ := newFakeBazaarServer(t, PurchaseStatePurchased)
	defer srv.Close()

	repo := &fakeRepo{setPremiumErr: context.DeadlineExceeded}
	svc := New(repo, newTestBazaarClient(srv), "com.mathmotion", "premium_unlock")

	err := svc.VerifyPurchase(context.Background(), "user-1", "token-1")
	if err == nil {
		t.Fatal("VerifyPurchase returned nil error, want wrapped repository error")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindUnexpected {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindUnexpected)
	}
}
