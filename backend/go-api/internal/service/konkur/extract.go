package konkurservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/aiusage"
)

const (
	// A page of ~10 questions with four choices and solutions in JSON is
	// well beyond the 512 tokens a scan needs.
	extractMaxTokens = 8192

	KindExtractQuestions = "questions"
	KindExtractTips      = "tips"
)

const questionsPrompt = `You will be shown one page of a Persian (Farsi) Iranian university-entrance ` +
	`(konkur) math exam booklet, or of a textbook/test book, as an image. Extract EVERY multiple-choice ` +
	`question on the page. Respond with ONLY a JSON array (no prose, no markdown fences), one object per ` +
	`question, in page order, with exactly these fields:
{
  "number": <the printed question number as an integer, or null>,
  "text": "<the question statement in Persian, exactly as printed, WITHOUT the math expression if it is displayed on its own line>",
  "expression": "<the main math expression of the question as plain ASCII math (e.g. x^2 - 3x + 2, sqrt(x+1), (2x+1)/(x-3), log_2(x), lim(x->0) sin(x)/x), or null if the question has none>",
  "choices": ["<choice 1>", "<choice 2>", "<choice 3>", "<choice 4>"],
  "answer": <index 0-3 of the correct choice if an answer key or marked answer is visible on the page, otherwise null>,
  "solution": ["<one line of the worked solution, Persian prose>", {"math": "<one line of math, plain ASCII>"}],
  "tipIds": []
}
Rules: ` +
	`Choices are in the order printed (1 to 4 become index 0 to 3); a choice that is a math expression is written ` +
	`in plain ASCII math, a choice that is a Persian phrase stays Persian. Write numbers with ASCII digits 0-9 ` +
	`(convert Persian digits ۰-۹ and Arabic digits ٠-٩). Never invent an answer or a solution: if no key or ` +
	`solution is visible use null for answer and [] for solution. Keep Persian text as printed; do not translate. ` +
	`If a question refers to a figure, describe what is drawn in "text" in one short Persian sentence. ` +
	`If the page contains no multiple-choice question respond with exactly: []`

const tipsPrompt = `You will be shown one page of a Persian (Farsi) math test-taking guide (nokte-ye konkuri / ` +
	`test-zani) as an image. Extract every distinct tip or trick on the page. Respond with ONLY a JSON array ` +
	`(no prose, no markdown fences), one object per tip, in page order, with exactly these fields:
{
  "title": "<short Persian title of the tip>",
  "grade": <school grade 7-12 the tip belongs to, or null for a general test-taking tip>,
  "body": ["<one line of Persian prose>", {"math": "<one line of math, plain ASCII>"}],
  "details": ["<line>", {"math": "<line>"}],
  "example": {"question": ["<line>", {"math": "<line>"}], "solution": ["<line>", {"math": "<line>"}]}
}
Rules: ` +
	`"example" is optional: omit it when the page has no worked example. "details" is an optional long-form ` +
	`explanation: omit it unless the page has one beyond the short body. Math always goes on its own line as ` +
	`{"math": "..."} in plain ASCII (x^2, sqrt(x), (a+b)/c, log_2(x)), never inside Persian prose. Write numbers ` +
	`with ASCII digits 0-9. Keep Persian text as printed; do not translate or invent content. ` +
	`If the page contains no tip respond with exactly: []`

// ExtractInput is one page to read.
type ExtractInput struct {
	ImageBase64 string
	MediaType   string
	SourceName  string
	// Kind is "questions" or "tips".
	Kind      string
	Year      int
	Track     string
	Round     int
	Abroad    bool
	PageLabel string
}

// Skipped is an item of the model's reply that could not become a draft.
type Skipped struct {
	Index  int    `json:"index"`
	Reason string `json:"reason"`
}

// ExtractResult is POST /admin/konkur/extract.
type ExtractResult struct {
	Drafts  []Draft   `json:"drafts"`
	Skipped []Skipped `json:"skipped"`
}

