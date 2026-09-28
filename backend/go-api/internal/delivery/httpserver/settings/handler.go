package settingshandler

import (
	"context"
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

type Handler struct {
	store    Store
	provider ProviderInfo
}

func New(store Store, provider ProviderInfo) Handler {
	return Handler{store: store, provider: provider}
}
