package problemservice

import (
	"context"
	"errors"
	"testing"
	"time"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/problem/dto"
)

func TestHistory_ReturnsRepositoryItems(t *testing.T) {
	want := []dto.HistoryItem{
		{ProblemID: "p1", Problem: "2x + 5 = 17", ProblemType: "linear_equation", Answer: "x = 6", Verified: true, CreatedAt: time.Now()},
	}
	repo := &fakeRepo{listItems: want}
	svc := New(repo, NewMathEngineClient("http://unused"), 5)

	got, err := svc.History(context.Background(), "user-1", 20, 0)
	if err != nil {
		t.Fatalf("History returned error: %v", err)
	}
	if len(got) != 1 || got[0].ProblemID != "p1" {
		t.Fatalf("History() = %+v, want %+v", got, want)
	}
}

func TestHistory_RepositoryErrorIsWrapped(t *testing.T) {
	repo := &fakeRepo{listErr: errors.New("query failed")}
	svc := New(repo, NewMathEngineClient("http://unused"), 5)

	_, err := svc.History(context.Background(), "user-1", 20, 0)
	if err == nil {
		t.Fatal("History() returned nil error, want wrapped error")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindUnexpected {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindUnexpected)
	}
	if richErr.Message() != "Could not load history." {
		t.Fatalf("Message() = %q, unexpected", richErr.Message())
	}
}
