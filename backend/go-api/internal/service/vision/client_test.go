package vision

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	settingskeys "mathmotion/go-api/internal/service/settings"
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

	client := newAnthropicTestClient(srv.URL)
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

	client := newAnthropicTestClient(srv.URL)
	_, err := client.RecognizeEquations(context.Background(), "ZmFrZS1pbWFnZQ==", "image/jpeg")
	if !IsNotRecognized(err) {
		t.Fatalf("err = %v, want a NotRecognizedError", err)
	}
}

func TestClient_RecognizeEquations_TrimsWhitespace(t *testing.T) {
	srv := newFakeAnthropicServer(t, "  x^2 - 4 = 0  \n")
	defer srv.Close()

	client := newAnthropicTestClient(srv.URL)
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

	client := newAnthropicTestClient(srv.URL)
	problems, err := client.RecognizeEquations(context.Background(), "ZmFrZS1pbWFnZQ==", "image/jpeg")
	if err != nil {
		t.Fatalf("RecognizeEquations returned error: %v", err)
	}
	want := []string{"2x + 5 = 17", "x^2 - 4 = 0"}
	if len(problems) != len(want) || problems[0] != want[0] || problems[1] != want[1] {
		t.Fatalf("problems = %v, want %v", problems, want)
	}
}

// newFakeChatCompletionsServer stands in for an OpenAI-compatible
// /chat/completions endpoint (OpenRouter, DeepSeek) and records the last
// request so tests can check the model, auth header and image part.
func newFakeChatCompletionsServer(t *testing.T, status int, responseBody map[string]any, got *chatRequest, gotAuth *string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("path = %q, want /chat/completions", r.URL.Path)
		}
		if got != nil {
			_ = json.NewDecoder(r.Body).Decode(got)
		}
		if gotAuth != nil {
			*gotAuth = r.Header.Get("Authorization")
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(responseBody)
	}))
}

func chatReply(text string) map[string]any {
	return map[string]any{
		"choices": []map[string]any{{"message": map[string]any{"role": "assistant", "content": text}}},
	}
}

func TestClient_OpenRouter_SendsImageAndConfiguredModel(t *testing.T) {
	var got chatRequest
	var gotAuth string
	srv := newFakeChatCompletionsServer(t, http.StatusOK, chatReply("2x + 5 = 17\n"), &got, &gotAuth)
	defer srv.Close()

	client := NewClient(fakeSettings{
		settingskeys.KeyAIProvider:       "openrouter",
		settingskeys.KeyOpenRouterAPIKey: "or-key",
		settingskeys.KeyOpenRouterModel:  "google/some-vision-model",
	}, nil)
	client.openRouterURL = srv.URL

	problems, err := client.RecognizeEquations(context.Background(), "ZmFrZQ==", "image/png")
	if err != nil {
		t.Fatalf("RecognizeEquations returned error: %v", err)
	}
	if len(problems) != 1 || problems[0] != "2x + 5 = 17" {
		t.Fatalf("problems = %v, want [%q]", problems, "2x + 5 = 17")
	}
	if gotAuth != "Bearer or-key" {
		t.Fatalf("Authorization = %q, want %q", gotAuth, "Bearer or-key")
	}
	if got.Model != "google/some-vision-model" {
		t.Fatalf("model = %q, want %q", got.Model, "google/some-vision-model")
	}
	if len(got.Messages) != 1 || len(got.Messages[0].Content) != 2 {
		t.Fatalf("messages = %+v, want one message with an image part and a text part", got.Messages)
	}
	image := got.Messages[0].Content[0]
	if image.Type != "image_url" || image.ImageURL == nil || image.ImageURL.URL != "data:image/png;base64,ZmFrZQ==" {
		t.Fatalf("image part = %+v, want a data: URL of the photo", image)
	}
}

