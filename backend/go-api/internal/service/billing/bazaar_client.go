// Package billing verifies Cafe Bazaar in-app purchases server-side
// (never trust the client's "I paid" claim) and grants Premium — the
// one-time unlock that removes the free-tier solve quota enforced in
// internal/service/problem.Solve.
//
// Client shape mirrors internal/service/problem/mathengine_client.go:
// its own small HTTP client, its own response structs, placed next to
// the one service that uses it.
package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	bazaarAuthURL     = "https://pardakht.cafebazaar.ir/devapi/v2/auth/token/"
	bazaarValidateURL = "https://pardakht.cafebazaar.ir/devapi/v2/api/validate"
)

// PurchaseState mirrors Cafe Bazaar's Purchase Validator response —
// only 0 means the purchase is genuine and still valid.
type PurchaseState int

const (
	PurchaseStatePurchased PurchaseState = 0
	PurchaseStateRefunded  PurchaseState = 1
	PurchaseStateCanceled  PurchaseState = 2
)

type BazaarClient struct {
	clientID     string
	clientSecret string
	refreshToken string
	http         *http.Client

	// authURL/validateURL default to Cafe Bazaar's real endpoints;
	// overridden directly (white-box, same package) in tests to point
	// at an httptest.Server standing in for Bazaar.
	authURL     string
	validateURL string

	mu          sync.Mutex
	accessToken string
	expiresAt   time.Time
}

func NewBazaarClient(clientID, clientSecret, refreshToken string) *BazaarClient {
	return &BazaarClient{
		clientID:     clientID,
		clientSecret: clientSecret,
		refreshToken: refreshToken,
		http:         &http.Client{Timeout: 10 * time.Second},
		authURL:      bazaarAuthURL,
		validateURL:  bazaarValidateURL,
	}
}

type PurchaseInfo struct {
	PurchaseState PurchaseState `json:"purchaseState"`
}

// ValidatePurchase confirms a purchase token with Cafe Bazaar's
// Purchase Validator API. See mobile/MathMotion/APP.md for the
// one-time Pishkhan (developer panel) setup ClientID/ClientSecret/
// RefreshToken depend on.
func (c *BazaarClient) ValidatePurchase(ctx context.Context, packageName, productID, purchaseToken string) (PurchaseInfo, error) {
	accessToken, err := c.accessTokenFor(ctx)
	if err != nil {
		return PurchaseInfo{}, fmt.Errorf("obtaining bazaar access token: %w", err)
	}

	validateURL := fmt.Sprintf("%s/%s/inapp/%s/purchases/%s/?access_token=%s",
		c.validateURL,
		url.PathEscape(packageName),
		url.PathEscape(productID),
		url.PathEscape(purchaseToken),
		url.QueryEscape(accessToken),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, validateURL, nil)
	if err != nil {
		return PurchaseInfo{}, err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return PurchaseInfo{}, fmt.Errorf("calling bazaar validate: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return PurchaseInfo{}, fmt.Errorf("bazaar validate returned status %d", resp.StatusCode)
	}

	var info PurchaseInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return PurchaseInfo{}, fmt.Errorf("decoding bazaar validate response: %w", err)
	}
	return info, nil
}

// accessTokenFor returns a cached access token, refreshing it via the
// refresh_token grant once it's within a minute of expiring.
func (c *BazaarClient) accessTokenFor(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.accessToken != "" && time.Now().Before(c.expiresAt.Add(-time.Minute)) {
		return c.accessToken, nil
	}

	form := url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
		"refresh_token": {c.refreshToken},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.authURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("calling bazaar auth: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("bazaar auth returned status %d", resp.StatusCode)
	}

	var body struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", fmt.Errorf("decoding bazaar auth response: %w", err)
	}

	c.accessToken = body.AccessToken
	c.expiresAt = time.Now().Add(time.Duration(body.ExpiresIn) * time.Second)
	return c.accessToken, nil
}
