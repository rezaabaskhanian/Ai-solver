// Package vision reads every handwritten/printed math problem in a
// photo and returns each as plain text — nothing more. It never
// computes or verifies an answer (PRD section 38's rule): each
// recognized problem is handed to the existing POST
// /api/v1/problems/solve exactly like typed input, so the Math Engine
// remains the only thing that solves or verifies anything.
package vision

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

const recognitionPrompt = `You will be shown a photo that may contain one or more handwritten or ` +
	`printed math problems. Transcribe EVERY distinct problem exactly as written, one per line, ` +
	`using plain ASCII (e.g. x^2, sqrt(x), sin(x), *, /  — no LaTeX, no unicode math symbols). ` +
	`Respond with the transcriptions only, one problem per line: no numbering, no explanation, ` +
	`no commentary, no markdown formatting. If there is no legible math problem in the image, ` +
	`respond with exactly: NONE`

// NotRecognizedError means Claude looked at the photo and found no
// legible equation — distinct from a transport/API failure, so the
// caller can map it to the same "couldn't understand" copy used for a
// typed parse failure instead of a generic error.
type NotRecognizedError struct{}

func (e *NotRecognizedError) Error() string {
	return "no legible math problem found in the image"
}

type Client struct {
	anthropic *anthropic.Client
}

// NewClient accepts extra option.RequestOption values so tests can
// point it at a fake server via option.WithBaseURL — same idea as
// BazaarClient's authURL/validateURL override in internal/service/billing.
func NewClient(apiKey string, opts ...option.RequestOption) *Client {
	allOpts := append([]option.RequestOption{option.WithAPIKey(apiKey)}, opts...)
	c := anthropic.NewClient(allOpts...)
	return &Client{anthropic: &c}
}

func (c *Client) RecognizeEquations(ctx context.Context, imageBase64, mediaType string) ([]string, error) {
	resp, err := c.anthropic.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     "claude-opus-5",
		MaxTokens: 512,
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(
				anthropic.NewImageBlockBase64(mediaType, imageBase64),
				anthropic.NewTextBlock(recognitionPrompt),
			),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("calling claude vision: %w", err)
	}

	var text strings.Builder
	for _, block := range resp.Content {
		if b, ok := block.AsAny().(anthropic.TextBlock); ok {
			text.WriteString(b.Text)
		}
	}

	var problems []string
	for _, line := range strings.Split(text.String(), "\n") {
		line = strings.TrimSpace(line)
		if line != "" && line != "NONE" {
			problems = append(problems, line)
		}
	}

	if len(problems) == 0 {
		return nil, &NotRecognizedError{}
	}
	return problems, nil
}

// IsNotRecognized reports whether err is (or wraps) a NotRecognizedError.
func IsNotRecognized(err error) bool {
	var notRecognized *NotRecognizedError
	return errors.As(err, &notRecognized)
}
