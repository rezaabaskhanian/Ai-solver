package vision

import (
	"context"

	"mathmotion/go-api/internal/service/aiusage"
	"mathmotion/go-api/internal/service/quota"
)

// Quota is the slice of internal/service/quota this service needs — the
// same gate Solve/Check use, so scans count toward the free limit and,
// for Premium users, the daily scan cap (both admin-configurable).
type Quota interface {
	Allow(ctx context.Context, userID string, isPremium bool, kind quota.Kind) error
	Record(ctx context.Context, userID string, kind quota.Kind) error
}

// UsageRecorder is internal/service/aiusage: what each scan cost, for the
// admin panel's AI cost report.
type UsageRecorder interface {
	Record(ctx context.Context, e aiusage.Entry)
}

type Service struct {
	client *Client
	quota  Quota
	usage  UsageRecorder // optional
}

func New(client *Client, q Quota) Service {
	return Service{client: client, quota: q}
}

// WithUsageRecorder records every scan's cost (see aiusage).
func (s Service) WithUsageRecorder(r UsageRecorder) Service {
	s.usage = r
	return s
}
