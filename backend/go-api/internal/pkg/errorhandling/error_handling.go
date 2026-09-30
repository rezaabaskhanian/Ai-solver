// Package errorhandling maps a richerror.RichError (or any plain
// error) to the JSON error shape the mobile client expects, in one
// place, so handlers never write status-code logic themselves.
package errorhandling

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/pkg/richerror"
)

func ErrorHandling(err error, c echo.Context) error {
	richErr, ok := err.(richerror.RichError)
	if !ok {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "internal_error",
			"message": err.Error(),
		})
	}

	switch richErr.Kind() {
	case richerror.KindInvalid:
		return c.JSON(http.StatusUnprocessableEntity, map[string]string{
			"error":   "invalid_input",
			"message": richErr.Message(),
		})
	case richerror.KindNotFound:
		return c.JSON(http.StatusNotFound, map[string]string{
			"error":   "not_found",
			"message": richErr.Message(),
		})
	case richerror.KindPaymentRequired:
		return c.JSON(http.StatusPaymentRequired, map[string]string{
			"error":   "quota_exceeded",
			"message": richErr.Message(),
		})
	case richerror.KindTooManyRequests:
		// Distinct from the rate limiter's "rate_limited": this one resets
		// at midnight, not in a few seconds.
		return c.JSON(http.StatusTooManyRequests, map[string]string{
			"error":   "daily_limit_reached",
			"message": richErr.Message(),
		})
	case richerror.KindConflict:
		return c.JSON(http.StatusConflict, map[string]string{
			"error":   "conflict",
			"message": richErr.Message(),
		})
	case richerror.KindUnauthorized:
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error":   "unauthorized",
			"message": richErr.Message(),
		})
	default:
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "internal_error",
			"message": richErr.Message(),
		})
	}
}
