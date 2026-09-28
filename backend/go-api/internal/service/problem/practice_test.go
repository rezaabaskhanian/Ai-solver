package problemservice

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGeneratePractice_Success(t *testing.T) {
	engineSrv := httptest.NewServer(engineCheckHandler(http.StatusOK, map[string]any{
		"problem": "3x - 4 = 11", "type": "linear_equation",
	}))
	defer engineSrv.Close()

	svc := New(&fakeRepo{}, NewMathEngineClient(engineSrv.URL), 5)

	result, err := svc.GeneratePractice(context.Background(), "linear_equation")
	if err != nil {
		t.Fatalf("GeneratePractice returned error: %v", err)
	}
	if result.Problem != "3x - 4 = 11" || result.Type != "linear_equation" {
		t.Fatalf("GeneratePractice() = %+v, unexpected", result)
	}
}

func TestGeneratePractice_NotGatedByQuota(t *testing.T) {
	// A non-Premium user with an exhausted quota should still get a
	// practice problem — GeneratePractice doesn't check CountProblems
	// at all, unlike Solve/Check.
	engineSrv := httptest.NewServer(engineCheckHandler(http.StatusOK, map[string]any{
		"problem": "x^2 - 1 = 0", "type": "quadratic_equation",
	}))
	defer engineSrv.Close()

	repo := &fakeRepo{countProblems: 999}
	svc := New(repo, NewMathEngineClient(engineSrv.URL), 5)

	_, err := svc.GeneratePractice(context.Background(), "quadratic_equation")
	if err != nil {
		t.Fatalf("GeneratePractice returned error for a quota-exhausted user: %v", err)
	}
}
