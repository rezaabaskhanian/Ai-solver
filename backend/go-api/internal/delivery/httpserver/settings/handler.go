package settingshandler

import (
	"context"

	"mathmotion/go-api/internal/service/quota"
)

// Store is the slice of internal/service/settings these handlers use.
type Store interface {
	Get(key string) string
	Set(ctx context.Context, key, value string) error
}

// ProviderInfo reports which vision provider is in effect and whether it
// can actually be called (internal/service/vision.Client).
type ProviderInfo interface {
	ActiveProvider() string
	Enabled() bool
}

// QuotaInfo reports the usage limits in effect (internal/service/quota),
// i.e. the saved values with their .env/default fallbacks applied.
type QuotaInfo interface {
	Config() quota.Config
}

type Handler struct {
	store    Store
	provider ProviderInfo
	quota    QuotaInfo
}

func New(store Store, provider ProviderInfo, q QuotaInfo) Handler {
	return Handler{store: store, provider: provider, quota: q}
}
