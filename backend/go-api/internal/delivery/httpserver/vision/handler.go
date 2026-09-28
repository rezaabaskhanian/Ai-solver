package visionhandler

import (
	visionservice "mathmotion/go-api/internal/service/vision"
)

type Handler struct {
	visionSvc visionservice.Service
}

func New(visionSvc visionservice.Service) Handler {
	return Handler{visionSvc: visionSvc}
}
