package billing

import (
	"context"
	"errors"
	"testing"

	"mathmotion/go-api/internal/pkg/richerror"
)

const lifetimeSKU = "mathmotion_premium_unlock"

func newTestService(repo *fakeRepo, bazaar *fakeBazaar) Service {
	return New(repo, bazaar, "com.mathmotion", lifetimeSKU)
}

func kindOf(t *testing.T, err error) richerror.Kind {
	t.Helper()
	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	return richErr.Kind()
}

func TestVerifyPurchase_MonthlyPlanAddsItsDays(t *testing.T) {
	repo, bazaar := newFakeRepo(), &fakeBazaar{}
	svc := newTestService(repo, bazaar)

	if err := svc.VerifyPurchase(context.Background(), "user-1", "mathmotion_1m", "token-1"); err != nil {
		t.Fatalf("VerifyPurchase returned error: %v", err)
	}
	if repo.recordCalls != 1 || repo.recordUserID != "user-1" || repo.recordDays != 30 {
		t.Fatalf("RecordPurchase calls=%d user=%q days=%d, want 1/user-1/30",
			repo.recordCalls, repo.recordUserID, repo.recordDays)
	}
	if repo.setPremiumUser != "" {
		t.Fatal("a plan purchase must not grant the lifetime unlock")
	}
}

func TestVerifyPurchase_ReplayedPlanTokenGrantsNothingTwice(t *testing.T) {
	repo, bazaar := newFakeRepo(), &fakeBazaar{}
	repo.recorded["token-1"] = true
	svc := newTestService(repo, bazaar)

	if err := svc.VerifyPurchase(context.Background(), "user-1", "mathmotion_1m", "token-1"); err != nil {
		t.Fatalf("VerifyPurchase returned error: %v", err)
	}
	if repo.recordCalls != 0 || bazaar.calls != 0 {
		t.Fatalf("replayed token: record calls=%d bazaar calls=%d, want 0/0", repo.recordCalls, bazaar.calls)
	}
}

func TestVerifyPurchase_EmptyProductIsTheLifetimeUnlock(t *testing.T) {
	repo, bazaar := newFakeRepo(), &fakeBazaar{}
	svc := newTestService(repo, bazaar)

	if err := svc.VerifyPurchase(context.Background(), "user-1", "", "token-1"); err != nil {
		t.Fatalf("VerifyPurchase returned error: %v", err)
	}
	if repo.recordProduct != lifetimeSKU || repo.recordDays != 0 {
		t.Fatalf("recorded product=%q days=%d, want %q/0", repo.recordProduct, repo.recordDays, lifetimeSKU)
	}
	if repo.setPremiumUser != "user-1" {
		t.Fatalf("SetPremium called with %q, want user-1", repo.setPremiumUser)
	}
}

func TestVerifyPurchase_ReplayedLifetimeTokenStillRestoresPremium(t *testing.T) {
	// A reinstall is a new device_id: the app's restore check re-sends the
	// token Bazaar still lists as owned, and Premium must come back.
	repo, bazaar := newFakeRepo(), &fakeBazaar{}
	repo.recorded["token-1"] = true
	svc := newTestService(repo, bazaar)

	if err := svc.VerifyPurchase(context.Background(), "user-2", lifetimeSKU, "token-1"); err != nil {
		t.Fatalf("VerifyPurchase returned error: %v", err)
	}
	if repo.setPremiumUser != "user-2" {
		t.Fatal("expected SetPremium for a replayed lifetime token")
	}
}

func TestVerifyPurchase_UnknownProductIsRejected(t *testing.T) {
	repo, bazaar := newFakeRepo(), &fakeBazaar{}
	svc := newTestService(repo, bazaar)

	err := svc.VerifyPurchase(context.Background(), "user-1", "no_such_sku", "token-1")
	if err == nil || kindOf(t, err) != richerror.KindInvalid {
		t.Fatalf("err = %v, want KindInvalid", err)
	}
	if bazaar.calls != 0 {
		t.Fatal("an unknown product must not be sent to Bazaar")
	}
}

func TestVerifyPurchase_RejectsPurchaseBazaarDenies(t *testing.T) {
	repo, bazaar := newFakeRepo(), &fakeBazaar{err: ErrPurchaseNotValid}
	svc := newTestService(repo, bazaar)

	err := svc.VerifyPurchase(context.Background(), "user-1", "mathmotion_1m", "token-1")
	if err == nil || kindOf(t, err) != richerror.KindInvalid {
		t.Fatalf("err = %v, want KindInvalid", err)
	}
	if repo.recordCalls != 0 {
		t.Fatal("a denied purchase must not be recorded")
	}
}

func TestVerifyPurchase_BazaarUnreachableIsUnexpected(t *testing.T) {
	repo, bazaar := newFakeRepo(), &fakeBazaar{err: errors.New("timeout")}
	svc := newTestService(repo, bazaar)

	err := svc.VerifyPurchase(context.Background(), "user-1", "mathmotion_1m", "token-1")
	if err == nil || kindOf(t, err) != richerror.KindUnexpected {
		t.Fatalf("err = %v, want KindUnexpected", err)
	}
}

func TestApplyGrant(t *testing.T) {
	repo := newFakeRepo()
	svc := newTestService(repo, &fakeBazaar{})
	ctx := context.Background()

	if err := svc.ApplyGrant(ctx, "user-1", GrantAction{Action: "add_days", Days: 30}); err != nil {
		t.Fatalf("add_days: %v", err)
	}
	if repo.addedDays != 30 {
		t.Fatalf("addedDays = %d, want 30", repo.addedDays)
	}
	if err := svc.ApplyGrant(ctx, "user-1", GrantAction{Action: "unlimited", Unlimited: true}); err != nil {
		t.Fatalf("unlimited: %v", err)
	}
	if repo.unlimited == nil || !*repo.unlimited {
		t.Fatal("expected SetUnlimited(true)")
	}
	if err := svc.ApplyGrant(ctx, "user-1", GrantAction{Action: "revoke"}); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if !repo.revoked {
		t.Fatal("expected RevokePremium")
	}

	for _, bad := range []GrantAction{{Action: "add_days"}, {Action: "add_days", Days: 5000}, {Action: "nope"}} {
		if err := svc.ApplyGrant(ctx, "user-1", bad); err == nil || kindOf(t, err) != richerror.KindInvalid {
			t.Fatalf("%+v: err = %v, want KindInvalid", bad, err)
		}
	}

	repo.userMissing = true
	if err := svc.ApplyGrant(ctx, "ghost", GrantAction{Action: "add_days", Days: 1}); err == nil || kindOf(t, err) != richerror.KindNotFound {
		t.Fatalf("missing user: err = %v, want KindNotFound", err)
	}
}

func TestSavePlan_Validates(t *testing.T) {
	svc := newTestService(newFakeRepo(), &fakeBazaar{})
	ctx := context.Background()

	if _, err := svc.SavePlan(ctx, Plan{Name: "سه ماهه", DurationDays: 90, ProductID: "mathmotion_3m"}); err != nil {
		t.Fatalf("valid plan: %v", err)
	}
	for _, bad := range []Plan{
		{Name: "", DurationDays: 30, ProductID: "x"},
		{Name: "a", DurationDays: 0, ProductID: "x"},
		{Name: "a", DurationDays: 30, ProductID: ""},
		{Name: "a", DurationDays: 30, ProductID: lifetimeSKU},
	} {
		if _, err := svc.SavePlan(ctx, bad); err == nil || kindOf(t, err) != richerror.KindInvalid {
			t.Fatalf("%+v: err = %v, want KindInvalid", bad, err)
		}
	}
}
