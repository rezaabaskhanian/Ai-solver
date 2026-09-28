package vision

import (
	"context"

	"github.com/anthropics/anthropic-sdk-go/option"

	settingskeys "mathmotion/go-api/internal/service/settings"
)

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

// fakeSettings stands in for internal/service/settings: a plain map, no
// database or environment fallback.
type fakeSettings map[string]string

func (f fakeSettings) Get(key string) string { return f[key] }

// newAnthropicTestClient is a Client on the default (anthropic) provider
// whose Messages API calls go to baseURL instead of the real API.
func newAnthropicTestClient(baseURL string) *Client {
	settings := fakeSettings{settingskeys.KeyAnthropicAPIKey: "test-key"}
	return NewClient(settings, nil, option.WithBaseURL(baseURL))
}
