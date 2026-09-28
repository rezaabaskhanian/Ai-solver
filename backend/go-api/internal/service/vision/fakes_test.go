package vision

import "context"

type fakeRepo struct {
	countProblems int
	countErr      error
}

func (f *fakeRepo) CountProblems(ctx context.Context, userID string) (int, error) {
	if f.countErr != nil {
		return 0, f.countErr
	}
	return f.countProblems, nil
}
