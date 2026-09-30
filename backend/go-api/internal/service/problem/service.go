package problemservice

import (
	"context"
	"encoding/json"

	domain "mathmotion/go-api/internal/domain/problem"
	"mathmotion/go-api/internal/service/problem/dto"
	"mathmotion/go-api/internal/service/quota"
)

type Repository interface {
	SaveProblemAndSolution(
		ctx context.Context,
		userID, rawInput, normalizedExpression, problemType, answer string,
		verified bool,
		steps []domain.Step,
		plot json.RawMessage,
	) (problemID string, err error)

	ListHistory(ctx context.Context, userID string, limit, offset int) ([]dto.HistoryItem, error)
}

// Quota is the slice of internal/service/quota this service needs: gate
// an action before calling the engine, record it after it succeeds, and
// report usage for GET /entitlement.
type Quota interface {
	Allow(ctx context.Context, userID string, isPremium bool, kind quota.Kind) error
	Record(ctx context.Context, userID string, kind quota.Kind) error
	Status(ctx context.Context, userID string, isPremium bool) (quota.Status, error)
}

type Service struct {
	repo   Repository
	engine *MathEngineClient
	quota  Quota
}

func New(repo Repository, engine *MathEngineClient, q Quota) Service {
	return Service{repo: repo, engine: engine, quota: q}
}
