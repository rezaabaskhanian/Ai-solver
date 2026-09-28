package problemservice

import (
	"context"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
)

// Entitlement reports the device-scoped user's Premium status and,
// for non-Premium users, how much of the free-tier quota (see Solve)
// has been used so the client can show a paywall before Solve ever
// rejects a request.
func (s Service) Entitlement(ctx context.Context, userID string, isPremium bool) (dto.Entitlement, error) {
	const op = "problemservice.Entitlement"

	used, err := s.repo.CountProblems(ctx, userID)
	if err != nil {
		return dto.Entitlement{}, richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not load your solve quota.")
	}

	return dto.Entitlement{
		IsPremium:       isPremium,
		FreeSolvesUsed:  used,
		FreeSolvesLimit: s.freeSolveLimit,
	}, nil
}
