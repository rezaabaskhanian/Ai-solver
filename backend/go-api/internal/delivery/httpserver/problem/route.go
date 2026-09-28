package problemhandler

import "github.com/labstack/echo/v4"

// SetProblemRoutes registers the /api/v1/problems and /api/v1/history
// routes behind the given middlewares (device resolution + rate
// limiting — see internal/delivery/middleware).
func (h Handler) SetProblemRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	group := e.Group("/api/v1", mws...)
	group.POST("/problems/parse", h.Parse)
	group.POST("/problems/solve", h.Solve)
	group.POST("/problems/check", h.Check)
	group.POST("/problems/practice", h.Practice)
	group.GET("/history", h.History)
	group.GET("/entitlement", h.Entitlement)
}
