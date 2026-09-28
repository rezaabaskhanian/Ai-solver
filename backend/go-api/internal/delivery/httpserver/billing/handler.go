package billinghandler

import (
	billingservice "mathmotion/go-api/internal/service/billing"
)

type Handler struct {
	billingSvc billingservice.Service
}

func New(billingSvc billingservice.Service) Handler {
	return Handler{billingSvc: billingSvc}
}
