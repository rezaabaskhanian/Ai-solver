package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// Admin gates the operator-only /admin/* endpoints (settings, Xray proxy)
// behind a static bearer token from config -- there's no real admin user
// system in this MVP, unlike Device which resolves the mobile client's
// device-scoped users. An empty token always rejects (fails closed): the
// endpoints are unusable rather than unlocked if ADMIN_TOKEN was never
// configured.
func Admin(token string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if token == "" {
				return c.JSON(http.StatusServiceUnavailable, map[string]string{
					"error":   "admin_disabled",
					"message": "Admin endpoints are not configured (ADMIN_TOKEN is unset).",
				})
			}

			const bearerPrefix = "Bearer "
			auth := c.Request().Header.Get("Authorization")
			provided, hasPrefix := strings.CutPrefix(auth, bearerPrefix)
			// subtle.ConstantTimeCompare requires equal-length inputs to be
			// meaningfully constant-time; a length mismatch alone already
			// tells an attacker nothing they couldn't learn by timing a
			// request against a known-wrong token, so it's fine to branch
			// on hasPrefix/length before the constant-time comparison.
			if !hasPrefix || subtle.ConstantTimeCompare([]byte(provided), []byte(token)) != 1 {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error":   "unauthorized",
					"message": "Missing or invalid Authorization header.",
				})
			}

			return next(c)
		}
	}
}
