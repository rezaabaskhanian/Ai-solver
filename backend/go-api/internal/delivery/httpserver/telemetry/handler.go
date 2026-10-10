// Package telemetryhandler serves POST /api/v1/telemetry (the app's error /
// usage reports) and the admin panel's «خطاها و آمار» endpoints.
package telemetryhandler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/service/telemetry"
)

const maxBody = 256 * 1024

type Handler struct {
	svc telemetry.Service
}

func New(svc telemetry.Service) Handler {
	return Handler{svc: svc}
}

// SetRoutes registers the app endpoint (device-resolved + rate limited).
func (h Handler) SetRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	e.POST("/api/v1/telemetry", h.Ingest, mws...)
}

func (h Handler) SetAdminRoutes(admin *echo.Group) {
	admin.GET("/telemetry/summary", h.Summary)
	admin.GET("/telemetry/events", h.Events)
	admin.POST("/telemetry/purge", h.Purge)
}

type batchRequest struct {
	Events []json.RawMessage `json:"events"`
}

// Ingest handles POST /api/v1/telemetry. It never fails the app: whatever
// is wrong with the body or the database, the answer is 202.
func (h Handler) Ingest(c echo.Context) error {
	c.Request().Body = http.MaxBytesReader(c.Response(), c.Request().Body, maxBody)
	var req batchRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		return c.JSON(http.StatusAccepted, map[string]int{"accepted": 0})
	}
	var deviceID string
	if u := middleware.UserFromContext(c); u.DeviceID != "" {
		deviceID = u.DeviceID
	} else {
		deviceID = c.Response().Header().Get("X-Device-Id")
	}
	n, err := h.svc.Ingest(c.Request().Context(), middleware.UserIDFromContext(c), deviceID,
		telemetry.ParseBatch(req.Events))
	if err != nil {
		log.Printf("telemetry ingest: %v", err)
		n = 0
	}
	return c.JSON(http.StatusAccepted, map[string]int{"accepted": n})
}

func internalErr(c echo.Context, err error) error {
	log.Printf("telemetry admin: %v", err)
	return c.JSON(http.StatusInternalServerError, map[string]string{
		"error": "internal", "message": "خطا در خواندن گزارش خطاها",
	})
}

// Summary handles GET /admin/telemetry/summary.
func (h Handler) Summary(c echo.Context) error {
	sum, err := h.svc.Summary(c.Request().Context())
	if err != nil {
		return internalErr(c, err)
	}
	return c.JSON(http.StatusOK, sum)
}

// Events handles GET /admin/telemetry/events?kind=&q=&limit=.
func (h Handler) Events(c echo.Context) error {
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	rows, err := h.svc.Recent(c.Request().Context(), c.QueryParam("kind"), c.QueryParam("q"), limit)
	if err != nil {
		return internalErr(c, err)
	}
	return c.JSON(http.StatusOK, map[string]any{"events": rows})
}

// Purge handles POST /admin/telemetry/purge?days=N (default 60).
func (h Handler) Purge(c echo.Context) error {
	days := 60
	if v := c.QueryParam("days"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 3650 {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "bad_request", "message": "days باید عددی بین ۱ تا ۳۶۵۰ باشد",
			})
		}
		days = n
	}
	deleted, err := h.svc.Purge(c.Request().Context(), days)
	if err != nil {
		return internalErr(c, err)
	}
	return c.JSON(http.StatusOK, map[string]int64{"deleted": deleted})
}
