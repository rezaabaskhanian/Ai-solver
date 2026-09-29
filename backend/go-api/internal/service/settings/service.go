// Package settings holds the values the admin panel can change at runtime
// (which AI provider reads photos, its API key and model, the last Xray
// link) without a redeploy or restart. Mirrors Shadowing-backend's
// settingsservice: values live in Postgres (app_settings), are cached in
// memory, and fall back to the environment variable of the same name when
// nothing has been saved yet — so an existing .env keeps working untouched.
package settings

import (
	"context"
	"log"
	"os"
	"sync"
	"time"
)

// Keys editable from the admin panel. Each is also read from the
// environment when not yet saved in the database.
const (
	KeyAIProvider       = "AI_PROVIDER" // anthropic (default) | openrouter | deepseek
	KeyAnthropicAPIKey  = "ANTHROPIC_API_KEY"
	KeyClaudeModel      = "CLAUDE_MODEL"
	KeyOpenRouterAPIKey = "OPENROUTER_API_KEY"
	KeyOpenRouterModel  = "OPENROUTER_MODEL"
	KeyDeepSeekAPIKey   = "DEEPSEEK_API_KEY"
	KeyDeepSeekModel    = "DEEPSEEK_MODEL"

	// Usage limits (internal/service/quota). FREE_QUOTA_PERIOD is
	// "daily" (default) or "lifetime"; the rest are non-negative integers,
	// PREMIUM_DAILY_SCAN_LIMIT = 0 meaning no cap.
	KeyFreeQuotaPeriod       = "FREE_QUOTA_PERIOD"
	KeyFreeDailyLimit        = "FREE_DAILY_LIMIT"
	KeyFreeLifetimeLimit     = "FREE_LIFETIME_LIMIT"
	KeyPremiumDailyScanLimit = "PREMIUM_DAILY_SCAN_LIMIT"

	// KeyXrayVlessLink is written by POST /admin/proxy (not by PUT
	// /admin/settings) so the panel can pre-fill the last link it sent.
	KeyXrayVlessLink = "XRAY_VLESS_LINK"
)

// EditableKeys is what PUT /admin/settings accepts.
var EditableKeys = map[string]bool{
	KeyAIProvider:       true,
	KeyAnthropicAPIKey:  true,
	KeyClaudeModel:      true,
	KeyOpenRouterAPIKey: true,
	KeyOpenRouterModel:  true,
	KeyDeepSeekAPIKey:   true,
	KeyDeepSeekModel:    true,

	KeyFreeQuotaPeriod:       true,
	KeyFreeDailyLimit:        true,
	KeyFreeLifetimeLimit:     true,
	KeyPremiumDailyScanLimit: true,
}

type Repository interface {
	GetAll(ctx context.Context) (map[string]string, error)
	Set(ctx context.Context, key, value string) error
}

type Service struct {
	repo Repository

	mu    sync.RWMutex
	cache map[string]string
}

func New(repo Repository) *Service {
	return &Service{repo: repo, cache: map[string]string{}}
}

// LoadAll replaces the cache with what's currently in the database.
func (s *Service) LoadAll(ctx context.Context) error {
	values, err := s.repo.GetAll(ctx)
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.cache = values
	s.mu.Unlock()
	return nil
}

// Get returns the saved value for key, or the environment variable of the
// same name when nothing (or an empty string) has been saved.
func (s *Service) Get(key string) string {
	s.mu.RLock()
	v, ok := s.cache[key]
	s.mu.RUnlock()
	if ok && v != "" {
		return v
	}
	return os.Getenv(key)
}

// Set saves key and updates the cache immediately, so the very next
// request (e.g. the next Scan Problem) already sees the new value.
func (s *Service) Set(ctx context.Context, key, value string) error {
	if err := s.repo.Set(ctx, key, value); err != nil {
		return err
	}
	s.mu.Lock()
	s.cache[key] = value
	s.mu.Unlock()
	return nil
}

const defaultRefreshInterval = 30 * time.Second

// StartAutoRefresh reloads the cache every interval until ctx is done, so a
// change saved through one go-api instance reaches the others too (Set only
// updates the cache of the instance that served the admin request). Run it
// once, in its own goroutine, after the initial LoadAll; interval <= 0 means
// defaultRefreshInterval.
func (s *Service) StartAutoRefresh(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = defaultRefreshInterval
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.LoadAll(ctx); err != nil {
				log.Printf("settings: periodic refresh failed: %v", err)
			}
		}
	}
}
