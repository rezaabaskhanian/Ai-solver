// Package middleware holds Echo middleware — named "middleware"
// (correct spelling) rather than Shadowing-backend's "middlware",
// which that project's own PROJECT_OVERVIEW.md flags as a naming typo
// still pending cleanup; no reason to copy a known bug into a new
// codebase.
package middleware

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	domain "mathmotion/go-api/internal/domain/user"
	"mathmotion/go-api/internal/pkg/errorhandling"
	"mathmotion/go-api/internal/service/quota"
	userservice "mathmotion/go-api/internal/service/user"
)

const (
	userIDContextKey    = "user_id"
	isPremiumContextKey = "is_premium"
	userContextKey      = "user"
	loggedInContextKey  = "logged_in"
)

// TokenParser checks a login access token (internal/service/auth).
type TokenParser interface {
	ParseAccessToken(token string) (userID string, err error)
}

// Device resolves the caller to a user without any login flow: the
// mobile client sends X-Device-Id (persisted locally, e.g. MMKV); if
// absent, a new device ID is minted and echoed back in the response
// header so the client can store it for next time. This replaces
// Shadowing-backend's JWT Auth middleware — MathMotion's PRD section
// 39 explicitly says to avoid complex auth in the MVP. Swapping in
// real accounts later only means replacing this file; every other
// layer just depends on a user ID string.
//
// Since accounts exist (internal/service/account), a request carrying a
// login token ("Authorization: Bearer <access token>") is that account
// instead — wherever it logs in from. A missing token still falls back to
// the device (app versions from before login), but a present, invalid or
// expired one is a 401 so the app refreshes it or shows the login screen.
// tokens may be nil (tests): then only the device is used.
func Device(userSvc userservice.Service, tokens TokenParser) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			deviceID := c.Request().Header.Get("X-Device-Id")
			if deviceID == "" {
				deviceID = uuid.NewString()
			}
			c.Response().Header().Set("X-Device-Id", deviceID)

			var (
				u        domain.User
				err      error
				loggedIn bool
			)
			bearer, hasBearer := strings.CutPrefix(c.Request().Header.Get("Authorization"), "Bearer ")
			if hasBearer && tokens != nil {
				userID, perr := tokens.ParseAccessToken(strings.TrimSpace(bearer))
				if perr == nil {
					u, err = userSvc.GetUser(c.Request().Context(), userID)
				}
				if perr != nil || errors.Is(err, domain.ErrNotFound) {
					return c.JSON(http.StatusUnauthorized, map[string]string{
						"error":   "unauthorized",
						"message": "نشست منقضی شده، دوباره وارد شو",
					})
				}
				loggedIn = true
			} else {
				u, err = userSvc.EnsureUser(c.Request().Context(), deviceID)
			}
			if err != nil {
				return errorhandling.ErrorHandling(err, c)
			}
			c.Set(loggedInContextKey, loggedIn)

			c.Set(userIDContextKey, u.ID)
			c.Set(isPremiumContextKey, u.HasPremium(time.Now()))
			c.Set(userContextKey, u)
			// Services only see the request context, so an admin-granted
			// "unlimited" user is marked there for internal/service/quota.
			c.SetRequest(c.Request().WithContext(quota.WithUnlimited(c.Request().Context(), u.IsUnlimited)))
			return next(c)
		}
	}
}

func UserIDFromContext(c echo.Context) string {
	id, _ := c.Get(userIDContextKey).(string)
	return id
}

// IsLoggedInFromContext reports whether the request came with a valid
// login token (not just a device id).
func IsLoggedInFromContext(c echo.Context) bool {
	v, _ := c.Get(loggedInContextKey).(bool)
	return v
}

// UserFromContext is the whole resolved user (code, plan expiry...), for
// the few handlers that report it back — GET /api/v1/entitlement.
func UserFromContext(c echo.Context) domain.User {
	u, _ := c.Get(userContextKey).(domain.User)
	return u
}

// IsPremiumFromContext reports whether the current request's device-scoped
// user has any active Premium — the lifetime unlock, an unexpired plan, or
// admin-granted unlimited (see domain/user.HasPremium) — set
// alongside the user id so handlers never need a second DB round trip just
// to check entitlement.
func IsPremiumFromContext(c echo.Context) bool {
	isPremium, _ := c.Get(isPremiumContextKey).(bool)
	return isPremium
}
