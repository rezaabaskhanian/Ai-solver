package problemservice

import (
	"context"

	domain "mathmotion/go-api/internal/domain/problem"
	"mathmotion/go-api/internal/service/problem/dto"
)

type Repository interface {
	SaveProblemAndSolution(
		ctx context.Context,
		userID, rawInput, normalizedExpression, problemType, answer string,
		verified bool,
		steps []domain.Step,
	) (problemID string, err error)

	ListHistory(ctx context.Context, userID string, limit, offset int) ([]dto.HistoryItem, error)

	// CountProblems backs the free-tier quota (see Solve/Entitlement):
	// a lifetime cap on how many problems a non-Premium device-scoped
	// user may solve.
	CountProblems(ctx context.Context, userID string) (int, error)
}

type Service struct {
	repo           Repository
	engine         *MathEngineClient
	freeSolveLimit int
}

func New(repo Repository, engine *MathEngineClient, freeSolveLimit int) Service {
	return Service{repo: repo, engine: engine, freeSolveLimit: freeSolveLimit}
}