// Extract reads one page with the vision model and stores every usable
// item as a pending draft (invisible to the app).
func (s Service) Extract(ctx context.Context, in ExtractInput) (ExtractResult, error) {
	const op = "konkurservice.Extract"
	res := ExtractResult{Drafts: []Draft{}, Skipped: []Skipped{}}

	var prompt string
	switch in.Kind {
	case KindExtractQuestions:
		prompt = questionsPrompt
	case KindExtractTips:
		prompt = tipsPrompt
	default:
		return res, invalid(op, "kind باید questions یا tips باشد")
	}
	if in.Track != "" && !validTrack(in.Track) {
		return res, invalid(op, "track باید riazi یا tajrobi باشد")
	}
	if in.Round < 0 || in.Round > 2 {
		return res, invalid(op, "round باید ۱ یا ۲ باشد")
	}
	if strings.TrimSpace(in.ImageBase64) == "" {
		return res, invalid(op, "تصویر ارسال نشده است")
	}
	if s.extractor == nil {
		return res, richerror.New(richerror.Op(op)).WithKind(richerror.KindUnexpected).
			WithMessage("مدل بینایی تنظیم نشده است")
	}

	text, usage, err := s.extractor.Complete(ctx, prompt, extractMaxTokens, in.ImageBase64, in.MediaType)
	if err == nil && s.usage != nil {
		s.usage.Record(ctx, aiusage.Entry{
			Feature: "konkur_extract", Provider: usage.Provider, Model: usage.Model,
			InputTokens: usage.InputTokens, OutputTokens: usage.OutputTokens,
			CostUSD: usage.CostUSD, CostReported: usage.CostReported,
		})
	}
	if err != nil {
		return res, richerror.New(richerror.Op(op)).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("خواندن صفحه با هوش مصنوعی ناموفق بود: " + err.Error())
	}

	items, err := parseJSONArray(text)
	if err != nil {
		return res, richerror.New(richerror.Op(op)).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("پاسخ مدل قابل‌خواندن نبود (JSON نامعتبر)")
	}

	sourceName := strings.TrimSpace(in.SourceName)
	if pl := strings.TrimSpace(in.PageLabel); pl != "" {
		sourceName = strings.TrimSpace(sourceName + " — " + pl)
	}

	for i, raw := range items {
		var (
			data     any
			warnings []string
			kind     string
			rerr     error
		)
		if in.Kind == KindExtractTips {
			kind = KindTip
			data, warnings, rerr = tipFromRaw(raw)
		} else {
			kind = KindQuestion
			data, warnings, rerr = questionFromRaw(raw, in)
		}
		if rerr != nil {
			res.Skipped = append(res.Skipped, Skipped{Index: i, Reason: rerr.Error()})
			continue
		}
		encoded, merr := json.Marshal(data)
		if merr != nil {
			res.Skipped = append(res.Skipped, Skipped{Index: i, Reason: merr.Error()})
			continue
		}
		res.Drafts = append(res.Drafts, Draft{
			ID:         uuid.NewString(),
			Kind:       kind,
			SourceName: sourceName,
			Status:     StatusPending,
			Data:       encoded,
			Warnings:   nonNil(warnings),
		})
	}

	if len(res.Drafts) > 0 {
		saved, err := s.repo.InsertDrafts(ctx, res.Drafts)
		if err != nil {
			return res, wrap(op, err)
		}
		res.Drafts = saved
	}
	return res, nil
}

// parseJSONArray pulls the JSON array out of a model reply that may be
// wrapped in ```json fences or surrounded by prose.
func parseJSONArray(text string) ([]json.RawMessage, error) {
	t := strings.TrimSpace(text)
	if i := strings.Index(t, "```"); i >= 0 {
		rest := t[i+3:]
		if j := strings.Index(rest, "```"); j >= 0 {
			rest = rest[:j]
		}
		t = rest
	}
	start := strings.Index(t, "[")
	end := strings.LastIndex(t, "]")
	if start < 0 || end < start {
		return nil, errors.New("no JSON array in the reply")
	}
	var items []json.RawMessage
	if err := json.Unmarshal([]byte(t[start:end+1]), &items); err != nil {
		return nil, err
	}
	return items, nil
}

// rawLines decodes a list of lines, dropping (and reporting) bad ones.
func rawLines(field string, raws []json.RawMessage, warnings *[]string) []Line {
	lines := []Line{}
	for i, r := range raws {
		var l Line
		if err := json.Unmarshal(r, &l); err != nil {
			*warnings = append(*warnings, fmt.Sprintf("%s: خط %d نامعتبر بود و حذف شد", field, i+1))
			continue
		}
		lines = append(lines, l)
	}
	return lines
}

type rawQuestion struct {
	Number     *int              `json:"number"`
	Text       string            `json:"text"`
	Expression *string           `json:"expression"`
	Choices    []json.RawMessage `json:"choices"`
	Answer     json.RawMessage   `json:"answer"`
	Solution   []json.RawMessage `json:"solution"`
}

