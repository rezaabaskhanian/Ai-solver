package proxyhandler

import "github.com/labstack/echo/v4"

// SetProxyRoutes registers the outbound-proxy controls on the admin group
// (see httpserver.Server): an operator tool (docs/xray-proxy-setup.md and
// the admin panel's «پراکسی Xray» tab), not part of the mobile client's
// API surface, so it's gated by middleware.Admin instead of device
// resolution + rate limiting.
func (h Handler) SetProxyRoutes(admin *echo.Group) {
	admin.POST("/proxy", h.Connect)
	admin.GET("/proxy/status", h.Status)
}
