package userservice

import (
	"context"

	domain "mathmotion/go-api/internal/domain/user"
	"mathmotion/go-api/internal/pkg/richerror"
)

// EnsureUser upserts a lightweight, auth-free user keyed by device ID
// — see internal/domain/user for why MathMotion's MVP has no login
// flow (PRD section 39).
func (s Service) EnsureUser(ctx context.Context, deviceID string) (domain.User, error) {
	const op = "userservice.EnsureUser"

	u, err := s.repo.EnsureUser(ctx, deviceID)
	if err != nil {
		return domain.User{}, richerror.New(richerror.Op(op)).WithErr(err).
			WithKind(richerror.KindUnexpected).WithMessage("Could not resolve user.")
	}
	return u, nil
}
