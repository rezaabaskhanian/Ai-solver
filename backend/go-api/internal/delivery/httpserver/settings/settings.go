package settingshandler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/service/quota"
	settingskeys "mathmotion/go-api/internal/service/settings"
)

// secretItem never carries the secret itself — only whether it's set and
// a masked form (first/last 4 characters) to tell keys apart.
type secretItem struct {
	Set    bool   `json:"set"`
	Masked string `json:"masked"`
}

type settingsResponse struct {
	AIProvider      string     `json:"ai_provider"`
	AIReady         bool       `json:"ai_ready"`
	AnthropicAPIKey secretItem `json:"anthropic_api_key"`
	ClaudeModel     string     `json:"claude_model"`
	OpenRouterKey   secretItem `json:"openrouter_api_key"`
	OpenRouterModel string     `json:"openrouter_model"`
	DeepSeekAPIKey  secretItem `json:"deepseek_api_key"`
	DeepSeekModel   string     `json:"deepseek_model"`
	// Usage limits in effect (saved value, else .env, else default).
	Quota quota.Config `json:"quota"`
}

func maskSecret(v string) string {
	if v == "" {
		return ""
	}
	if len(v) <= 8 {
		return strings.Repeat("*", len(v))
	}
	return v[:4] + strings.Repeat("*", 6) + v[len(v)-4:]
}

// Get handles GET /admin/settings.
func (h Handler) Get(c echo.Context) error {
	secret := func(key string) secretItem {
		v := h.store.Get(key)
		return secretItem{Set: v != "", Masked: maskSecret(v)}
	}

	return c.JSON(http.StatusOK, settingsResponse{
		AIProvider:      h.provider.ActiveProvider(),
		AIReady:         h.provider.Enabled(),
		AnthropicAPIKey: secret(settingskeys.KeyAnthropicAPIKey),
		ClaudeModel:     h.store.Get(settingskeys.KeyClaudeModel),
		OpenRouterKey:   secret(settingskeys.KeyOpenRouterAPIKey),
		OpenRouterModel: h.store.Get(settingskeys.KeyOpenRouterModel),
		DeepSeekAPIKey:  secret(settingskeys.KeyDeepSeekAPIKey),
		DeepSeekModel:   h.store.Get(settingskeys.KeyDeepSeekModel),
		Quota:           h.quota.Config(),
	})
}

type updateRequest struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

var validProviders = map[string]bool{"anthropic": true, "openrouter": true, "deepseek": true}

// Update handles PUT /admin/settings: saves one key, effective on the very
// next request (no restart). An empty value clears the saved override, so
// the .env value (if any) applies again.
func (h Handler) Update(c echo.Context) error {
	var req updateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "Request body must be valid JSON.",
		})
	}
	if !settingskeys.EditableKeys[req.Key] {
		return c.JSON(http.StatusUnprocessableEntity, map[string]string{
			"error":   "invalid_input",
			"message": "Unknown setting key.",
		})
	}

	value := strings.TrimSpace(req.Value)
	if req.Key == settingskeys.KeyAIProvider {
		value = strings.ToLower(value)
		if !validProviders[value] {
			return c.JSON(http.StatusUnprocessableEntity, map[string]string{
				"error":   "invalid_input",
				"message": "AI_PROVIDER must be one of: anthropic, openrouter, deepseek.",
			})
		}
	}

	switch req.Key {
	case settingskeys.KeyFreeQuotaPeriod:
		value = strings.ToLower(value)
		if value != "" && value != quota.PeriodDaily && value != quota.PeriodLifetime {
			return c.JSON(http.StatusUnprocessableEntity, map[string]string{
				"error":   "invalid_input",
				"message": "FREE_QUOTA_PERIOD must be daily or lifetime.",
			})
		}
	case settingskeys.KeyFreeDailyLimit, settingskeys.KeyFreeLifetimeLimit, settingskeys.KeyPremiumDailyScanLimit:
		if n, err := strconv.Atoi(value); value != "" && (err != nil || n < 0 || n > 100000) {
			return c.JSON(http.StatusUnprocessableEntity, map[string]string{
				"error":   "invalid_input",
				"message": req.Key + " must be a whole number between 0 and 100000.",
			})
		}
	}

	if err := h.store.Set(c.Request().Context(), req.Key, value); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "internal",
			"message": "Could not save the setting.",
		})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "saved"})
}
