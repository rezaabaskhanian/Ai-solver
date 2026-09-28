package billinghandler

import "github.com/labstack/echo/v4"

// SetBillingRoutes registers /api/v1/billing behind the given
// middlewares (device resolution + rate limiting), same as
// problemhandler.SetProblemRoutes.
func (h Handler) SetBillingRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	group := e.Group("/api/v1/billing", mws...)
	group.POST("/verify", h.Verify)
}
