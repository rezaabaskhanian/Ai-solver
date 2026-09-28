package problemservice

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"mathmotion/go-api/internal/pkg/richerror"
)

func engineSolveHandler(status int, body map[string]any) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(body)
	}
}

func TestSolve_SuccessPersistsAndReturnsResult(t *testing.T) {
	engineSrv := httptest.NewServer(engineSolveHandler(http.StatusOK, map[string]any{
		"problem":  "2x + 5 = 17",
		"answer":   "x = 6",
		"verified": true,
		"type":     "linear_equation",
		"steps": []map[string]any{
			{
				"id": 1, "before": "2x + 5 = 17", "after": "2x = 12",
				"operation": "subtract", "value": "5", "target": "both_sides",
				"explanation": "Subtract 5 from both sides.",
			},
		},
	}))
	defer engineSrv.Close()

	repo := &fakeRepo{saveProblemID: "problem-123"}
	svc := New(repo, NewMathEngineClient(engineSrv.URL), 5)

	result, err := svc.Solve(context.Background(), "user-1", true, "2x + 5 = 17")
	if err != nil {
		t.Fatalf("Solve returned error: %v", err)
	}

	if result.ProblemID != "problem-123" || result.Answer != "x = 6" || !result.Verified {
		t.Fatalf("Solve() = %+v, unexpected result", result)
	}
	if len(result.Steps) != 1 || result.Steps[0].Operation != "subtract" {
		t.Fatalf("Solve() steps = %+v, unexpected", result.Steps)
	}

	if !repo.saveCalled {
		t.Fatal("expected SaveProblemAndSolution to be called")
	}
	if repo.savedUserID != "user-1" || repo.savedAnswer != "x = 6" || !repo.savedVerified {
		t.Fatalf("repo received unexpected args: userID=%q answer=%q verified=%v",
			repo.savedUserID, repo.savedAnswer, repo.savedVerified)
	}
	if len(repo.savedSteps) != 1 || repo.savedSteps[0].Operation != "subtract" {
		t.Fatalf("repo received unexpected steps: %+v", repo.savedSteps)
	}
}

func TestSolve_UnsupportedProblemTypeDoesNotPersist(t *testing.T) {
	engineSrv := httptest.NewServer(engineSolveHandler(http.StatusUnprocessableEntity, map[string]any{
		"error":   "unsupported_problem_type",
		"message": "'cubic_equation' is not supported yet.",
	}))
	defer engineSrv.Close()

	repo := &fakeRepo{}
	svc := New(repo, NewMathEngineClient(engineSrv.URL), 5)

	_, err := svc.Solve(context.Background(), "user-1", true, "x^3 = 8")
	if err == nil {
		t.Fatal("Solve() returned nil error, want translated engine error")
	}
	if repo.saveCalled {
		t.Fatal("SaveProblemAndSolution should not be called when the engine rejects the problem")
	}

	richErr := err.(richerror.RichError)
	if richErr.Kind() != richerror.KindInvalid {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindInvalid)
	}
	if richErr.Message() != "This type of problem isn't supported yet." {
		t.Fatalf("Message() = %q, unexpected", richErr.Message())
	}
}

func TestSolve_VerificationFailedIsTranslated(t *testing.T) {
	engineSrv := httptest.NewServer(engineSolveHandler(http.StatusUnprocessableEntity, map[string]any{
		"error":   "verification_failed",
		"message": "The computed solution did not verify against the original equation.",
	}))
	defer engineSrv.Close()

	repo := &fakeRepo{}
	svc := New(repo, NewMathEngineClient(engineSrv.URL), 5)

	_, err := svc.Solve(context.Background(), "user-1", true, "2x + 5 = 17")
	richErr := err.(richerror.RichError)
	if richErr.Kind() != richerror.KindInvalid {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindInvalid)
	}
	if repo.saveCalled {
		t.Fatal("SaveProblemAndSolution should not be called when verification fails")
	}
}

func TestSolve_RepositoryErrorIsWrappedAsUnexpected(t *testing.T) {
	engineSrv := httptest.NewServer(engineSolveHandler(http.StatusOK, map[string]any{
		"problem": "2x + 5 = 17", "answer": "x = 6", "verified": true,
		"type": "linear_equation", "steps": []map[string]any{},
	}))
	defer engineSrv.Close()

	repo := &fakeRepo{saveErr: errors.New("connection reset")}
	svc := New(repo, NewMathEngineClient(engineSrv.URL), 5)

	_, err := svc.Solve(context.Background(), "user-1", true, "2x + 5 = 17")
	if err == nil {
		t.Fatal("Solve() returned nil error, want repository error wrapped")
	}

	richErr := err.(richerror.RichError)
	if richErr.Kind() != richerror.KindUnexpected {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindUnexpected)
	}
	if richErr.Message() != "Could not save the solution." {
		t.Fatalf("Message() = %q, unexpected", richErr.Message())
	}
}

func TestSolve_QuotaExceededBlocksNonPremiumUser(t *testing.T) {
	// No engine server is started at all: if the quota check didn't
	// short-circuit before calling the engine, this test would fail
	// with a connection error instead of the expected quota error.
	repo := &fakeRepo{countProblems: 5}
	svc := New(repo, NewMathEngineClient("http://127.0.0.1:0"), 5)

	_, err := svc.Solve(context.Background(), "user-1", false, "2x + 5 = 17")
	if err == nil {
		t.Fatal("Solve() returned nil error, want quota exceeded")
	}
	if repo.saveCalled {
		t.Fatal("SaveProblemAndSolution should not be called once the free quota is used up")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindPaymentRequired {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindPaymentRequired)
	}
}

func TestSolve_PremiumUserBypassesQuota(t *testing.T) {
	engineSrv := httptest.NewServer(engineSolveHandler(http.StatusOK, map[string]any{
		"problem": "2x + 5 = 17", "answer": "x = 6", "verified": true,
		"type": "linear_equation", "steps": []map[string]any{},
	}))
	defer engineSrv.Close()

	repo := &fakeRepo{countProblems: 999}
	svc := New(repo, NewMathEngineClient(engineSrv.URL), 5)

	_, err := svc.Solve(context.Background(), "user-1", true, "2x + 5 = 17")
	if err != nil {
		t.Fatalf("Solve returned error for a premium user: %v", err)
	}
	if !repo.saveCalled {
		t.Fatal("expected SaveProblemAndSolution to be called for a premium user")
	}
}
