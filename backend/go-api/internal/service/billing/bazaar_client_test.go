package billing

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// newFakeBazaarServer stands in for Cafe Bazaar's OAuth + Purchase
// Validator endpoints. purchaseState is returned verbatim from the
// validate endpoint; authCalls counts how many times the auth endpoint
// was hit, so tests can assert the access token gets cached.
func newFakeBazaarServer(t *testing.T, purchaseState PurchaseState) (*httptest.Server, *int) {
	t.Helper()
	authCalls := 0

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasPrefix(r.URL.Path, "/auth"):
			authCalls++
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"access_token": "fake-access-token",
				"expires_in":   3600,
			})
		case strings.HasPrefix(r.URL.Path, "/validate"):
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"purchaseState": purchaseState,
			})
		default:
			http.NotFound(w, r)
		}
	}))
	return srv, &authCalls
}

func newTestBazaarClient(srv *httptest.Server) *BazaarClient {
	return &BazaarClient{
		clientID:     "client-id",
		clientSecret: "client-secret",
		refreshToken: "refresh-token",
		http:         srv.Client(),
		authURL:      srv.URL + "/auth",
		validateURL:  srv.URL + "/validate",
	}
}

func TestBazaarClient_ValidatePurchase_Purchased(t *testing.T) {
	srv, _ := newFakeBazaarServer(t, PurchaseStatePurchased)
	defer srv.Close()

	client := newTestBazaarClient(srv)
	info, err := client.ValidatePurchase(context.Background(), "com.mathmotion", "premium_unlock", "token-1")
	if err != nil {
		t.Fatalf("ValidatePurchase returned error: %v", err)
	}
	if info.PurchaseState != PurchaseStatePurchased {
		t.Fatalf("PurchaseState = %v, want %v", info.PurchaseState, PurchaseStatePurchased)
	}
}

func TestBazaarClient_ValidatePurchase_Refunded(t *testing.T) {
	srv, _ := newFakeBazaarServer(t, PurchaseStateRefunded)
	defer srv.Close()

	client := newTestBazaarClient(srv)
	info, err := client.ValidatePurchase(context.Background(), "com.mathmotion", "premium_unlock", "token-1")
	if err != nil {
		t.Fatalf("ValidatePurchase returned error: %v", err)
	}
	if info.PurchaseState != PurchaseStateRefunded {
		t.Fatalf("PurchaseState = %v, want %v", info.PurchaseState, PurchaseStateRefunded)
	}
}

func TestBazaarClient_AccessTokenIsCachedAcrossCalls(t *testing.T) {
	srv, authCalls := newFakeBazaarServer(t, PurchaseStatePurchased)
	defer srv.Close()

	client := newTestBazaarClient(srv)
	for i := 0; i < 3; i++ {
		if _, err := client.ValidatePurchase(context.Background(), "com.mathmotion", "premium_unlock", "token-1"); err != nil {
			t.Fatalf("ValidatePurchase call %d returned error: %v", i, err)
		}
	}

	if *authCalls != 1 {
		t.Fatalf("auth endpoint called %d times, want 1 (token should be cached)", *authCalls)
	}
}
