package problemhandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/errorhandling"
)

type checkRequest struct {
	Problem      string   `json:"problem"`
	StudentSteps []string `json:"student_steps"`
}

// Check handles POST /api/v1/problems/check — tells the client whether
// the student's own step-by-step attempt is correct.
func (h Handler) Check(c echo.Context) error {
	var req checkRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "Request body must be valid JSON.",
		})
	}

	userID := middleware.UserIDFromContext(c)
	isPremium := middleware.IsPremiumFromContext(c)

	result, err := h.problemSvc.Check(c.Request().Context(), userID, isPremium, req.Problem, req.StudentSteps)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}

	return c.JSON(http.StatusOK, result)
}
