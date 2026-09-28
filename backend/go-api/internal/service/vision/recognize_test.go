package vision

import (
	"context"
	"testing"

	"github.com/anthropics/anthropic-sdk-go/option"

	"mathmotion/go-api/internal/pkg/richerror"
)

func TestRecognizeEquation_Success(t *testing.T) {
	srv := newFakeAnthropicServer(t, "2x + 5 = 17")
	defer srv.Close()

	repo := &fakeRepo{countProblems: 0}
	client := NewClient("test-key", option.WithBaseURL(srv.URL))
	svc := New(repo, client, 5)

	problems, err := svc.RecognizeEquations(context.Background(), "user-1", false, "ZmFrZQ==", "image/jpeg")
	if err != nil {
		t.Fatalf("RecognizeEquations returned error: %v", err)
	}
	if len(problems) != 1 || problems[0] != "2x + 5 = 17" {
		t.Fatalf("problems = %v, want [%q]", problems, "2x + 5 = 17")
	}
}

func TestRecognizeEquation_QuotaExceededBlocksNonPremiumUser(t *testing.T) {
	// No fake Anthropic server is started at all: if the quota check
	// didn't short-circuit first, this would fail with a connection
	// error instead of the expected quota error.
	repo := &fakeRepo{countProblems: 5}
	client := NewClient("test-key", option.WithBaseURL("http://127.0.0.1:0"))
	svc := New(repo, client, 5)

	_, err := svc.RecognizeEquations(context.Background(), "user-1", false, "ZmFrZQ==", "image/jpeg")
	if err == nil {
		t.Fatal("RecognizeEquation returned nil error, want quota exceeded")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindPaymentRequired {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindPaymentRequired)
	}
}

func TestRecognizeEquation_PremiumUserBypassesQuota(t *testing.T) {
	srv := newFakeAnthropicServer(t, "x = 6")
	defer srv.Close()

	repo := &fakeRepo{countProblems: 999}
	client := NewClient("test-key", option.WithBaseURL(srv.URL))
	svc := New(repo, client, 5)

	_, err := svc.RecognizeEquations(context.Background(), "user-1", true, "ZmFrZQ==", "image/jpeg")
	if err != nil {
		t.Fatalf("RecognizeEquation returned error for a premium user: %v", err)
	}
}

func TestRecognizeEquation_NotRecognizedMapsToInvalidKind(t *testing.T) {
	srv := newFakeAnthropicServer(t, "NONE")
	defer srv.Close()

	repo := &fakeRepo{}
	client := NewClient("test-key", option.WithBaseURL(srv.URL))
	svc := New(repo, client, 5)

	_, err := svc.RecognizeEquations(context.Background(), "user-1", false, "ZmFrZQ==", "image/jpeg")
	if err == nil {
		t.Fatal("RecognizeEquation returned nil error, want translated not-recognized error")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindInvalid {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindInvalid)
	}
	if richErr.Message() != "We couldn't understand this problem. Please check your equation." {
		t.Fatalf("Message() = %q, unexpected", richErr.Message())
	}
}
