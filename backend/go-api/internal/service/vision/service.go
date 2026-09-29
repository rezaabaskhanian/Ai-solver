package vision

import (
	"context"

	"mathmotion/go-api/internal/service/quota"
)

// Quota is the slice of internal/service/quota this service needs — the
// same gate Solve/Check use, so scans count toward the free limit and,
// for Premium users, the daily scan cap (both admin-configurable).
type Quota interface {
	Allow(ctx context.Context, userID string, isPremium bool, kind quota.Kind) error
	Record(ctx context.Context, userID string, kind quota.Kind) error
}

type Service struct {
	client *Client
	quota  Quota
}

func New(client *Client, q Quota) Service {
	return Service{client: client, quota: q}
}
