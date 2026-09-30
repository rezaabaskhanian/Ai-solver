// Package billing verifies Cafe Bazaar in-app purchases server-side
// (never trust the client's "I paid" claim) and grants Premium: either a
// time-limited plan (subscription_plans — monthly etc., each an in-app
// product that adds N days) or the old one-time lifetime unlock. It also
// backs the admin panel's user/plan management (admin.go).
//
// Client shape mirrors internal/service/problem/mathengine_client.go:
// its own small HTTP client, its own response structs, placed next to
// the one service that uses it.
package billing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	settingskeys "mathmotion/go-api/internal/service/settings"
)

// Cafe Bazaar's Pishkhan API ("راه اندازی API — روش جدید"): one token per
// app, sent in a header on every call — no OAuth client/refresh token.
// Same integration as LingoFlow (Shadowing-backend billing/cafebazaar.go).
const (
	bazaarValidateURL = "https://pardakht.cafebazaar.ir/devapi/v2/api/validate"
	bazaarAuthHeader  = "CAFEBAZAAR-PISHKHAN-API-SECRET"
)

// PurchaseState mirrors Cafe Bazaar's validate response — only 0 means
// the purchase is genuine and still valid.
type PurchaseState int

const (
	PurchaseStatePurchased PurchaseState = 0
	PurchaseStateRefunded  PurchaseState = 1
)

var (
	// ErrNotConfigured: no API token saved in the admin panel or .env.
	ErrNotConfigured = errors.New("cafe bazaar API token is not configured")
	// ErrPurchaseNotValid: Bazaar says this token was never bought, or was refunded.
	ErrPurchaseNotValid = errors.New("purchase is not valid")
)

// Settings is where the API token is read from on every call, so a token
// saved in the admin panel works without a restart (.env is the fallback —
// see internal/service/settings).
type Settings interface {
	Get(key string) string
}

type BazaarClient struct {
	settings Settings
	http     *http.Client
	// Real endpoint by default; tests point it at an httptest.Server.
	validateURL string
}

func NewBazaarClient(settings Settings, httpClient *http.Client) *BazaarClient {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &BazaarClient{settings: settings, http: httpClient, validateURL: bazaarValidateURL}
}

// Enabled reports whether an API token is set.
func (c *BazaarClient) Enabled() bool {
	return strings.TrimSpace(c.settings.Get(settingskeys.KeyBazaarAPISecret)) != ""
}

type validateResponse struct {
	PurchaseState *int `json:"purchaseState"`
}

type bazaarError struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

// ValidatePurchase confirms purchaseToken is a genuine, unrefunded
// purchase of productID. productID is part of the URL, so a token for a
// cheaper product can't be passed off as a pricier plan. Returns
// ErrPurchaseNotValid when Bazaar says no, any other error when Bazaar
// couldn't be asked.
func (c *BazaarClient) ValidatePurchase(ctx context.Context, packageName, productID, purchaseToken string) error {
	secret := strings.TrimSpace(c.settings.Get(settingskeys.KeyBazaarAPISecret))
	if secret == "" {
		return ErrNotConfigured
	}

	validateURL := fmt.Sprintf("%s/%s/inapp/%s/purchases/%s/",
		c.validateURL,
		url.PathEscape(packageName),
		url.PathEscape(productID),
		url.PathEscape(purchaseToken),
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, validateURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set(bazaarAuthHeader, secret)
	req.Header.Set("Accept", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("calling bazaar validate: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return fmt.Errorf("reading bazaar validate response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var be bazaarError
		// Per Bazaar's docs only not_found means "no such purchase" (a
		// possibly forged token); anything else is a problem on our side
		// (bad token, wrong package name) or theirs.
		if json.Unmarshal(body, &be) == nil && be.Error == "not_found" {
			return ErrPurchaseNotValid
		}
		return fmt.Errorf("bazaar validate returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var v validateResponse
	if err := json.Unmarshal(body, &v); err != nil {
		return fmt.Errorf("decoding bazaar validate response: %w", err)
	}
	if v.PurchaseState == nil {
		return errors.New("bazaar validate response has no purchaseState")
	}
	if PurchaseState(*v.PurchaseState) != PurchaseStatePurchased {
		return ErrPurchaseNotValid
	}
	return nil
}
