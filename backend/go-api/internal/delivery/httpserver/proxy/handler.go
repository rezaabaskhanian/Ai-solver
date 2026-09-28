package proxyhandler

import (
	proxyservice "mathmotion/go-api/internal/service/proxy"
)

type Handler struct {
	proxySvc proxyservice.Service
}

func New(proxySvc proxyservice.Service) Handler {
	return Handler{proxySvc: proxySvc}
}
