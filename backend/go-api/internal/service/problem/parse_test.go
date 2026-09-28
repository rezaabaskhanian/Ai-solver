package problemservice

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"mathmotion/go-api/internal/pkg/richerror"
)

func TestParse_Success(t *testing.T) {
	engineSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/parse" {
			t.Fatalf("unexpected path %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"problem":    "2x + 5 = 17",
			"type":       "linear_equation",
			"confidence": 0.99,
		})
	}))
	defer engineSrv.Close()

	svc := New(&fakeRepo{}, NewMathEngineClient(engineSrv.URL), 5)

	result, err := svc.Parse(context.Background(), "2x + 5 = 17")
	if err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if result.Problem != "2x + 5 = 17" || result.Type != "linear_equation" || result.Confidence != 0.99 {
		t.Fatalf("Parse() = %+v, unexpected result", result)
	}
}

func TestParse_EngineParseErrorIsTranslated(t *testing.T) {
	engineSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":   "parse_error",
			"message": "Could not parse 'x=' as a math expression",
		})
	}))
	defer engineSrv.Close()

	svc := New(&fakeRepo{}, NewMathEngineClient(engineSrv.URL), 5)

	_, err := svc.Parse(context.Background(), "x=")
	if err == nil {
		t.Fatal("Parse() returned nil error, want translated engine error")
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

func TestParse_EngineUnreachableIsUnexpectedKind(t *testing.T) {
	svc := New(&fakeRepo{}, NewMathEngineClient("http://127.0.0.1:0"), 5)

	_, err := svc.Parse(context.Background(), "2x + 5 = 17")
	if err == nil {
		t.Fatal("Parse() returned nil error, want error for unreachable engine")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindUnexpected {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindUnexpected)
	}
}
