package problemservice

import (
	"context"
	"encoding/json"

	domain "mathmotion/go-api/internal/domain/problem"
	"mathmotion/go-api/internal/service/problem/dto"
	"mathmotion/go-api/internal/service/quota"
)

// fakeRepo is an in-memory Repository used to exercise Service without
// a real Postgres connection.
type fakeRepo struct {
	saveProblemID string
	saveErr       error

	savedUserID    string
	savedRawInput  string
	savedNormalize string
	savedType      string
	savedAnswer    string
	savedVerified  bool
	savedSteps     []domain.Step
	saveCalled     bool

	listItems []dto.HistoryItem
	listErr   error

	countProblems int
	countErr      error
}

func (f *fakeRepo) SaveProblemAndSolution(
	ctx context.Context,
	userID, rawInput, normalizedExpression, problemType, answer string,
	verified bool,
	steps []domain.Step,
	plot json.RawMessage,
) (string, error) {
	f.saveCalled = true
	f.savedUserID = userID
	f.savedRawInput = rawInput
	f.savedNormalize = normalizedExpression
	f.savedType = problemType
	f.savedAnswer = answer
	f.savedVerified = verified
	f.savedSteps = steps

	if f.saveErr != nil {
		return "", f.saveErr
	}
	return f.saveProblemID, nil
}

func (f *fakeRepo) ListHistory(ctx context.Context, userID string, limit, offset int) ([]dto.HistoryItem, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.listItems, nil
}

func (f *fakeRepo) CountProblems(ctx context.Context, userID string) (int, error) {
	if f.countErr != nil {
		return 0, f.countErr
	}
	return f.countProblems, nil
}

// fakeQuota stands in for internal/service/quota: allowErr is what Allow
// returns; recorded lists the kinds passed to Record.
type fakeQuota struct {
	allowErr error
	recorded []quota.Kind
	status   quota.Status
}

func (f *fakeQuota) Allow(ctx context.Context, userID string, isPremium bool, kind quota.Kind) error {
	return f.allowErr
}

func (f *fakeQuota) Record(ctx context.Context, userID string, kind quota.Kind) error {
	f.recorded = append(f.recorded, kind)
	return nil
}

func (f *fakeQuota) Status(ctx context.Context, userID string, isPremium bool) (quota.Status, error) {
	return f.status, nil
}
