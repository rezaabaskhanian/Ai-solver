package settingshandler

import "github.com/labstack/echo/v4"

// SetSettingsRoutes registers the admin panel's «هوش مصنوعی» tab endpoints
// on the admin group (gated by middleware.Admin — see httpserver.Server).
func (h Handler) SetSettingsRoutes(admin *echo.Group) {
	admin.GET("/settings", h.Get)
	admin.PUT("/settings", h.Update)
}
