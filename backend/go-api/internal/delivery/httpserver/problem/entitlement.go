package problemhandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/errorhandling"
)

// Entitlement handles GET /api/v1/entitlement — lets the mobile client
// show a paywall before Solve ever rejects a request (see
// problemservice.Entitlement).
func (h Handler) Entitlement(c echo.Context) error {
	userID := middleware.UserIDFromContext(c)
	isPremium := middleware.IsPremiumFromContext(c)

	result, err := h.problemSvc.Entitlement(c.Request().Context(), userID, isPremium)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}

	return c.JSON(http.StatusOK, result)
}
