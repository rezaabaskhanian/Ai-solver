package problemservice

import (
	"context"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
)

// Entitlement reports the device-scoped user's Premium status and usage
// under the current (admin-configurable) limits — see
// internal/service/quota — so the client can show the quota and a paywall
// before any request is rejected.
func (s Service) Entitlement(ctx context.Context, userID string, isPremium bool) (dto.Entitlement, error) {
	const op = "problemservice.Entitlement"

	status, err := s.quota.Status(ctx, userID, isPremium)
	if err != nil {
		return dto.Entitlement{}, richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not load your solve quota.")
	}

	return dto.Entitlement{
		IsPremium:        isPremium,
		FreeSolvesUsed:   status.Used,
		FreeSolvesLimit:  status.Limit,
		QuotaPeriod:      status.Period,
		ResetsAt:         status.ResetsAt,
		PremiumScansUsed: status.ScansUsedToday,
		PremiumScanLimit: status.ScanLimit,
	}, nil
}