func TestClient_DeepSeek_UsesDefaultModelWhenUnset(t *testing.T) {
	var got chatRequest
	srv := newFakeChatCompletionsServer(t, http.StatusOK, chatReply("x = 6"), &got, nil)
	defer srv.Close()

	client := NewClient(fakeSettings{
		settingskeys.KeyAIProvider:     "deepseek",
		settingskeys.KeyDeepSeekAPIKey: "ds-key",
	}, nil)
	client.deepSeekURL = srv.URL

	if _, err := client.RecognizeEquations(context.Background(), "ZmFrZQ==", "image/jpeg"); err != nil {
		t.Fatalf("RecognizeEquations returned error: %v", err)
	}
	if got.Model != defaultDeepSeekModel {
		t.Fatalf("model = %q, want default %q", got.Model, defaultDeepSeekModel)
	}
}

func TestClient_OpenAICompatible_ErrorStatusSurfacesProviderMessage(t *testing.T) {
	srv := newFakeChatCompletionsServer(t, http.StatusBadRequest,
		map[string]any{"error": map[string]any{"message": "model does not support image input"}}, nil, nil)
	defer srv.Close()

	client := NewClient(fakeSettings{
		settingskeys.KeyAIProvider:     "deepseek",
		settingskeys.KeyDeepSeekAPIKey: "ds-key",
	}, nil)
	client.deepSeekURL = srv.URL

	_, err := client.RecognizeEquations(context.Background(), "ZmFrZQ==", "image/jpeg")
	if err == nil || !strings.Contains(err.Error(), "model does not support image input") {
		t.Fatalf("err = %v, want it to carry the provider's message", err)
	}
	if IsNotRecognized(err) {
		t.Fatal("a provider error must not be reported as NotRecognized")
	}
}

func TestClient_OpenAICompatible_NoneIsNotRecognized(t *testing.T) {
	srv := newFakeChatCompletionsServer(t, http.StatusOK, chatReply("NONE"), nil, nil)
	defer srv.Close()

	client := NewClient(fakeSettings{
		settingskeys.KeyAIProvider:       "openrouter",
		settingskeys.KeyOpenRouterAPIKey: "or-key",
	}, nil)
	client.openRouterURL = srv.URL

	_, err := client.RecognizeEquations(context.Background(), "ZmFrZQ==", "image/jpeg")
	if !IsNotRecognized(err) {
		t.Fatalf("err = %v, want a NotRecognizedError", err)
	}
}

func TestClient_MissingKeyForActiveProviderFailsWithoutCallingOut(t *testing.T) {
	// Anthropic key is set, but the active provider is OpenRouter: the
	// call must fail on the missing OpenRouter key, not silently fall back.
	client := NewClient(fakeSettings{
		settingskeys.KeyAIProvider:      "openrouter",
		settingskeys.KeyAnthropicAPIKey: "unused",
	}, nil)
	client.openRouterURL = "http://127.0.0.1:0"

	if client.Enabled() {
		t.Fatal("Enabled() = true, want false when the active provider has no key")
	}
	_, err := client.RecognizeEquations(context.Background(), "ZmFrZQ==", "image/jpeg")
	if err == nil || !strings.Contains(err.Error(), settingskeys.KeyOpenRouterAPIKey) {
		t.Fatalf("err = %v, want it to name %s", err, settingskeys.KeyOpenRouterAPIKey)
	}
}

func TestClient_ActiveProvider_UnknownFallsBackToAnthropic(t *testing.T) {
	for _, v := range []string{"", "gemini", "  OpenRouter  "} {
		client := NewClient(fakeSettings{settingskeys.KeyAIProvider: v}, nil)
		want := ProviderAnthropic
		if v == "  OpenRouter  " {
			want = ProviderOpenRouter
		}
		if got := client.ActiveProvider(); got != want {
			t.Errorf("ActiveProvider() with AI_PROVIDER=%q = %q, want %q", v, got, want)
		}
	}
}
