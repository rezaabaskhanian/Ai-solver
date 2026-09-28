package visionhandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/errorhandling"
)

type recognizeRequest struct {
	ImageBase64 string `json:"image_base64"`
	MediaType   string `json:"media_type"`
}

// Recognize handles POST /api/v1/problems/recognize — reads every math
// problem in a photo and returns each as plain text (see
// visionservice.RecognizeEquations). The mobile client shows the list
// for the user to pick from, then calls the existing POST
// /api/v1/problems/solve per selection, exactly like typed input;
// nothing downstream of this handler changes.
func (h Handler) Recognize(c echo.Context) error {
	var req recognizeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "Request body must be valid JSON.",
		})
	}
	if req.ImageBase64 == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "image_base64 is required.",
		})
	}

	mediaType := req.MediaType
	if mediaType == "" {
		mediaType = "image/jpeg"
	}

	userID := middleware.UserIDFromContext(c)
	isPremium := middleware.IsPremiumFromContext(c)

	problems, err := h.visionSvc.RecognizeEquations(c.Request().Context(), userID, isPremium, req.ImageBase64, mediaType)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}

	return c.JSON(http.StatusOK, map[string][]string{"recognized_problems": problems})
}
