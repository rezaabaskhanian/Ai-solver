package billing

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	settingskeys "mathmotion/go-api/internal/service/settings"
)

type fakeSettings map[string]string

func (f fakeSettings) Get(key string) string { return f[key] }

// newTestClient points a BazaarClient at a fake validate endpoint that
// answers with status/body and records the auth header it received.
func newTestClient(t *testing.T, secret string, status int, body string) (*BazaarClient, *string, *string) {
	t.Helper()
	var gotHeader, gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotHeader = r.Header.Get(bazaarAuthHeader)
		gotPath = r.URL.Path
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)

	c := NewBazaarClient(fakeSettings{settingskeys.KeyBazaarAPISecret: secret}, srv.Client())
	c.validateURL = srv.URL + "/validate"
	return c, &gotHeader, &gotPath
}

func TestValidatePurchase_SendsTokenHeaderAndAcceptsPurchase(t *testing.T) {
	c, header, path := newTestClient(t, "secret-1", http.StatusOK, `{"purchaseState": 0, "kind": "androidpublisher#inappPurchase"}`)

	if err := c.ValidatePurchase(context.Background(), "com.mathmotion", "mathmotion_1m", "tok"); err != nil {
		t.Fatalf("ValidatePurchase: %v", err)
	}
	if *header != "secret-1" {
		t.Fatalf("auth header = %q, want secret-1", *header)
	}
	if want := "/validate/com.mathmotion/inapp/mathmotion_1m/purchases/tok/"; *path != want {
		t.Fatalf("path = %q, want %q", *path, want)
	}
}

func TestValidatePurchase_RefundedIsNotValid(t *testing.T) {
	c, _, _ := newTestClient(t, "s", http.StatusOK, `{"purchaseState": 1}`)
	if err := c.ValidatePurchase(context.Background(), "p", "sku", "tok"); !errors.Is(err, ErrPurchaseNotValid) {
		t.Fatalf("err = %v, want ErrPurchaseNotValid", err)
	}
}

func TestValidatePurchase_NotFoundIsNotValid(t *testing.T) {
	c, _, _ := newTestClient(t, "s", http.StatusNotFound, `{"error": "not_found", "error_description": "The requested purchase is not found!"}`)
	if err := c.ValidatePurchase(context.Background(), "p", "sku", "tok"); !errors.Is(err, ErrPurchaseNotValid) {
		t.Fatalf("err = %v, want ErrPurchaseNotValid", err)
	}
}

func TestValidatePurchase_OtherErrorsAreNotAVerdict(t *testing.T) {
	c, _, _ := newTestClient(t, "s", http.StatusUnauthorized, `{"error": "invalid_credentials"}`)
	err := c.ValidatePurchase(context.Background(), "p", "sku", "tok")
	if err == nil || errors.Is(err, ErrPurchaseNotValid) || !strings.Contains(err.Error(), "401") {
		t.Fatalf("err = %v, want a non-verdict error mentioning 401", err)
	}
}

func TestValidatePurchase_NoTokenConfigured(t *testing.T) {
	c := NewBazaarClient(fakeSettings{}, nil)
	if c.Enabled() {
		t.Fatal("Enabled() = true with no token")
	}
	if err := c.ValidatePurchase(context.Background(), "p", "sku", "tok"); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("err = %v, want ErrNotConfigured", err)
	}
}
