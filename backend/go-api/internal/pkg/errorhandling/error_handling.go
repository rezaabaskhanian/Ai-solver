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
	default:
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":   "internal_error",
			"message": richErr.Message(),
		})
	}
}
