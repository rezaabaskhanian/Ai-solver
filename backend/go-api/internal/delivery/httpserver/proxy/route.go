package proxyhandler

import "github.com/labstack/echo/v4"

// SetProxyRoutes registers the admin-only outbound-proxy control
// endpoint. Deliberately outside the /api/v1 group used by
// SetProblemRoutes/SetBillingRoutes/SetVisionRoutes: this is an operator
// tool (see docs/xray-proxy-setup.md), not part of the mobile client's
// API surface, and is gated by middleware.Admin instead of device
// resolution + rate limiting.
func (h Handler) SetProxyRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	group := e.Group("/admin/proxy", mws...)
	group.POST("", h.Connect)
}
