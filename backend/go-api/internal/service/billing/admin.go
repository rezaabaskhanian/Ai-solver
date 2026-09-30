package billing

import (
	"context"
	"errors"
	"strings"

	"mathmotion/go-api/internal/pkg/richerror"
)

// The admin panel's «اشتراک‌ها» tab: plans for sale, and per-user grants
// (found by the code the app shows them, or their phone once signed up).

const maxGrantDays = 3650

// SearchUsers finds users by code, phone or device id prefix; an empty
// query lists the most recently active ones.
func (s Service) SearchUsers(ctx context.Context, query string) ([]UserSummary, error) {
	users, err := s.repo.SearchUsers(ctx, strings.ToUpper(strings.TrimSpace(query)), 30)
	if err != nil {
		return nil, richerror.New("billing.SearchUsers").WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not search users.")
	}
	return users, nil
}

// GrantAction is what the admin panel asks to do to one user.
type GrantAction struct {
	// "add_days" (Days > 0), "unlimited" (Unlimited on/off) or "revoke".
	Action    string `json:"action"`
	Days      int    `json:"days"`
	Unlimited bool   `json:"unlimited"`
}

func (s Service) ApplyGrant(ctx context.Context, userID string, a GrantAction) error {
	const op = "billing.ApplyGrant"

	var err error
	switch a.Action {
	case "add_days":
		if a.Days <= 0 || a.Days > maxGrantDays {
			return richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).
				WithMessage("days must be between 1 and 3650.")
		}
		err = s.repo.AddPremiumDays(ctx, userID, a.Days)
	case "unlimited":
		err = s.repo.SetUnlimited(ctx, userID, a.Unlimited)
	case "revoke":
		err = s.repo.RevokePremium(ctx, userID)
	default:
		return richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).
			WithMessage("action must be add_days, unlimited or revoke.")
	}
	if errors.Is(err, ErrNotFound) {
		return richerror.New(richerror.Op(op)).WithKind(richerror.KindNotFound).WithMessage("User not found.")
	}
	if err != nil {
		return richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not update this user.")
	}
	return nil
}

// SavePlan creates or updates (by product_id) a plan for sale.
func (s Service) SavePlan(ctx context.Context, p Plan) (Plan, error) {
	const op = "billing.SavePlan"

	p.Name = strings.TrimSpace(p.Name)
	p.ProductID = strings.TrimSpace(p.ProductID)
	if p.Name == "" || p.ProductID == "" || p.DurationDays <= 0 || p.DurationDays > maxGrantDays || p.PriceToman < 0 {
		return Plan{}, richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).
			WithMessage("name, product_id, duration_days (1-3650) and price_toman (≥ 0) are required.")
	}
	if p.ProductID == s.lifetimeProductID {
		return Plan{}, richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).
			WithMessage("That product id is the old lifetime unlock.")
	}
	saved, err := s.repo.UpsertPlan(ctx, p)
	if err != nil {
		return Plan{}, richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not save the plan.")
	}
	return saved, nil
}

func (s Service) DeletePlan(ctx context.Context, id string) error {
	if err := s.repo.DeletePlan(ctx, id); err != nil {
		return richerror.New("billing.DeletePlan").WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not delete the plan.")
	}
	return nil
}
