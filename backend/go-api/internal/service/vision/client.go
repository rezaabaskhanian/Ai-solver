// Package vision reads every handwritten/printed math problem in a
// photo and returns each as plain text — nothing more. It never
// computes or verifies an answer (PRD section 38's rule): each
// recognized problem is handed to the existing POST
// /api/v1/problems/solve exactly like typed input, so the Math Engine
// remains the only thing that solves or verifies anything.
package vision

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"

	settingskeys "mathmotion/go-api/internal/service/settings"
)

const recognitionPrompt = `You will be shown a photo that may contain one or more handwritten or ` +
	`printed math problems. Transcribe EVERY distinct problem exactly as written, one per line, ` +
	`using plain ASCII (e.g. x^2, sqrt(x), sin(x), *, /  — no LaTeX, no unicode math symbols). ` +
	`Respond with the transcriptions only, one problem per line: no numbering, no explanation, ` +
	`no commentary, no markdown formatting. If there is no legible math problem in the image, ` +
	`respond with exactly: NONE`

const (
	ProviderAnthropic  = "anthropic"
	ProviderOpenRouter = "openrouter"
	ProviderDeepSeek   = "deepseek"

	defaultClaudeModel     = "claude-opus-5"
	defaultOpenRouterModel = "anthropic/claude-sonnet-5"
	defaultDeepSeekModel   = "deepseek-chat"

	openRouterBaseURL = "https://openrouter.ai/api/v1"
	deepSeekBaseURL   = "https://api.deepseek.com"

	maxOutputTokens = 512
)

// NotRecognizedError means the model looked at the photo and found no
// legible equation — distinct from a transport/API failure, so the
// caller can map it to the same "couldn't understand" copy used for a
// typed parse failure instead of a generic error.
type NotRecognizedError struct{}

func (e *NotRecognizedError) Error() string {
	return "no legible math problem found in the image"
}

// Settings is the slice of internal/service/settings this package reads.
// Provider, keys and models are read on every call, so a change saved from
// the admin panel applies to the very next scan without a restart.
type Settings interface {
	Get(key string) string
}

type Client struct {
	settings   Settings
	httpClient *http.Client

	// anthropicOpts are appended after the API key/HTTP client options —
	// tests use option.WithBaseURL to point at a fake server.
	anthropicOpts []option.RequestOption
	// OpenAI-compatible base URLs; overridable (same-package tests only)
	// so tests can point them at an httptest.Server.
	openRouterURL string
	deepSeekURL   string
}

// NewClient routes every provider's calls through httpClient, which is
// the internal/pkg/outboundhttp client — so the Xray tunnel (when
// configured) covers Claude, OpenRouter and DeepSeek alike.
func NewClient(settings Settings, httpClient *http.Client, anthropicOpts ...option.RequestOption) *Client {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Client{
		settings:      settings,
		httpClient:    httpClient,
		anthropicOpts: anthropicOpts,
		openRouterURL: openRouterBaseURL,
		deepSeekURL:   deepSeekBaseURL,
	}
}

// ActiveProvider normalizes AI_PROVIDER; anything unknown or empty means
// anthropic, the original (and default) behavior.
func (c *Client) ActiveProvider() string {
	switch strings.ToLower(strings.TrimSpace(c.settings.Get(settingskeys.KeyAIProvider))) {
	case ProviderOpenRouter:
		return ProviderOpenRouter
	case ProviderDeepSeek:
		return ProviderDeepSeek
	default:
		return ProviderAnthropic
	}
}

// Enabled reports whether the active provider has an API key configured.
func (c *Client) Enabled() bool {
	return c.settings.Get(apiKeySetting(c.ActiveProvider())) != ""
}

func apiKeySetting(provider string) string {
	switch provider {
	case ProviderOpenRouter:
		return settingskeys.KeyOpenRouterAPIKey
	case ProviderDeepSeek:
		return settingskeys.KeyDeepSeekAPIKey
	default:
		return settingskeys.KeyAnthropicAPIKey
	}
}

func (c *Client) settingOr(key, fallback string) string {
	if v := strings.TrimSpace(c.settings.Get(key)); v != "" {
		return v
	}
	return fallback
}

func (c *Client) RecognizeEquations(ctx context.Context, imageBase64, mediaType string) ([]string, error) {
	provider := c.ActiveProvider()
	apiKey := c.settings.Get(apiKeySetting(provider))
	if apiKey == "" {
		return nil, fmt.Errorf("%s is not configured (set it from the admin panel or .env)", apiKeySetting(provider))
	}

	var (
		text string
		err  error
	)
	switch provider {
	case ProviderOpenRouter:
		text, err = c.callOpenAICompatible(ctx, c.openRouterURL, apiKey,
			c.settingOr(settingskeys.KeyOpenRouterModel, defaultOpenRouterModel), imageBase64, mediaType)
	case ProviderDeepSeek:
		text, err = c.callOpenAICompatible(ctx, c.deepSeekURL, apiKey,
			c.settingOr(settingskeys.KeyDeepSeekModel, defaultDeepSeekModel), imageBase64, mediaType)
	default:
		text, err = c.callAnthropic(ctx, apiKey,
			c.settingOr(settingskeys.KeyClaudeModel, defaultClaudeModel), imageBase64, mediaType)
	}
	if err != nil {
		return nil, fmt.Errorf("calling %s vision: %w", provider, err)
	}

	return parseProblems(text)
}

func (c *Client) callAnthropic(ctx context.Context, apiKey, model, imageBase64, mediaType string) (string, error) {
	opts := append([]option.RequestOption{
		option.WithAPIKey(apiKey),
		option.WithHTTPClient(c.httpClient),
	}, c.anthropicOpts...)
	client := anthropic.NewClient(opts...)

	resp, err := client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.Model(model),
		MaxTokens: maxOutputTokens,
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(
				anthropic.NewImageBlockBase64(mediaType, imageBase64),
				anthropic.NewTextBlock(recognitionPrompt),
			),
		},
	})
	if err != nil {
		return "", err
	}

	var text strings.Builder
	for _, block := range resp.Content {
		if b, ok := block.AsAny().(anthropic.TextBlock); ok {
			text.WriteString(b.Text)
		}
	}
	return text.String(), nil
}

// parseProblems turns the model's one-problem-per-line reply into a list,
// treating an empty reply or a bare NONE as "nothing legible".
func parseProblems(text string) ([]string, error) {
	var problems []string
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line != "" && line != "NONE" {
			problems = append(problems, line)
		}
	}

	if len(problems) == 0 {
		return nil, &NotRecognizedError{}
	}
	return problems, nil
}

// IsNotRecognized reports whether err is (or wraps) a NotRecognizedError.
func IsNotRecognized(err error) bool {
	var notRecognized *NotRecognizedError
	return errors.As(err, &notRecognized)
}
