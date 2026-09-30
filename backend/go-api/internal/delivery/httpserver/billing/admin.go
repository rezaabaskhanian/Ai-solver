package billinghandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/pkg/errorhandling"
	billingservice "mathmotion/go-api/internal/service/billing"
)

// Plans handles GET /api/v1/billing/plans (the app's plan picker) and
// GET /admin/plans.
func (h Handler) Plans(c echo.Context) error {
	plans, err := h.billingSvc.ListPlans(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal", "message": "Could not load the plans.",
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"plans": plans})
}

// SavePlan handles PUT /admin/plans — creates a plan, or updates the one
// with the same product_id.
func (h Handler) SavePlan(c echo.Context) error {
	var req billingservice.Plan
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	plan, err := h.billingSvc.SavePlan(c.Request().Context(), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, plan)
}

// DeletePlan handles DELETE /admin/plans/:id.
func (h Handler) DeletePlan(c echo.Context) error {
	if err := h.billingSvc.DeletePlan(c.Request().Context(), c.Param("id")); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "deleted"})
}

// SearchUsers handles GET /admin/users?q=CODE.
func (h Handler) SearchUsers(c echo.Context) error {
	users, err := h.billingSvc.SearchUsers(c.Request().Context(), c.QueryParam("q"))
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]any{"users": users})
}

// GrantPremium handles POST /admin/users/:id/premium with
// {"action": "add_days", "days": 30} | {"action": "unlimited", "unlimited": true} | {"action": "revoke"}.
func (h Handler) GrantPremium(c echo.Context) error {
	var req billingservice.GrantAction
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	if err := h.billingSvc.ApplyGrant(c.Request().Context(), c.Param("id"), req); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "saved"})
}

func invalidBody(c echo.Context) error {
	return c.JSON(http.StatusBadRequest, map[string]string{
		"error":   "invalid_body",
		"message": "Request body must be valid JSON.",
	})
}
