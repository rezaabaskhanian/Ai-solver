// Package smsservice sends the sign-up / password-reset codes through
// sms.ir's OTP ("verify") API — the same provider and request as LingoFlow
// (Shadowing-backend service/sms/smsir.go).
// https://app.sms.ir/developer/help/introduction
package smsservice

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	settingskeys "mathmotion/go-api/internal/service/settings"
)

const smsIrVerifyURL = "https://api.sms.ir/v1/send/verify"

// ErrNotConfigured: no API key / template id in the admin panel or .env.
var ErrNotConfigured = errors.New("sms.ir is not configured")

// Settings is read on every send, so keys saved in the admin panel work
// without a restart (.env is the fallback — see internal/service/settings).
type Settings interface {
	Get(key string) string
}

type Client struct {
	settings Settings
	http     *http.Client
	url      string
}

func NewClient(settings Settings, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}
	return &Client{settings: settings, http: httpClient, url: smsIrVerifyURL}
}

func (c *Client) config() (apiKey string, templateID int) {
	apiKey = strings.TrimSpace(c.settings.Get(settingskeys.KeySMSIrAPIKey))
	templateID, _ = strconv.Atoi(strings.TrimSpace(c.settings.Get(settingskeys.KeySMSIrTemplateID)))
	return apiKey, templateID
}

// Enabled reports whether both the API key and the template id are set.
func (c *Client) Enabled() bool {
	key, id := c.config()
	return key != "" && id != 0
}

type verifyParameter struct {
	Name  string `json:"Name"`
	Value string `json:"Value"`
}

type verifyRequest struct {
	Mobile     string            `json:"Mobile"`
	TemplateID int               `json:"TemplateId"`
	Parameters []verifyParameter `json:"Parameters"`
}

type verifyResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
}

// SendCode texts code to phone through the OTP template, whose text must
// contain the #CODE# parameter.
func (c *Client) SendCode(ctx context.Context, phone, code string) error {
	apiKey, templateID := c.config()
	if apiKey == "" || templateID == 0 {
		return ErrNotConfigured
	}

	payload, err := json.Marshal(verifyRequest{
		Mobile:     phone,
		TemplateID: templateID,
		Parameters: []verifyParameter{{Name: "CODE", Value: code}},
	})
	if err != nil {
		return fmt.Errorf("encoding sms.ir request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-KEY", apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("calling sms.ir: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("sms.ir returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var vr verifyResponse
	if err := json.Unmarshal(body, &vr); err != nil {
		return fmt.Errorf("decoding sms.ir response: %w", err)
	}
	if vr.Status != 1 {
		return fmt.Errorf("sms.ir send failed: %s", vr.Message)
	}
	return nil
}
