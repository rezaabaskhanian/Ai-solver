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
	`Use exactly this notation for calculus and logarithms: derivative d/dx(expr), integral ` +
	`integrate(expr, x), limit lim(x->a) expr (lim(x->oo) for infinity, lim(x->0+) / lim(x->0-) ` +
	`for one-sided limits), log with base b log_b(expr), a log written without a base log(expr), ` +
	`natural log ln(expr). ` +
	// Iranian textbooks (حسابان / ریاضی) mostly state the operation in
	// Persian words or with y'/f'(x) rather than d/dx — the math engine
	// only understands the forms above, so every such problem has to be
	// rewritten into them here.
	`Problems may be written in Persian, as in Iranian school textbooks. Never output Persian ` +
	`words: turn the instruction into the notation above and keep only the math. ` +
	`Derivatives: y', f'(x), dy/dx, «مشتق ... را بیابید / حساب کنید», «مشتق تابع ...» all mean ` +
	`d/dx(expr), where expr is the function itself — e.g. "y = x^3 , y' = ?" or «مشتق تابع ` +
	`f(x) = x^3 را بیابید» becomes d/dx(x^3); output only that line, not the function's ` +
	`definition. A derivative with respect to another variable («نسبت به t») uses d/dt(expr). ` +
	`Integrals: ∫ f(x) dx, «انتگرال ... را حساب کنید», «انتگرال نامعین», «تابع اولیه ... را ` +
	`بیابید» all mean integrate(expr, x). ` +
	`Limits: «حد ... وقتی x به a میل می‌کند», «x → a», lim with a under it all mean ` +
	`lim(x->a) expr; «حد راست» / x→a+ is lim(x->a+), «حد چپ» / x→a- is lim(x->a-), «بی‌نهایت» ` +
	`is oo. ` +
	`Plotting a function («نمودار تابع ... را رسم کنید», «رسم نمودار», «نمودار ... را بکشید»): ` +
	`plot(expr), e.g. plot(x^2 - 4); with a stated range («در بازه‌ی [-2, 3]») ` +
	`plot(expr, x, -2, 3). ` +
	`Equations («معادله را حل کنید», «ریشه‌های معادله») are written as the equation only, and ` +
	`«ساده کنید» / «مقدار عبارت» as the expression only. ` +
	`Second derivative (y'', f''(x), d²y/dx², «مشتق دوم»): d^2/dx^2(expr). ` +
	`Derivative at a point (f'(2), y' at x=2, «مشتق ... در x = 2», «شیب خط مماس در x = 2»): ` +
	`d/dx(expr)|x=2, and d^2/dx^2(expr)|x=2 for a second derivative at a point. ` +
	`Definite integral with bounds a (bottom) and b (top) («انتگرال معین», «از a تا b»): ` +
	`integrate(expr, x, a, b). ` +
	`If the photo shows only a bare expression such as x^3 with no ` +
	`instruction, transcribe just the expression — never guess an operation. ` +
	`Sets: define each set, then the question, separated by commas, e.g. A={1,2,3}, B={2,3,4}, A∪B ` +
	`(∪ union, ∩ intersection, - difference, A' complement with U={...} defined, n(A) number of ` +
	`elements). Vectors: [x, y], points A(1, 2), the vector between points AB, length |AB|. ` +
	`A system of equations (two equations joined by a brace, دستگاه معادلات) is ONE problem: ` +
	`write both equations on one line separated by a comma, e.g. 2x+y=5, x-y=1. ` +
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

// Usage is what one recognition call consumed, for the admin panel's AI
// cost report (internal/service/aiusage). CostUSD is set only when the
// provider reports its own charge (OpenRouter's usage.cost).
type Usage struct {
	Provider     string
	Model        string
	InputTokens  int
	OutputTokens int
	CostUSD      float64
	CostReported bool
}

func (c *Client) RecognizeEquations(ctx context.Context, imageBase64, mediaType string) ([]string, error) {
	problems, _, err := c.RecognizeWithUsage(ctx, imageBase64, mediaType)
	return problems, err
}

// RecognizeWithUsage is RecognizeEquations plus what the call cost. The
// usage is filled whenever the provider answered — also for a "nothing
// legible" reply, which is still billed.
func (c *Client) RecognizeWithUsage(ctx context.Context, imageBase64, mediaType string) ([]string, Usage, error) {
	provider := c.ActiveProvider()
	apiKey := c.settings.Get(apiKeySetting(provider))
	if apiKey == "" {
		return nil, Usage{Provider: provider}, fmt.Errorf("%s is not configured (set it from the admin panel or .env)", apiKeySetting(provider))
	}

	var (
		text  string
		usage Usage
		err   error
	)
	switch provider {
	case ProviderOpenRouter:
		text, usage, err = c.callOpenAICompatible(ctx, c.openRouterURL, apiKey,
			c.settingOr(settingskeys.KeyOpenRouterModel, defaultOpenRouterModel), imageBase64, mediaType)
	case ProviderDeepSeek:
		text, usage, err = c.callOpenAICompatible(ctx, c.deepSeekURL, apiKey,
			c.settingOr(settingskeys.KeyDeepSeekModel, defaultDeepSeekModel), imageBase64, mediaType)
	default:
		text, usage, err = c.callAnthropic(ctx, apiKey,
			c.settingOr(settingskeys.KeyClaudeModel, defaultClaudeModel), imageBase64, mediaType)
	}
	usage.Provider = provider
	if err != nil {
		return nil, usage, fmt.Errorf("calling %s vision: %w", provider, err)
	}

	problems, err := parseProblems(text)
	return problems, usage, err
}

func (c *Client) callAnthropic(ctx context.Context, apiKey, model, imageBase64, mediaType string) (string, Usage, error) {
	usage := Usage{Model: model}
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
		return "", usage, err
	}
	usage.InputTokens = int(resp.Usage.InputTokens)
	usage.OutputTokens = int(resp.Usage.OutputTokens)

	var text strings.Builder
	for _, block := range resp.Content {
		if b, ok := block.AsAny().(anthropic.TextBlock); ok {
			text.WriteString(b.Text)
		}
	}
	return text.String(), usage, nil
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
