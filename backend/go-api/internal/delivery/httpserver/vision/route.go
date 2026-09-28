package visionhandler

import "github.com/labstack/echo/v4"

// SetVisionRoutes registers /api/v1/problems/recognize behind the given
// middlewares (device resolution + rate limiting), same as
// problemhandler.SetProblemRoutes.
func (h Handler) SetVisionRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	group := e.Group("/api/v1/problems", mws...)
	group.POST("/recognize", h.Recognize)
}
