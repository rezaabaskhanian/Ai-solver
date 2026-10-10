package konkurservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/aiusage"
)

const guideMaxTokens = 2048

const guidePrompt = `You are an experienced Iranian konkur math teacher. Below is one multiple-choice ` +
	`question, its correct choice and its worked solution. Write a short "solving path" that teaches a ` +
	`student HOW to approach this question before they read the solution. Respond with ONLY a JSON object ` +
	`(no prose, no markdown fences) with exactly these fields:
{
  "given": ["<what the question gives, restated simply in Persian>", {"math": "<a given fact as plain ASCII math>"}],
  "asked": ["<what exactly is asked, in one short Persian sentence>"],
  "hints": [["<hint 1: the idea / which concept to use, without giving the result>"], ["<hint 2: the first concrete step>", {"math": "<optional math>"}], ["<hint 3: the step that unlocks the answer, still without the final choice>"]],
  "trap": ["<the most common mistake or trap choice and why it is wrong, in Persian>"]
}
Rules: ` +
	`Write in simple, friendly Persian for a high-school student. Give 2 or 3 hints, each one line or two, ` +
	`from general to specific; no hint may state the final answer or the correct choice number. ` +
	`Math always goes on its own line as {"math": "..."} in plain ASCII (x^2, sqrt(x), (a+b)/c, log_2(x)), ` +
	`never inside Persian prose. Write numbers with ASCII digits 0-9. Stay consistent with the given ` +
	`solution and correct choice; do not invent different facts. If there is no real trap, use [] for "trap".

QUESTION:
`

// GenerateGuide drafts a solving guide for one question with the
// admin-configured AI model. Nothing is saved: the admin reviews and
// edits it in the question form before saving the question.
func (s Service) GenerateGuide(ctx context.Context, q Question) (Guide, error) {
	const op = "konkurservice.GenerateGuide"
	if strings.TrimSpace(q.Text) == "" && strings.TrimSpace(q.Expression) == "" {
		return Guide{}, invalid(op, "متن سؤال خالی است")
	}
	if len(q.Choices) != 4 {
		return Guide{}, invalid(op, "سؤال باید دقیقاً ۴ گزینه داشته باشد")
	}
	if s.extractor == nil {
		return Guide{}, richerror.New(richerror.Op(op)).WithKind(richerror.KindUnexpected).
			WithMessage("مدل هوش مصنوعی تنظیم نشده است")
	}

	text, usage, err := s.extractor.Complete(ctx, guidePrompt+describeQuestion(q), guideMaxTokens, "", "")
	if err == nil && s.usage != nil {
		s.usage.Record(ctx, aiusage.Entry{
			Feature: "konkur_guide", Provider: usage.Provider, Model: usage.Model,
			InputTokens: usage.InputTokens, OutputTokens: usage.OutputTokens,
			CostUSD: usage.CostUSD, CostReported: usage.CostReported,
		})
	}
	if err != nil {
		return Guide{}, richerror.New(richerror.Op(op)).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("ساخت راهنمای حل با هوش مصنوعی ناموفق بود: " + err.Error())
	}

	g, err := parseGuide(text)
	if err != nil {
		return Guide{}, richerror.New(richerror.Op(op)).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("پاسخ مدل قابل‌خواندن نبود (JSON نامعتبر)")
	}
	return g, nil
}

// describeQuestion renders the question as plain text for the prompt.
func describeQuestion(q Question) string {
	var b strings.Builder
	b.WriteString(strings.TrimSpace(q.Text))
	b.WriteString("\n")
	if e := strings.TrimSpace(q.Expression); e != "" {
		b.WriteString(e + "\n")
	}
	b.WriteString("\nCHOICES:\n")
	for i, c := range q.Choices {
		fmt.Fprintf(&b, "%d) %s\n", i+1, c)
	}
	if q.Answer != nil && *q.Answer >= 0 && *q.Answer <= 3 {
		fmt.Fprintf(&b, "\nCORRECT CHOICE: %d\n", *q.Answer+1)
	}
	if len(q.Solution) > 0 {
		b.WriteString("\nSOLUTION:\n")
		for _, l := range q.Solution {
			if l.IsMath {
				b.WriteString(l.Math + "\n")
			} else {
				b.WriteString(l.Text + "\n")
			}
		}
	}
	return b.String()
}

// parseGuide pulls the JSON object out of a model reply that may be
// wrapped in ```json fences or surrounded by prose, dropping bad lines.
func parseGuide(text string) (Guide, error) {
	t := strings.TrimSpace(text)
	if i := strings.Index(t, "```"); i >= 0 {
		rest := t[i+3:]
		if j := strings.Index(rest, "```"); j >= 0 {
			rest = rest[:j]
		}
		t = rest
	}
	start := strings.Index(t, "{")
	end := strings.LastIndex(t, "}")
	if start < 0 || end < start {
		return Guide{}, errors.New("no JSON object in the reply")
	}
	var raw struct {
		Given []json.RawMessage `json:"given"`
		Asked []json.RawMessage `json:"asked"`
		Hints []json.RawMessage `json:"hints"`
		Trap  []json.RawMessage `json:"trap"`
	}
	if err := json.Unmarshal([]byte(t[start:end+1]), &raw); err != nil {
		return Guide{}, err
	}
	var warnings []string
	g := Guide{
		Given: rawLines("given", raw.Given, &warnings),
		Asked: rawLines("asked", raw.Asked, &warnings),
		Trap:  rawLines("trap", raw.Trap, &warnings),
		Hints: [][]Line{},
	}
	for i, h := range raw.Hints {
		var lines []json.RawMessage
		// A hint is a list of lines; accept a bare string/math line too.
		if err := json.Unmarshal(h, &lines); err != nil {
			lines = []json.RawMessage{h}
		}
		if hint := rawLines(fmt.Sprintf("hints[%d]", i), lines, &warnings); len(hint) > 0 {
			g.Hints = append(g.Hints, hint)
		}
	}
	if g.Empty() {
		return Guide{}, errors.New("the reply has no guide content")
	}
	return g, nil
}
