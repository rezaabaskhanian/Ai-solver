package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestRateLimiter_AllowsBurstThenRejects(t *testing.T) {
	rl := NewRateLimiter(1, 3) // 1 req/s refill, burst of 3
	e := echo.New()
	handler := rl.Middleware(func(c echo.Context) error { return c.NoContent(http.StatusOK) })

	newCtx := func() (echo.Context, *httptest.ResponseRecorder) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "203.0.113.1:1234"
		rec := httptest.NewRecorder()
		return e.NewContext(req, rec), rec
	}

	for i := 0; i < 3; i++ {
		c, rec := newCtx()
		if err := handler(c); err != nil {
			t.Fatalf("request %d: handler returned error: %v", i, err)
		}
		if rec.Code != http.StatusOK {
			t.Fatalf("request %d: status = %d, want %d (within burst)", i, rec.Code, http.StatusOK)
		}
	}

	c, rec := newCtx()
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want %d (burst exhausted)", rec.Code, http.StatusTooManyRequests)
	}
}

func TestRateLimiter_TracksClientsIndependently(t *testing.T) {
	rl := NewRateLimiter(1, 1)
	e := echo.New()
	handler := rl.Middleware(func(c echo.Context) error { return c.NoContent(http.StatusOK) })

	for _, ip := range []string{"203.0.113.1:1", "203.0.113.2:1"} {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = ip
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		if err := handler(c); err != nil {
			t.Fatalf("handler returned error: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Fatalf("ip %s: status = %d, want %d", ip, rec.Code, http.StatusOK)
		}
	}
}
