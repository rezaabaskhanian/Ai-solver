package problemhandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/pkg/errorhandling"
)

type parseRequest struct {
	Input string `json:"input"`
}

// Parse handles POST /api/v1/problems/parse (PRD section 24). This is
// a pure validation step: it does not persist anything, it just tells
// the client whether the input is understood before the user commits
// to solving it (PRD section 7 "Validation").
func (h Handler) Parse(c echo.Context) error {
	var req parseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "Request body must be valid JSON.",
		})
	}

	result, err := h.problemSvc.Parse(c.Request().Context(), req.Input)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}

	return c.JSON(http.StatusOK, result)
}
