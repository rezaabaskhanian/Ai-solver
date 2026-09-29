package problemservice

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"mathmotion/go-api/internal/pkg/richerror"
)

func engineCheckHandler(status int, body map[string]any) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(body)
	}
}

func TestCheck_SuccessReturnsResultWithoutPersisting(t *testing.T) {
	engineSrv := httptest.NewServer(engineCheckHandler(http.StatusOK, map[string]any{
		"status":            "incorrect",
		"step_statuses":     []string{"incorrect"},
		"first_error_index": 0,
		"next_step_hint": map[string]any{
			"id": 1, "before": "2x + 5 = 17", "after": "2x = 12",
			"operation": "subtract", "value": "5", "target": "both_sides",
			"explanation": "Subtract 5 from both sides.",
		},
		"correct_answer": "x = 6",
	}))
	defer engineSrv.Close()

	repo := &fakeRepo{}
	svc := New(repo, NewMathEngineClient(engineSrv.URL), &fakeQuota{})

	result, err := svc.Check(context.Background(), "user-1", true, "2x + 5 = 17", []string{"2x = 22"})
	if err != nil {
		t.Fatalf("Check returned error: %v", err)
	}
	if result.Status != "incorrect" || result.CorrectAnswer != "x = 6" {
		t.Fatalf("Check() = %+v, unexpected result", result)
	}
	if result.NextStepHint == nil || result.NextStepHint.Operation != "subtract" {
		t.Fatalf("NextStepHint = %+v, unexpected", result.NextStepHint)
	}
	if repo.saveCalled {
		t.Fatal("Check should never persist a problem/solution")
	}
}

func TestCheck_QuotaExceededBlocksNonPremiumUser(t *testing.T) {
	repo := &fakeRepo{}
	q := &fakeQuota{allowErr: richerror.New("test").WithKind(richerror.KindPaymentRequired)}
	svc := New(repo, NewMathEngineClient("http://127.0.0.1:0"), q)

	_, err := svc.Check(context.Background(), "user-1", false, "2x + 5 = 17", []string{})
	if err == nil {
		t.Fatal("Check() returned nil error, want quota exceeded")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindPaymentRequired {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindPaymentRequired)
	}
}

func TestCheck_EngineParseErrorIsTranslated(t *testing.T) {
	engineSrv := httptest.NewServer(engineCheckHandler(http.StatusUnprocessableEntity, map[string]any{
		"error": "parse_error", "message": "Could not parse 'x + y = 3'",
	}))
	defer engineSrv.Close()

	repo := &fakeRepo{}
	svc := New(repo, NewMathEngineClient(engineSrv.URL), &fakeQuota{})

	_, err := svc.Check(context.Background(), "user-1", true, "x + y = 3", []string{})
	richErr := err.(richerror.RichError)
	if richErr.Kind() != richerror.KindInvalid {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindInvalid)
	}
}
