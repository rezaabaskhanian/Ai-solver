package proxyhandler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type connectRequest struct {
	VlessLink string `json:"vless_link"`
}

// Connect handles POST /admin/proxy: parses the given vless://
// (VLESS+Reality) link, writes it as the Xray sidecar's config, and
// tests the resulting tunnel with a real outbound request. Mirrors
// docs/xray-proxy-setup.md's manual "paste link, hit connect, check
// connected: true" step, done in one call. A malformed link is a 422; a
// well-formed link that just doesn't work comes back as 200 with
// connected: false (and Error explaining why) so the operator can see
// what to fix without reading server logs.
func (h Handler) Connect(c echo.Context) error {
	var req connectRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "Request body must be valid JSON.",
		})
	}
	if req.VlessLink == "" {
		return c.JSON(http.StatusUnprocessableEntity, map[string]string{
			"error":   "invalid_input",
			"message": "vless_link is required.",
		})
	}

	result, err := h.proxySvc.Connect(c.Request().Context(), req.VlessLink)
	if err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]string{
			"error":   "invalid_input",
			"message": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, result)
}
