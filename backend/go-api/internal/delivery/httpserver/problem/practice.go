package problemhandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/pkg/errorhandling"
)

type practiceRequest struct {
	Type string `json:"type"`
}

// Practice handles POST /api/v1/problems/practice — generates a fresh,
// unsolved problem of the requested type.
func (h Handler) Practice(c echo.Context) error {
	var req practiceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "Request body must be valid JSON.",
		})
	}

	result, err := h.problemSvc.GeneratePractice(c.Request().Context(), req.Type)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}

	return c.JSON(http.StatusOK, result)
}
