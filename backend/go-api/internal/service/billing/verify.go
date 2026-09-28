package billing

import (
	"context"

	"mathmotion/go-api/internal/pkg/errmesg"
	"mathmotion/go-api/internal/pkg/richerror"
)

// VerifyPurchase confirms a Cafe Bazaar purchase token server-side and,
// only once genuinely purchased, grants Premium — the client's own
// claim of having paid is never trusted (PRD section 34's "API keys
// only in backend" principle extends the same way to purchase state).
func (s Service) VerifyPurchase(ctx context.Context, userID, purchaseToken string) error {
	const op = "billing.VerifyPurchase"

	info, err := s.bazaar.ValidatePurchase(ctx, s.packageName, s.productID, purchaseToken)
	if err != nil {
		return richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not verify this purchase right now.")
	}

	if info.PurchaseState != PurchaseStatePurchased {
		return richerror.New(richerror.Op(op)).
			WithKind(richerror.KindInvalid).WithMessage(errmesg.ErrPurchaseInvalid)
	}

	if _, err := s.repo.RecordPurchase(ctx, userID, s.productID, purchaseToken); err != nil {
		return richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not record this purchase.")
	}

	if err := s.repo.SetPremium(ctx, userID); err != nil {
		return richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not activate Premium.")
	}

	return nil
}
