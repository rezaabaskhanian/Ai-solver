// Package konkurprogresshandler serves the konkur progress sync and exam
// result endpoints (internal/service/konkurprogress). The user comes from
// middleware.Device: the account when logged in, else the device user.
package konkurprogresshandler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/errorhandling"
	kp "mathmotion/go-api/internal/service/konkurprogress"
)

// bodyLimit leaves room for the JSON envelope around the 512KB document.
const bodyLimit = kp.MaxProgressBytes + 16*1024

type Handler struct {
	svc kp.Service
}

func New(svc kp.Service) Handler {
	return Handler{svc: svc}
}

func (h Handler) SetRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	g := e.Group("/api/v1/konkur", mws...)
	g.GET("/progress", h.GetProgress)
	g.PUT("/progress", h.PutProgress)
	g.POST("/exam-results", h.SubmitResult)
	g.GET("/exam-results/stats", h.Stats)
}

func (h Handler) SetAdminRoutes(admin *echo.Group) {
	admin.GET("/konkur/exam-stats", h.AdminStats)
}

func invalidBody(c echo.Context) error {
	return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid_body", "message": "درخواست نامعتبر است"})
}

func (h Handler) GetProgress(c echo.Context) error {
	doc, err := h.svc.GetProgress(c.Request().Context(), middleware.UserIDFromContext(c))
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, doc)
}

type putRequest struct {
	Revision int64           `json:"revision"`
	Data     json.RawMessage `json:"data"`
}

func (h Handler) PutProgress(c echo.Context) error {
	c.Request().Body = http.MaxBytesReader(c.Response(), c.Request().Body, bodyLimit)
	var req putRequest
	if err := json.NewDecoder(c.Request().Body).Decode(&req); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			return c.JSON(http.StatusRequestEntityTooLarge, map[string]string{
				"error": "too_large", "message": "حجم داده‌ی پیشرفت بیش از حد مجاز است"})
		}
		return invalidBody(c)
	}
	if len(req.Data) == 0 {
		return invalidBody(c)
	}
	doc, err := h.svc.PutProgress(c.Request().Context(), middleware.UserIDFromContext(c), req.Revision, req.Data)
	var conflict *kp.ConflictError
	if errors.As(err, &conflict) {
		return c.JSON(http.StatusConflict, map[string]any{
			"error":      "conflict",
			"message":    conflict.Error(),
			"revision":   conflict.Current.Revision,
			"updated_at": conflict.Current.UpdatedAt,
			"data":       conflict.Current.Data,
		})
	}
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, doc)
}

func (h Handler) SubmitResult(c echo.Context) error {
	var req kp.ExamResult
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	if err := h.svc.SubmitResult(c.Request().Context(), middleware.UserIDFromContext(c), req); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "saved"})
}

func (h Handler) Stats(c echo.Context) error {
	st, err := h.svc.Stats(c.Request().Context(), middleware.UserIDFromContext(c), c.QueryParam("paper_key"))
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, st)
}

func (h Handler) AdminStats(c echo.Context) error {
	rows, err := h.svc.AdminStats(c.Request().Context())
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, rows)
}
