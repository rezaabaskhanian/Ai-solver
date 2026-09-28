package problemservice

import (
	"context"

	domain "mathmotion/go-api/internal/domain/problem"
	"mathmotion/go-api/internal/service/problem/dto"
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
