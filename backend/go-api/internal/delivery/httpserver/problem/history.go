package problemhandler

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/errorhandling"
)

// History handles GET /api/v1/history?limit=&offset= (PRD section 21).
func (h Handler) History(c echo.Context) error {
	limit := parseIntDefault(c.QueryParam("limit"), 20, 1, 100)
	offset := parseIntDefault(c.QueryParam("offset"), 0, 0, 1_000_000)

	userID := middleware.UserIDFromContext(c)

	items, err := h.problemSvc.History(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}

	return c.JSON(http.StatusOK, map[string]any{"items": items})
}

func parseIntDefault(raw string, fallback, min, max int) int {
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil || v < min || v > max {
		return fallback
	}
	return v
}
