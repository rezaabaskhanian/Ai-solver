package problemservice

// MathEngineClient talks to the sidecar Python/SymPy service (PRD
// section 38: only that service may compute or verify an answer).
// Placed alongside the service that consumes it rather than in a
// separate adapter layer — mirrors Shadowing-backend's WhisperClient
// in internal/service/speecheval/whisper_client.go.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"mathmotion/go-api/internal/pkg/locale"
)

type MathEngineClient struct {
	baseURL string
	http    *http.Client
}

func NewMathEngineClient(baseURL string) *MathEngineClient {
	return &MathEngineClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

type engineParseResult struct {
	Problem    string  `json:"problem"`
	Type       string  `json:"type"`
	Confidence float64 `json:"confidence"`
}

type engineStep struct {
	ID          int     `json:"id"`
	Before      string  `json:"before"`
	After       string  `json:"after"`
	Operation   string  `json:"operation"`
	Value       *string `json:"value,omitempty"`
	Target      *string `json:"target,omitempty"`
	Explanation string  `json:"explanation"`
}

type engineSolveResult struct {
	Problem  string       `json:"problem"`
	Answer   string       `json:"answer"`
	Verified bool         `json:"verified"`
	Type     string       `json:"type"`
	Steps    []engineStep `json:"steps"`
	// Only for "function_plot": passed through to the app untouched.
	Plot json.RawMessage `json:"plot,omitempty"`
}

type engineCheckResult struct {
	Status          string      `json:"status"`
	StepStatuses    []string    `json:"step_statuses"`
	FirstErrorIndex *int        `json:"first_error_index"`
	NextStepHint    *engineStep `json:"next_step_hint"`
	CorrectAnswer   string      `json:"correct_answer"`
}

type enginePracticeResult struct {
	Problem string `json:"problem"`
	Type    string `json:"type"`
}

// EngineError wraps a non-2xx response from the math engine so
// service/problem can translate it into a richerror with the right
// Kind and PRD-section-30 message.
type EngineError struct {
	StatusCode int
	Code       string
	Message    string
}

func (e *EngineError) Error() string {
	return fmt.Sprintf("math engine error (%d): %s: %s", e.StatusCode, e.Code, e.Message)
}

func (c *MathEngineClient) Parse(ctx context.Context, input string) (engineParseResult, error) {
	var result engineParseResult
	err := c.post(ctx, "/parse", map[string]string{"input": input}, &result)
	return result, err
}

func (c *MathEngineClient) Solve(ctx context.Context, problem string) (engineSolveResult, error) {
	var result engineSolveResult
	// lang words the step explanations (PRD section 18); the math itself
	// is language-independent.
	body := map[string]string{"problem": problem, "lang": locale.FromContext(ctx)}
	err := c.post(ctx, "/solve", body, &result)
	return result, err
}

func (c *MathEngineClient) Check(ctx context.Context, problem string, studentSteps []string) (engineCheckResult, error) {
	var result engineCheckResult
	body := map[string]any{"problem": problem, "student_steps": studentSteps, "lang": locale.FromContext(ctx)}
	err := c.post(ctx, "/check", body, &result)
	return result, err
}

func (c *MathEngineClient) Practice(ctx context.Context, problemType string) (enginePracticeResult, error) {
	var result enginePracticeResult
	err := c.post(ctx, "/practice", map[string]string{"type": problemType}, &result)
	return result, err
}

func (c *MathEngineClient) post(ctx context.Context, path string, body any, out any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("calling math engine: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 400 {
		var errBody struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		_ = json.Unmarshal(respBody, &errBody)
		return &EngineError{StatusCode: resp.StatusCode, Code: errBody.Error, Message: errBody.Message}
	}

	return json.Unmarshal(respBody, out)
}
