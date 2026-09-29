package settingshandler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/service/quota"
	settingskeys "mathmotion/go-api/internal/service/settings"
)

type memStore map[string]string

func (m memStore) Get(key string) string { return m[key] }

func (m memStore) Set(_ context.Context, key, value string) error {
	m[key] = value
	return nil
}

type fakeQuota struct{}

func (fakeQuota) Config() quota.Config {
	return quota.Config{FreePeriod: quota.PeriodDaily, FreeDailyLimit: 3}
}

type fakeProvider struct{}

func (fakeProvider) ActiveProvider() string { return "openrouter" }
func (fakeProvider) Enabled() bool          { return true }

func doRequest(t *testing.T, h Handler, method, body string, fn func(Handler, echo.Context) error) *httptest.ResponseRecorder {
	t.Helper()
	e := echo.New()
	req := httptest.NewRequest(method, "/admin/settings", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	if err := fn(h, e.NewContext(req, rec)); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	return rec
}

func TestGet_NeverReturnsFullSecret(t *testing.T) {
	store := memStore{settingskeys.KeyOpenRouterAPIKey: "sk-or-v1-abcdefghijklmnop"}
	rec := doRequest(t, New(store, fakeProvider{}, fakeQuota{}), http.MethodGet, "", Handler.Get)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "abcdefghijklmnop") {
		t.Fatalf("response leaked the full key: %s", rec.Body.String())
	}
	var resp settingsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decoding response: %v", err)
	}
	if !resp.OpenRouterKey.Set || resp.OpenRouterKey.Masked != "sk-o******mnop" {
		t.Fatalf("openrouter key = %+v, want set with masked sk-o******mnop", resp.OpenRouterKey)
	}
	if resp.AnthropicAPIKey.Set {
		t.Fatal("anthropic key reported as set, want unset")
	}
	if resp.AIProvider != "openrouter" || !resp.AIReady {
		t.Fatalf("provider = %q ready = %v, want openrouter/true", resp.AIProvider, resp.AIReady)
	}
}

func TestUpdate_SavesTrimmedValue(t *testing.T) {
	store := memStore{}
	rec := doRequest(t, New(store, fakeProvider{}, fakeQuota{}), http.MethodPut,
		`{"key":"DEEPSEEK_MODEL","value":"  deepseek-chat  "}`, Handler.Update)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body=%s", rec.Code, rec.Body.String())
	}
	if store[settingskeys.KeyDeepSeekModel] != "deepseek-chat" {
		t.Fatalf("saved = %q, want %q", store[settingskeys.KeyDeepSeekModel], "deepseek-chat")
	}
}

func TestUpdate_RejectsUnknownKey(t *testing.T) {
	store := memStore{}
	rec := doRequest(t, New(store, fakeProvider{}, fakeQuota{}), http.MethodPut,
		`{"key":"XRAY_VLESS_LINK","value":"vless://x"}`, Handler.Update)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rec.Code)
	}
	if len(store) != 0 {
		t.Fatalf("store = %v, want nothing saved", store)
	}
}

func TestUpdate_RejectsUnknownProvider(t *testing.T) {
	store := memStore{}
	rec := doRequest(t, New(store, fakeProvider{}, fakeQuota{}), http.MethodPut,
		`{"key":"AI_PROVIDER","value":"gemini"}`, Handler.Update)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rec.Code)
	}
}

func TestUpdate_NormalizesProviderCase(t *testing.T) {
	store := memStore{}
	rec := doRequest(t, New(store, fakeProvider{}, fakeQuota{}), http.MethodPut,
		`{"key":"AI_PROVIDER","value":"DeepSeek"}`, Handler.Update)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if store[settingskeys.KeyAIProvider] != "deepseek" {
		t.Fatalf("saved = %q, want deepseek", store[settingskeys.KeyAIProvider])
	}
}
