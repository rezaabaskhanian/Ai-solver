package problemhandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/errorhandling"
)

type solveRequest struct {
	Problem string `json:"problem"`
}

// Solve handles POST /api/v1/problems/solve (PRD section 24).
func (h Handler) Solve(c echo.Context) error {
	var req solveRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "Request body must be valid JSON.",
		})
	}

	userID := middleware.UserIDFromContext(c)
	isPremium := middleware.IsPremiumFromContext(c)

	result, err := h.problemSvc.Solve(c.Request().Context(), userID, isPremium, req.Problem)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}

	return c.JSON(http.StatusOK, result)
}
