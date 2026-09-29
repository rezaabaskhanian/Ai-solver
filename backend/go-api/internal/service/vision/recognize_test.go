package vision

import (
	"context"
	"testing"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/quota"
)

func TestRecognizeEquation_Success(t *testing.T) {
	srv := newFakeAnthropicServer(t, "2x + 5 = 17")
	defer srv.Close()

	q := &fakeQuota{}
	client := newAnthropicTestClient(srv.URL)
	svc := New(client, q)

	problems, err := svc.RecognizeEquations(context.Background(), "user-1", false, "ZmFrZQ==", "image/jpeg")
	if err != nil {
		t.Fatalf("RecognizeEquations returned error: %v", err)
	}
	if len(problems) != 1 || problems[0] != "2x + 5 = 17" {
		t.Fatalf("problems = %v, want [%q]", problems, "2x + 5 = 17")
	}
	if len(q.recorded) != 1 || q.recorded[0] != quota.KindScan {
		t.Fatalf("recorded = %v, want [scan]", q.recorded)
	}
}

func TestRecognizeEquation_QuotaExceededBlocksNonPremiumUser(t *testing.T) {
	// No fake Anthropic server is started at all: if the quota check
	// didn't short-circuit first, this would fail with a connection
	// error instead of the expected quota error.
	q := &fakeQuota{allowErr: richerror.New("test").WithKind(richerror.KindPaymentRequired)}
	client := newAnthropicTestClient("http://127.0.0.1:0")
	svc := New(client, q)

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

func TestRecognizeEquation_PremiumScanCapReturnsTooManyRequests(t *testing.T) {
	q := &fakeQuota{allowErr: richerror.New("test").WithKind(richerror.KindTooManyRequests)}
	client := newAnthropicTestClient("http://127.0.0.1:0")
	svc := New(client, q)

	_, err := svc.RecognizeEquations(context.Background(), "user-1", true, "ZmFrZQ==", "image/jpeg")
	richErr, ok := err.(richerror.RichError)
	if !ok || richErr.Kind() != richerror.KindTooManyRequests {
		t.Fatalf("err = %v, want KindTooManyRequests", err)
	}
	if len(q.recorded) != 0 {
		t.Fatalf("a rejected scan must not be recorded, got %v", q.recorded)
	}
}

func TestRecognizeEquation_NotRecognizedMapsToInvalidKind(t *testing.T) {
	srv := newFakeAnthropicServer(t, "NONE")
	defer srv.Close()

	q := &fakeQuota{}
	client := newAnthropicTestClient(srv.URL)
	svc := New(client, q)

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
