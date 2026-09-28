package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestAdmin_RejectsWhenTokenNotConfigured(t *testing.T) {
	mw := Admin("")

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/admin/proxy", nil)
	req.Header.Set("Authorization", "Bearer anything")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	nextCalled := false
	handler := mw(func(c echo.Context) error {
		nextCalled = true
		return c.NoContent(http.StatusOK)
	})

	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if nextCalled {
		t.Fatal("next handler should not run when no admin token is configured")
	}
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusServiceUnavailable)
	}
}

func TestAdmin_RejectsMissingOrWrongToken(t *testing.T) {
	cases := map[string]string{
		"no header at all":  "",
		"wrong token":       "Bearer wrong-token",
		"missing prefix":    "the-real-token",
		"empty bearer value": "Bearer ",
	}

	for name, header := range cases {
		t.Run(name, func(t *testing.T) {
			mw := Admin("the-real-token")

			e := echo.New()
			req := httptest.NewRequest(http.MethodPost, "/admin/proxy", nil)
			if header != "" {
				req.Header.Set("Authorization", header)
			}
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			nextCalled := false
			handler := mw(func(c echo.Context) error {
				nextCalled = true
				return c.NoContent(http.StatusOK)
			})

			if err := handler(c); err != nil {
				t.Fatalf("handler returned error: %v", err)
			}
			if nextCalled {
				t.Fatal("next handler should not run for an invalid Authorization header")
			}
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnauthorized)
			}
		})
	}
}

func TestAdmin_AllowsCorrectToken(t *testing.T) {
	mw := Admin("the-real-token")

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/admin/proxy", nil)
	req.Header.Set("Authorization", "Bearer the-real-token")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	nextCalled := false
	handler := mw(func(c echo.Context) error {
		nextCalled = true
		return c.NoContent(http.StatusOK)
	})

	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if !nextCalled {
		t.Fatal("expected the next handler to run for a correct token")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}
