package problemhandler

import (
	problemservice "mathmotion/go-api/internal/service/problem"
)

type Handler struct {
	problemSvc problemservice.Service
}

func New(problemSvc problemservice.Service) Handler {
	return Handler{problemSvc: problemSvc}
}
