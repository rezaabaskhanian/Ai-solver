package locale

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestNormalize(t *testing.T) {
	cases := map[string]string{
		"fa":                      Persian,
		"FA":                      Persian,
		"fa-IR":                   Persian,
		"fa-IR,fa;q=0.9,en;q=0.8": Persian,
		"en-US,en;q=0.9":          English,
		"de-DE":                   Default,
		"":                        Default,
		"  fa ; q=1":              Persian,
	}
	for header, want := range cases {
		if got := Normalize(header); got != want {
			t.Errorf("Normalize(%q) = %q, want %q", header, got, want)
		}
	}
}

func TestFromContext_DefaultsWhenUnset(t *testing.T) {
	if got := FromContext(context.Background()); got != Default {
		t.Fatalf("FromContext = %q, want %q", got, Default)
	}
}

func TestMiddleware_PutsLangOnRequestContext(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.Header.Set(HeaderAcceptLanguage, "fa-IR")
	rec := httptest.NewRecorder()

	var got string
	h := Middleware(func(c echo.Context) error {
		got = FromContext(c.Request().Context())
		return nil
	})
	if err := h(e.NewContext(req, rec)); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if got != Persian {
		t.Fatalf("lang = %q, want %q", got, Persian)
	}
}