func rawToString(r json.RawMessage) string {
	var s string
	if json.Unmarshal(r, &s) == nil {
		return s
	}
	var n json.Number
	if json.Unmarshal(r, &n) == nil {
		return n.String()
	}
	return strings.Trim(string(r), `"`)
}

func questionFromRaw(raw json.RawMessage, in ExtractInput) (Question, []string, error) {
	var rq rawQuestion
	if err := json.Unmarshal(raw, &rq); err != nil {
		return Question{}, nil, fmt.Errorf("آیتم یک سؤال معتبر نیست: %v", err)
	}
	if strings.TrimSpace(rq.Text) == "" {
		return Question{}, nil, errors.New("متن سؤال خالی است")
	}

	var warnings []string
	q := Question{
		Text:     strings.TrimSpace(rq.Text),
		TipIDs:   []string{},
		Choices:  []string{},
		Solution: rawLines("solution", rq.Solution, &warnings),
	}
	if rq.Expression != nil {
		q.Expression = strings.TrimSpace(*rq.Expression)
	}
	for _, c := range rq.Choices {
		q.Choices = append(q.Choices, strings.TrimSpace(rawToString(c)))
	}

	trimmedAnswer := strings.TrimSpace(string(rq.Answer))
	if trimmedAnswer != "" && trimmedAnswer != "null" {
		var a int
		if err := json.Unmarshal(rq.Answer, &a); err != nil || a < 0 || a > 3 {
			warnings = append(warnings, "پاسخ تشخیص‌داده‌شده معتبر نیست (باید ۰ تا ۳ باشد)")
		} else {
			q.Answer = &a
		}
	}

	q.Source = Source{Kind: SourceAuthored}
	if in.Year > 0 && validTrack(in.Track) {
		q.Source = Source{Kind: SourceKonkur, Year: in.Year, Track: in.Track, Round: in.Round, Abroad: in.Abroad}
		if rq.Number != nil && *rq.Number > 0 {
			q.Source.Number = *rq.Number
		}
	} else {
		warnings = append(warnings, "منبع کنکوری (سال و رشته) مشخص نشده؛ به‌صورت authored ثبت شد")
	}
	q.ID = questionID(q.Source)

	for _, p := range questionProblems(q, true) {
		warnings = append(warnings, p)
	}
	return q, warnings, nil
}

// questionID is deterministic for booklet questions (so the same page
// extracted twice collides and shows up as "already exists" on approve).
func questionID(src Source) string {
	if src.Kind == SourceKonkur && src.Number > 0 {
		id := fmt.Sprintf("konkur-%d-%s-%d", src.Year, src.Track, src.Number)
		if src.Abroad {
			id += "-abroad"
		}
		if src.Round > 0 {
			id += fmt.Sprintf("-r%d", src.Round)
		}
		return id
	}
	return "q-" + strings.ReplaceAll(uuid.NewString(), "-", "")[:8]
}

type rawTip struct {
	Title   string            `json:"title"`
	Grade   *int              `json:"grade"`
	Body    []json.RawMessage `json:"body"`
	Details []json.RawMessage `json:"details"`
	Example *struct {
		Question []json.RawMessage `json:"question"`
		Solution []json.RawMessage `json:"solution"`
	} `json:"example"`
}

func tipFromRaw(raw json.RawMessage) (Tip, []string, error) {
	var rt rawTip
	if err := json.Unmarshal(raw, &rt); err != nil {
		return Tip{}, nil, fmt.Errorf("آیتم یک نکته‌ی معتبر نیست: %v", err)
	}
	if strings.TrimSpace(rt.Title) == "" {
		return Tip{}, nil, errors.New("عنوان نکته خالی است")
	}
	var warnings []string
	t := Tip{
		ID:    "tip-" + strings.ReplaceAll(uuid.NewString(), "-", "")[:8],
		Grade: rt.Grade,
		Title: strings.TrimSpace(rt.Title),
		Body:  rawLines("body", rt.Body, &warnings),
	}
	if len(rt.Details) > 0 {
		t.Details = rawLines("details", rt.Details, &warnings)
	}
	if rt.Example != nil {
		t.Example = &Example{
			Question: rawLines("example.question", rt.Example.Question, &warnings),
			Solution: rawLines("example.solution", rt.Example.Solution, &warnings),
		}
	}
	for _, p := range tipProblems(t) {
		warnings = append(warnings, p)
	}
	return t, warnings, nil
}
