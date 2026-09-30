// Package aiusage records what every AI call costs and reports it to the
// admin panel («هزینه‌ی هوش مصنوعی») — the same idea as LingoFlow's
// aiaccess report, but per call: the cost of each scan, daily totals,
// the average per scan and the split by model, in dollars and toman.
//
// The cost is the provider's own figure when it reports one (OpenRouter
// returns usage.cost, the exact charge); otherwise it's estimated from the
// token counts and AI_TOKEN_PRICING (dollars per million tokens).
package aiusage

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"strings"

	settingskeys "mathmotion/go-api/internal/service/settings"
)

// Entry is one AI call.
type Entry struct {
	UserID       string
	Feature      string // "scan"
	Provider     string
	Model        string
	InputTokens  int
	OutputTokens int
	// CostUSD is the provider-reported charge when CostReported is true.
	CostUSD      float64
	CostReported bool
}

type Totals struct {
	Calls        int     `json:"calls"`
	InputTokens  int     `json:"input_tokens"`
	OutputTokens int     `json:"output_tokens"`
	CostUSD      float64 `json:"cost_usd"`
}

type Day struct {
	Date string `json:"date"`
	Totals
}

type ModelTotals struct {
	Provider string `json:"provider"`
	Model    string `json:"model"`
	Totals
}

type Call struct {
	CreatedAt     string  `json:"created_at"`
	UserID        string  `json:"user_id"`
	Feature       string  `json:"feature"`
	Provider      string  `json:"provider"`
	Model         string  `json:"model"`
	InputTokens   int     `json:"input_tokens"`
	OutputTokens  int     `json:"output_tokens"`
	CostUSD       float64 `json:"cost_usd"`
	CostEstimated bool    `json:"cost_estimated"`
}

type Report struct {
	PeriodDays int `json:"period_days"`
	// USDTomanRate converts the dollar figures (USD_TOMAN_RATE).
	USDTomanRate float64       `json:"usd_toman_rate"`
	AllTime      Totals        `json:"all_time"`
	Period       Totals        `json:"period"`
	Daily        []Day         `json:"daily"`
	Models       []ModelTotals `json:"models"`
	Recent       []Call        `json:"recent"`
}

type Repository interface {
	Insert(ctx context.Context, e Entry, costUSD float64, estimated bool) error
	Totals(ctx context.Context, days int) (Totals, error) // days <= 0: all time
	Daily(ctx context.Context, days int) ([]Day, error)
	Models(ctx context.Context, days int) ([]ModelTotals, error)
	Recent(ctx context.Context, limit int) ([]Call, error)
}

type Settings interface {
	Get(key string) string
}

// Pricing is dollars per million input/output tokens.
type Pricing struct {
	InputPer1M  float64 `json:"input_per_1m"`
	OutputPer1M float64 `json:"output_per_1m"`
}

// defaultPricing is only for providers that don't report a cost
// (Anthropic direct, DeepSeek) until AI_TOKEN_PRICING is set — rough
// figures for the default models; correct them from the provider's
// price page for real numbers.
var defaultPricing = map[string]Pricing{
	"anthropic":  {InputPer1M: 5, OutputPer1M: 25},
	"openrouter": {InputPer1M: 3, OutputPer1M: 15},
	"deepseek":   {InputPer1M: 0.27, OutputPer1M: 1.1},
}

// DefaultUSDTomanRate applies until USD_TOMAN_RATE is set.
const DefaultUSDTomanRate = 250000

type Service struct {
	repo     Repository
	settings Settings
}

func New(repo Repository, settings Settings) Service {
	return Service{repo: repo, settings: settings}
}

// Record saves one call. Failures are only logged: accounting must never
// break the scan the user is waiting for.
func (s Service) Record(ctx context.Context, e Entry) {
	cost, estimated := e.CostUSD, false
	if !e.CostReported {
		p := s.pricing()[e.Provider]
		cost = float64(e.InputTokens)/1e6*p.InputPer1M + float64(e.OutputTokens)/1e6*p.OutputPer1M
		estimated = true
	}
	if e.Feature == "" {
		e.Feature = "scan"
	}
	if err := s.repo.Insert(ctx, e, cost, estimated); err != nil {
		log.Printf("aiusage.Record: %v", err)
	}
}

// pricing merges AI_TOKEN_PRICING (JSON, e.g.
// {"anthropic":{"input_per_1m":3,"output_per_1m":15}}) over the defaults.
func (s Service) pricing() map[string]Pricing {
	table := make(map[string]Pricing, len(defaultPricing))
	for k, v := range defaultPricing {
		table[k] = v
	}
	raw := strings.TrimSpace(s.settings.Get(settingskeys.KeyAITokenPricing))
	if raw == "" {
		return table
	}
	var configured map[string]Pricing
	if err := json.Unmarshal([]byte(raw), &configured); err != nil {
		return table
	}
	for k, v := range configured {
		table[strings.ToLower(strings.TrimSpace(k))] = v
	}
	return table
}

// ValidPricingJSON reports whether v is a usable AI_TOKEN_PRICING value.
func ValidPricingJSON(v string) bool {
	var table map[string]Pricing
	return json.Unmarshal([]byte(v), &table) == nil
}

func (s Service) usdTomanRate() float64 {
	if v, err := strconv.ParseFloat(strings.TrimSpace(s.settings.Get(settingskeys.KeyUSDTomanRate)), 64); err == nil && v > 0 {
		return v
	}
	return DefaultUSDTomanRate
}

// Report is GET /admin/ai-usage?days=N (default 30).
func (s Service) Report(ctx context.Context, days int) (Report, error) {
	r := Report{PeriodDays: days, USDTomanRate: s.usdTomanRate()}
	var err error
	if r.AllTime, err = s.repo.Totals(ctx, 0); err != nil {
		return r, err
	}
	if r.Period, err = s.repo.Totals(ctx, days); err != nil {
		return r, err
	}
	if r.Daily, err = s.repo.Daily(ctx, days); err != nil {
		return r, err
	}
	if r.Models, err = s.repo.Models(ctx, days); err != nil {
		return r, err
	}
	if r.Recent, err = s.repo.Recent(ctx, 50); err != nil {
		return r, err
	}
	return r, nil
}
