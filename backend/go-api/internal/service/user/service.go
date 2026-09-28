package userservice

import (
	"context"

	domain "mathmotion/go-api/internal/domain/user"
)

type Repository interface {
	EnsureUser(ctx context.Context, deviceID string) (domain.User, error)
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}
