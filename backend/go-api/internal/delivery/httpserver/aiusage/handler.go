// Package aiusagehandler serves the admin panel's «هزینه‌ی هوش مصنوعی»
// report (internal/service/aiusage).
package aiusagehandler

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/service/aiusage"
)

type Handler struct {
	svc aiusage.Service
}

func New(svc aiusage.Service) Handler {
	return Handler{svc: svc}
}

func (h Handler) SetAdminRoutes(admin *echo.Group) {
	admin.GET("/ai-usage", h.Report)
}

// Report handles GET /admin/ai-usage?days=30.
func (h Handler) Report(c echo.Context) error {
	days := 30
	if n, err := strconv.Atoi(c.QueryParam("days")); err == nil && n > 0 && n <= 366 {
		days = n
	}
	report, err := h.svc.Report(c.Request().Context(), days)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal", "message": "خطا در خواندن گزارش هزینه‌ی هوش مصنوعی",
		})
	}
	return c.JSON(http.StatusOK, report)
}
