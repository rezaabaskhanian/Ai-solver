package vision

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// OpenRouter and DeepSeek both speak OpenAI's Chat Completions protocol,
// so one plain net/http caller serves both — only the base URL, key and
// model differ. The image goes in as a data: URL inside an image_url
// content part; the chosen model has to accept image input (see the
// admin panel's hint on the DeepSeek/OpenRouter model fields).

type chatContentPart struct {
	Type     string        `json:"type"`
	Text     string        `json:"text,omitempty"`
	ImageURL *chatImageURL `json:"image_url,omitempty"`
}

type chatImageURL struct {
	URL string `json:"url"`
}

type chatMessage struct {
	Role    string            `json:"role"`
	Content []chatContentPart `json:"content"`
}

type chatRequest struct {
	Model     string        `json:"model"`
	Messages  []chatMessage `json:"messages"`
	MaxTokens int           `json:"max_tokens"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *Client) callOpenAICompatible(ctx context.Context, baseURL, apiKey, model, imageBase64, mediaType string) (string, error) {
	body, err := json.Marshal(chatRequest{
		Model:     model,
		MaxTokens: maxOutputTokens,
		Messages: []chatMessage{{
			Role: "user",
			Content: []chatContentPart{
				{Type: "image_url", ImageURL: &chatImageURL{URL: "data:" + mediaType + ";base64," + imageBase64}},
				{Type: "text", Text: recognitionPrompt},
			},
		}},
	})
	if err != nil {
		return "", fmt.Errorf("marshaling chat request: %w", err)
	}

	url := strings.TrimRight(baseURL, "/") + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("building chat request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("reading chat response: %w", err)
	}

	var parsed chatResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("unparsable response (status %d): %s", resp.StatusCode, truncate(string(respBody), 300))
	}
	if resp.StatusCode != http.StatusOK {
		msg := truncate(string(respBody), 300)
		if parsed.Error != nil && parsed.Error.Message != "" {
			msg = parsed.Error.Message
		}
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, msg)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("response had no choices")
	}
	return parsed.Choices[0].Message.Content, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
