// Package middleware holds Echo middleware — named "middleware"
// (correct spelling) rather than Shadowing-backend's "middlware",
// which that project's own PROJECT_OVERVIEW.md flags as a naming typo
// still pending cleanup; no reason to copy a known bug into a new
// codebase.
package middleware

import (
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/pkg/errorhandling"
	userservice "mathmotion/go-api/internal/service/user"
)

const (
	userIDContextKey    = "user_id"
	isPremiumContextKey = "is_premium"
)

// Device resolves the caller to a user without any login flow: the
// mobile client sends X-Device-Id (persisted locally, e.g. MMKV); if
// absent, a new device ID is minted and echoed back in the response
// header so the client can store it for next time. This replaces
// Shadowing-backend's JWT Auth middleware — MathMotion's PRD section
// 39 explicitly says to avoid complex auth in the MVP. Swapping in
// real accounts later only means replacing this file; every other
// layer just depends on a user ID string.
func Device(userSvc userservice.Service) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			deviceID := c.Request().Header.Get("X-Device-Id")
			if deviceID == "" {
				deviceID = uuid.NewString()
			}
			c.Response().Header().Set("X-Device-Id", deviceID)

			u, err := userSvc.EnsureUser(c.Request().Context(), deviceID)
			if err != nil {
				return errorhandling.ErrorHandling(err, c)
			}

			c.Set(userIDContextKey, u.ID)
			c.Set(isPremiumContextKey, u.IsPremium)
			return next(c)
		}
	}
}

func UserIDFromContext(c echo.Context) string {
	id, _ := c.Get(userIDContextKey).(string)
	return id
}

// IsPremiumFromContext reports whether the current request's device-scoped
// user has an active Premium unlock (see internal/service/billing) — set
// alongside the user id so handlers never need a second DB round trip just
// to check entitlement.
func IsPremiumFromContext(c echo.Context) bool {
	isPremium, _ := c.Get(isPremiumContextKey).(bool)
	return isPremium
}
