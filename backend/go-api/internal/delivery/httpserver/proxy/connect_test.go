package proxyhandler

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"

	proxyservice "mathmotion/go-api/internal/service/proxy"
)

// The happy ("connected: true") path is covered by proxy.Service's own
// tests (internal/service/proxy/service_test.go), which can reach into
// the package to point the connectivity check at an httptest.Server; from
// out here Connect's only real logic is request parsing and error-shape
// mapping, which none of these cases need real network access for.

func newTestHandler(t *testing.T) Handler {
	t.Helper()
	configPath := filepath.Join(t.TempDir(), "config.json")
	return New(proxyservice.New(configPath, ""))
}

func TestConnect_InvalidJSONBodyReturns400(t *testing.T) {
	h := newTestHandler(t)

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"vless_link":`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := h.Connect(c); err != nil {
		t.Fatalf("Connect returned error: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestConnect_MissingVlessLinkReturns422(t *testing.T) {
	h := newTestHandler(t)

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := h.Connect(c); err != nil {
		t.Fatalf("Connect returned error: %v", err)
	}
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}
}

func TestConnect_MalformedVlessLinkReturns422(t *testing.T) {
	h := newTestHandler(t)

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"vless_link":"not-a-vless-link"}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := h.Connect(c); err != nil {
		t.Fatalf("Connect returned error: %v", err)
	}
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d, body=%s", rec.Code, http.StatusUnprocessableEntity, rec.Body.String())
	}
}
