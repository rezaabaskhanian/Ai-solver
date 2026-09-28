package vision

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/anthropics/anthropic-sdk-go/option"
)

// newFakeAnthropicServer stands in for the real /v1/messages endpoint,
// returning a Messages API response whose sole text block is
// responseText — enough to exercise Client.RecognizeEquations without a
// real API key or network call.
func newFakeAnthropicServer(t *testing.T, responseText string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":            "msg_test",
			"type":          "message",
			"role":          "assistant",
			"model":         "claude-opus-5",
			"stop_reason":   "end_turn",
			"stop_sequence": nil,
			"content": []map[string]any{
				{"type": "text", "text": responseText},
			},
			"usage": map[string]any{"input_tokens": 1, "output_tokens": 1},
		})
	}))
}

func TestClient_RecognizeEquations_ReturnsRecognizedText(t *testing.T) {
	srv := newFakeAnthropicServer(t, "2x + 5 = 17")
	defer srv.Close()

	client := NewClient("test-key", option.WithBaseURL(srv.URL))
	problems, err := client.RecognizeEquations(context.Background(), "ZmFrZS1pbWFnZQ==", "image/jpeg")
	if err != nil {
		t.Fatalf("RecognizeEquations returned error: %v", err)
	}
	if len(problems) != 1 || problems[0] != "2x + 5 = 17" {
		t.Fatalf("problems = %v, want [%q]", problems, "2x + 5 = 17")
	}
}

func TestClient_RecognizeEquations_NoneResponseIsNotRecognizedError(t *testing.T) {
	srv := newFakeAnthropicServer(t, "NONE")
	defer srv.Close()

	client := NewClient("test-key", option.WithBaseURL(srv.URL))
	_, err := client.RecognizeEquations(context.Background(), "ZmFrZS1pbWFnZQ==", "image/jpeg")
	if !IsNotRecognized(err) {
		t.Fatalf("err = %v, want a NotRecognizedError", err)
	}
}

func TestClient_RecognizeEquations_TrimsWhitespace(t *testing.T) {
	srv := newFakeAnthropicServer(t, "  x^2 - 4 = 0  \n")
	defer srv.Close()

	client := NewClient("test-key", option.WithBaseURL(srv.URL))
	problems, err := client.RecognizeEquations(context.Background(), "ZmFrZS1pbWFnZQ==", "image/jpeg")
	if err != nil {
		t.Fatalf("RecognizeEquations returned error: %v", err)
	}
	if len(problems) != 1 || problems[0] != "x^2 - 4 = 0" {
		t.Fatalf("problems = %v, want trimmed [%q]", problems, "x^2 - 4 = 0")
	}
}

func TestClient_RecognizeEquations_MultipleProblemsOnePerLine(t *testing.T) {
	srv := newFakeAnthropicServer(t, "2x + 5 = 17\nx^2 - 4 = 0\n")
	defer srv.Close()

	client := NewClient("test-key", option.WithBaseURL(srv.URL))
	problems, err := client.RecognizeEquations(context.Background(), "ZmFrZS1pbWFnZQ==", "image/jpeg")
	if err != nil {
		t.Fatalf("RecognizeEquations returned error: %v", err)
	}
	want := []string{"2x + 5 = 17", "x^2 - 4 = 0"}
	if len(problems) != len(want) || problems[0] != want[0] || problems[1] != want[1] {
		t.Fatalf("problems = %v, want %v", problems, want)
	}
}
