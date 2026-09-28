package proxyhandler

import (
	"log"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	proxyservice "mathmotion/go-api/internal/service/proxy"
	settingskeys "mathmotion/go-api/internal/service/settings"
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
	req.VlessLink = strings.TrimSpace(req.VlessLink)
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

	// The link parsed and was written as Xray's config, so it's the one
	// in effect now — remember it even if the tunnel test failed, so the
	// panel shows (and lets the operator fix) what's actually configured.
	if err := h.linkStore.Set(c.Request().Context(), settingskeys.KeyXrayVlessLink, req.VlessLink); err != nil {
		log.Printf("proxy: saving last vless link: %v", err)
	}

	return c.JSON(http.StatusOK, result)
}

type statusResponse struct {
	proxyservice.ConnectResult
	Link string `json:"link"`
}

// Status handles GET /admin/proxy/status: a live connectivity check
// through the current tunnel plus the last link submitted via Connect.
func (h Handler) Status(c echo.Context) error {
	return c.JSON(http.StatusOK, statusResponse{
		ConnectResult: h.proxySvc.Status(c.Request().Context()),
		Link:          h.linkStore.Get(settingskeys.KeyXrayVlessLink),
	})
}
