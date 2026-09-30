package billinghandler

import "github.com/labstack/echo/v4"

// SetBillingRoutes registers /api/v1/billing behind the given
// middlewares (device resolution + rate limiting), same as
// problemhandler.SetProblemRoutes.
func (h Handler) SetBillingRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	group := e.Group("/api/v1/billing", mws...)
	group.POST("/verify", h.Verify)
	group.GET("/plans", h.Plans)
}

// SetAdminRoutes registers the admin panel's «اشتراک‌ها» tab endpoints on
// the admin group (gated by middleware.Admin — see httpserver.Server).
func (h Handler) SetAdminRoutes(admin *echo.Group) {
	admin.GET("/plans", h.Plans)
	admin.PUT("/plans", h.SavePlan)
	admin.DELETE("/plans/:id", h.DeletePlan)
	admin.GET("/users", h.SearchUsers)
	admin.POST("/users/:id/premium", h.GrantPremium)
}
