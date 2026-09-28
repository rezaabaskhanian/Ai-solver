package vision

import "context"

// Repository is intentionally just this one method, independent of
// problemservice.Repository/billing.Repository even though the same
// underlying Postgres type ends up implementing all three — each
// service declares only the slice it needs, matching the layering used
// across this codebase. main.go passes the same *postgresproblem.DB
// instance used to construct problemservice here too, since it already
// implements CountProblems.
type Repository interface {
	CountProblems(ctx context.Context, userID string) (int, error)
}

type Service struct {
	repo           Repository
	client         *Client
	freeSolveLimit int
}

func New(repo Repository, client *Client, freeSolveLimit int) Service {
	return Service{repo: repo, client: client, freeSolveLimit: freeSolveLimit}
}
