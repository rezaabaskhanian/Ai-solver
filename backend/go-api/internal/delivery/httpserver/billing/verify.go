package billinghandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/errorhandling"
)

type verifyRequest struct {
	PurchaseToken string `json:"purchase_token"`
	// The plan's Cafe Bazaar SKU; empty means the old lifetime unlock
	// (app versions from before plans existed don't send it).
	ProductID string `json:"product_id"`
}

// Verify handles POST /api/v1/billing/verify — confirms a Cafe Bazaar
// purchase token server-side and grants what it bought (see
// billingservice.VerifyPurchase). The client's own claim of having
// paid is never trusted.
func (h Handler) Verify(c echo.Context) error {
	var req verifyRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":   "invalid_body",
			"message": "Request body must be valid JSON.",
		})
	}

	userID := middleware.UserIDFromContext(c)

	if err := h.billingSvc.VerifyPurchase(c.Request().Context(), userID, req.ProductID, req.PurchaseToken); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}

	return c.JSON(http.StatusOK, map[string]bool{"is_premium": true})
}
