package billing

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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
	shrinkRetryWait(t)
	if err := c.ValidatePurchase(context.Background(), "p", "sku", "tok"); !errors.Is(err, ErrPurchaseNotValid) {
		t.Fatalf("err = %v, want ErrPurchaseNotValid", err)
	}
}

func shrinkRetryWait(t *testing.T) {
	t.Helper()
	old := validateRetryWait
	validateRetryWait = time.Millisecond
	t.Cleanup(func() { validateRetryWait = old })
}

// A brand-new purchase can answer not_found once (Bazaar hasn't
// registered it yet) — the retry then gets the real answer.
func TestValidatePurchase_NotFoundRetriesThenSucceeds(t *testing.T) {
	shrinkRetryWait(t)
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls == 0 {
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"error": "not_found", "error_description": "The requested purchase is not found!"}`))
		} else {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"purchaseState": 0}`))
		}
		calls++
	}))
	t.Cleanup(srv.Close)
	c := NewBazaarClient(fakeSettings{settingskeys.KeyBazaarAPISecret: "s"}, srv.Client())
	c.validateURL = srv.URL + "/validate"

	if err := c.ValidatePurchase(context.Background(), "p", "sku", "tok"); err != nil {
		t.Fatalf("ValidatePurchase: %v", err)
	}
	if calls != 2 {
		t.Fatalf("calls = %d, want 2", calls)
	}
}

func TestValidatePurchase_NotFoundGivesUpAfterAttempts(t *testing.T) {
	shrinkRetryWait(t)
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error": "not_found"}`))
		calls++
	}))
	t.Cleanup(srv.Close)
	c := NewBazaarClient(fakeSettings{settingskeys.KeyBazaarAPISecret: "s"}, srv.Client())
	c.validateURL = srv.URL + "/validate"

	if err := c.ValidatePurchase(context.Background(), "p", "sku", "tok"); !errors.Is(err, ErrPurchaseNotValid) {
		t.Fatalf("err = %v, want ErrPurchaseNotValid", err)
	}
	if calls != validateAttempts {
		t.Fatalf("calls = %d, want %d", calls, validateAttempts)
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
