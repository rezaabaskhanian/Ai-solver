package vision

import (
	"context"

	"github.com/anthropics/anthropic-sdk-go/option"

	"mathmotion/go-api/internal/service/quota"
	settingskeys "mathmotion/go-api/internal/service/settings"
)

// fakeQuota stands in for internal/service/quota.
type fakeQuota struct {
	allowErr error
	recorded []quota.Kind
}

func (f *fakeQuota) Allow(ctx context.Context, userID string, isPremium bool, kind quota.Kind) error {
	return f.allowErr
}

func (f *fakeQuota) Record(ctx context.Context, userID string, kind quota.Kind) error {
	f.recorded = append(f.recorded, kind)
	return nil
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
