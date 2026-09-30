package billing

import (
	"context"
	"errors"

	"mathmotion/go-api/internal/pkg/errmesg"
	"mathmotion/go-api/internal/pkg/richerror"
)

// VerifyPurchase confirms a Cafe Bazaar purchase token server-side and,
// only once genuinely purchased, grants what it bought — the client's own
// claim of having paid is never trusted (PRD section 34's "API keys only
// in backend" principle extends the same way to purchase state).
//
// productID picks a plan (subscription_plans) that adds its days of
// Premium. An empty productID means the old lifetime unlock: app versions
// from before plans existed only sent the token.
//
// A token that was already verified is accepted again without granting
// anything twice — the app retries after a dropped connection.
func (s Service) VerifyPurchase(ctx context.Context, userID, productID, purchaseToken string) error {
	const op = "billing.VerifyPurchase"

	if purchaseToken == "" {
		return richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).
			WithMessage("purchase_token is required.")
	}
	if productID == "" {
		productID = s.lifetimeProductID
	}

	days := 0
	if productID != s.lifetimeProductID {
		plan, err := s.repo.PlanByProductID(ctx, productID)
		if errors.Is(err, ErrNotFound) {
			return richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).
				WithMessage("Unknown product.")
		}
		if err != nil {
			return richerror.New(richerror.Op(op)).WithErr(err).
				WithKind(richerror.KindUnexpected).WithMessage("Could not verify this purchase right now.")
		}
		days = plan.DurationDays
	}

	recorded, err := s.repo.PurchaseRecorded(ctx, purchaseToken)
	if err != nil {
		return richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not verify this purchase right now.")
	}
	if recorded && days > 0 {
		return nil
	}

	if !recorded {
		if err := s.bazaar.ValidatePurchase(ctx, s.packageName, productID, purchaseToken); err != nil {
			if errors.Is(err, ErrPurchaseNotValid) {
				return richerror.New(richerror.Op(op)).WithErr(err).
					WithKind(richerror.KindInvalid).WithMessage(errmesg.ErrPurchaseInvalid)
			}
			return richerror.New(richerror.Op(op)).WithErr(err).
				WithKind(richerror.KindUnexpected).WithMessage("Could not verify this purchase right now.")
		}
		if _, err := s.repo.RecordPurchase(ctx, userID, productID, purchaseToken, days); err != nil {
			return richerror.New(richerror.Op(op)).WithErr(err).
				WithKind(richerror.KindUnexpected).WithMessage("Could not record this purchase.")
		}
	}

	// The lifetime unlock is (idempotently) set even for a replayed token:
	// that's how a reinstall — a new device_id — restores it (the app's
	// restore check re-sends the token Bazaar still lists as owned).
	if days == 0 {
		if err := s.repo.SetPremium(ctx, userID); err != nil {
			return richerror.New(richerror.Op(op)).WithErr(err).
				WithKind(richerror.KindUnexpected).WithMessage("Could not activate Premium.")
		}
	}
	return nil
}
