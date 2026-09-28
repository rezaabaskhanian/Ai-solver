// Package locale carries the mobile client's UI language (from its
// Accept-Language header) through a request's context, so the math
// engine can word step explanations in it (PRD section 18) without every
// service method growing a lang parameter.
package locale

import (
	"context"
	"strings"

	"github.com/labstack/echo/v4"
)

const (
	English = "en"
	Persian = "fa"
	Default = English
)

type ctxKey struct{}

// Normalize maps an Accept-Language value ("fa", "fa-IR",
// "fa-IR,fa;q=0.9,en;q=0.8", ...) to a supported language, taking the
// first listed one; anything unsupported or empty is Default.
func Normalize(header string) string {
	first, _, _ := strings.Cut(header, ",")
	first, _, _ = strings.Cut(first, ";")
	first, _, _ = strings.Cut(strings.TrimSpace(first), "-")
	switch strings.ToLower(first) {
	case Persian:
		return Persian
	case English:
		return English
	default:
		return Default
	}
}

func WithLang(ctx context.Context, lang string) context.Context {
	return context.WithValue(ctx, ctxKey{}, lang)
}

// FromContext returns the request's language, or Default when none was set.
func FromContext(ctx context.Context) string {
	if lang, ok := ctx.Value(ctxKey{}).(string); ok && lang != "" {
		return lang
	}
	return Default
}

// Middleware stores the normalized Accept-Language on the request context.
func Middleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		req := c.Request()
		lang := Normalize(req.Header.Get(echo.HeaderAcceptLanguage))
		c.SetRequest(req.WithContext(WithLang(req.Context(), lang)))
		return next(c)
	}
}
