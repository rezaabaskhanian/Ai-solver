package proxyhandler

import (
	"context"

	proxyservice "mathmotion/go-api/internal/service/proxy"
)

// LinkStore is where the last submitted vless link is kept so the admin
// panel can pre-fill it (internal/service/settings in production).
type LinkStore interface {
	Get(key string) string
	Set(ctx context.Context, key, value string) error
}

type Handler struct {
	proxySvc  proxyservice.Service
	linkStore LinkStore
}

func New(proxySvc proxyservice.Service, linkStore LinkStore) Handler {
	return Handler{proxySvc: proxySvc, linkStore: linkStore}
}
