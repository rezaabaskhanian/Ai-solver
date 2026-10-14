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
	KindExtractExercises = "exercises"
	// KindExtractNotes reads a teaching booklet (جزوه) page into tips of
	// one textbook chapter, rewritten in our own words.
	KindExtractNotes = "notes"
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

const exercisesPrompt = `You will be shown one page of an official Iranian school math textbook (in Persian), ` +
	`as an image. Extract EVERY numbered exercise on the page from the sections titled «تمرین», «کار در کلاس» ` +
	`and «فعالیت» (ignore the lesson's explanations and solved examples). Respond with ONLY a JSON array (no ` +
	`prose, no markdown fences), one object per exercise, in page order, with exactly these fields:
{
  "number": <the printed exercise number as an integer>,
  "section": "<exercise for «تمرین», classwork for «کار در کلاس», activity for «فعالیت»>",
  "text": ["<the statement in Persian exactly as printed>", {"math": "<a displayed math line as plain ASCII>"}],
  "parts": [{"label": "<الف / ب / پ / ...>", "text": ["<the part's statement>", {"math": "<math>"}], "answer": ["<short final answer>"], "solution": ["<step>", {"math": "<math>"}]}],
  "answer": ["<short final answer of the whole exercise, when it has no parts>"],
  "solution": ["<one step of a worked solution, simple Persian>", {"math": "<one line of math, plain ASCII>"}],
  "tipIds": ["<id of each study note below that the solution uses, most important first>"]
}
Rules: ` +
	`Copy the statement word for word; never shorten or reword it. Use "parts" only when the exercise has lettered ` +
	`parts (الف، ب، پ، ت ...), with the shared lead-in sentence in "text"; otherwise use []. Then SOLVE every ` +
	`exercise yourself, for a grade-school student, in short, clear Persian steps: write the solution in your own ` +
	`words (never copy one from a solutions book), and put each part's steps in that part's "solution". Every step ` +
	`must be mathematically correct; if you are not sure, leave "solution" as [] rather than guess. Math always goes ` +
	`on its own line as {"math": "..."} in plain ASCII (x^2, sqrt(x), (a+b)/c, 3/4, a*b), never inside Persian prose. ` +
	`Write numbers with ASCII digits 0-9. If the exercise refers to a figure, describe what is drawn in one short ` +
	`Persian sentence at the end of "text". If the page contains no exercise respond with exactly: []`

const notesPrompt = `You will be shown one page of a Persian (Farsi) school math teaching booklet (jozve) as an ` +
	`image. Turn the page's teaching content into short, self-contained study notes for a student. Respond with ONLY ` +
	`a JSON array (no prose, no markdown fences), one object per distinct concept, rule, formula or method on the ` +
	`page, in page order, with exactly these fields:
{
  "title": "<short Persian title of the concept>",
  "body": ["<one line of Persian prose>", {"math": "<one line of math, plain ASCII>"}],
  "details": ["<line>", {"math": "<line>"}],
  "example": {"question": ["<line>", {"math": "<line>"}], "solution": ["<line>", {"math": "<line>"}]}
}
Rules: ` +
	`Write every note IN YOUR OWN WORDS in simple, friendly Persian: never copy the booklet's sentences, and never ` +
	`mention the booklet, its author, a teacher, a publisher, a school or a website. "body" is the 2-4 line summary; ` +
	`"details" is an optional longer explanation; "example" is optional — if you include one, make up your own small ` +
	`example rather than copying the booklet's, and solve it correctly. Skip covers, tables of contents, ads and ` +
	`exercises without teaching content. Math always goes on its own line as {"math": "..."} in plain ASCII ` +
	`(x^2, sqrt(x), (a+b)/c, 3/4), never inside Persian prose. Write numbers with ASCII digits 0-9. ` +
	`If the page has no teaching content respond with exactly: []`

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

	// Textbook exercises (Kind "exercises") and booklet notes (Kind
	// "notes"): where the page belongs. Grade is the book's grade, set on
	// the notes.
	BookID    string
	ChapterID string
	Lesson    int
	Page      int
	Grade     int

	// Questions only: ChapterID (optional) links them to that chapter's
	// tips, which fills the chapter's exam; Rewrite turns a test book's
	// questions into our own (new numbers and wording, solved again).
	Rewrite bool
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

	var (
		prompt string
		// The chapter's study notes an exercise solution may cite.
		notes []Tip
	)
	switch in.Kind {
	case KindExtractQuestions:
		prompt = questionsPrompt
		if in.Rewrite {
			prompt += rewriteInstruction
		}
		if strings.TrimSpace(in.ChapterID) != "" {
			var err error
			if notes, err = s.chapterNotes(ctx, in.ChapterID); err != nil {
				return res, wrap(op, err)
			}
			prompt += questionTipsField + notesContext(notes)
		}
	case KindExtractTips:
		prompt = tipsPrompt
	case KindExtractExercises:
		if strings.TrimSpace(in.BookID) == "" || strings.TrimSpace(in.ChapterID) == "" || in.Page <= 0 {
			return res, invalid(op, "برای تمرین کتاب، کتاب، فصل و شماره‌ی صفحه لازم است")
		}
		var err error
		if notes, err = s.chapterNotes(ctx, in.ChapterID); err != nil {
			return res, wrap(op, err)
		}
		prompt = exercisesPrompt + notesContext(notes)
	case KindExtractNotes:
		if strings.TrimSpace(in.ChapterID) == "" || !validGrade(in.Grade) {
			return res, invalid(op, "برای جزوه، پایه و فصل لازم است")
		}
		prompt = notesPrompt
	default:
		return res, invalid(op, "kind باید questions، tips، exercises یا notes باشد")
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

	feature := "konkur_extract"
	switch in.Kind {
	case KindExtractExercises:
		feature = "textbook_extract"
	case KindExtractNotes:
		feature = "notes_extract"
	}
	text, usage, err := s.extractor.Complete(ctx, prompt, extractMaxTokens, in.ImageBase64, in.MediaType)
	if err == nil && s.usage != nil {
		s.usage.Record(ctx, aiusage.Entry{
			Feature: feature, Provider: usage.Provider, Model: usage.Model,
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
		if in.Kind == KindExtractExercises {
			kind = KindExercise
			var e Exercise
			e, warnings, rerr = exerciseFromRaw(raw, in)
			if rerr == nil {
				e.TipIDs = knownTipIDs(e.TipIDs, notes)
			}
			data = e
		} else if in.Kind == KindExtractTips || in.Kind == KindExtractNotes {
			kind = KindTip
			var t Tip
			t, warnings, rerr = tipFromRaw(raw)
			if rerr == nil && in.Kind == KindExtractNotes {
				grade := in.Grade
				t.Grade = &grade
				t.ChapterID = strings.TrimSpace(in.ChapterID)
				warnings = append(warnings, "متن را هوش مصنوعی بازنویسی کرده؛ قبل از تأیید بخوان که درست و به زبان خودمان باشد")
			}
			data = t
		} else {
			kind = KindQuestion
			var q Question
			q, warnings, rerr = questionFromRaw(raw, in)
			if rerr == nil && strings.TrimSpace(in.ChapterID) != "" {
				q.TipIDs = nonNilStrings(knownTipIDs(q.TipIDs, notes))
				if len(q.TipIDs) == 0 {
					warnings = append(warnings, "هیچ نکته‌ای از این فصل به سؤال وصل نشد؛ قبل از تأیید یک نکته انتخاب کن")
				}
			}
			if rerr == nil && in.Rewrite {
				warnings = append(warnings, "سؤال را هوش مصنوعی بازنویسی و دوباره حل کرده؛ جواب و راه‌حل را با دقت چک کن")
			}
			data = q
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
	TipIDs     []string          `json:"tipIds"`
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
	// Only with a chapter were notes offered (Extract keeps the known ones).
	if strings.TrimSpace(in.ChapterID) != "" {
		q.TipIDs = nonNilStrings(rq.TipIDs)
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

	// A rewritten question is our own (authored), whatever the page was.
	q.Source = Source{Kind: SourceAuthored}
	switch {
	case in.Rewrite:
	case in.Year > 0 && validTrack(in.Track):
		q.Source = Source{Kind: SourceKonkur, Year: in.Year, Track: in.Track, Round: in.Round, Abroad: in.Abroad}
		if rq.Number != nil && *rq.Number > 0 {
			q.Source.Number = *rq.Number
		}
	default:
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

type rawExercisePart struct {
	Label    string            `json:"label"`
	Text     []json.RawMessage `json:"text"`
	Answer   []json.RawMessage `json:"answer"`
	Solution []json.RawMessage `json:"solution"`
}

type rawExercise struct {
	TipIDs   []string          `json:"tipIds"`
	Number   *int              `json:"number"`
	Section  string            `json:"section"`
	Text     []json.RawMessage `json:"text"`
	Parts    []rawExercisePart `json:"parts"`
	Answer   []json.RawMessage `json:"answer"`
	Solution []json.RawMessage `json:"solution"`
}

func exerciseFromRaw(raw json.RawMessage, in ExtractInput) (Exercise, []string, error) {
	var re rawExercise
	if err := json.Unmarshal(raw, &re); err != nil {
		return Exercise{}, nil, fmt.Errorf("آیتم یک تمرین معتبر نیست: %v", err)
	}
	var warnings []string
	e := Exercise{
		BookID:    strings.TrimSpace(in.BookID),
		ChapterID: strings.TrimSpace(in.ChapterID),
		Lesson:    in.Lesson,
		Section:   strings.TrimSpace(re.Section),
		Page:      in.Page,
		Text:      rawLines("text", re.Text, &warnings),
		Solution:  rawLines("solution", re.Solution, &warnings),
	}
	if len(re.Answer) > 0 {
		e.Answer = rawLines("answer", re.Answer, &warnings)
	}
	if !validSection(e.Section) {
		if e.Section != "" {
			warnings = append(warnings, "نوع تمرین تشخیص داده نشد؛ «تمرین» در نظر گرفته شد")
		}
		e.Section = SectionExercise
	}
	if re.Number != nil && *re.Number > 0 {
		e.Number = *re.Number
	}
	e.TipIDs = re.TipIDs
	for i, rp := range re.Parts {
		part := ExercisePart{
			Label:    strings.TrimSpace(rp.Label),
			Text:     rawLines(fmt.Sprintf("parts[%d].text", i), rp.Text, &warnings),
			Solution: rawLines(fmt.Sprintf("parts[%d].solution", i), rp.Solution, &warnings),
		}
		if len(rp.Answer) > 0 {
			part.Answer = rawLines(fmt.Sprintf("parts[%d].answer", i), rp.Answer, &warnings)
		}
		e.Parts = append(e.Parts, part)
	}
	if len(e.Text) == 0 && len(e.Parts) == 0 {
		return Exercise{}, nil, errors.New("صورت تمرین خالی است")
	}
	e = normalizeExercise(e)
	e.ID = exerciseID(e)
	// The model solved it, not the book: always flag it for a careful check.
	warnings = append(warnings, "راه‌حل را هوش مصنوعی نوشته؛ قبل از تأیید، درستی هر قدم را بررسی کن")
	warnings = append(warnings, exerciseProblems(e)...)
	return e, warnings, nil
}

// maxContextNotes caps how many of a chapter's notes go into the
// exercise prompt (a long chapter would otherwise blow up the prompt).
const maxContextNotes = 40

// chapterNotes is every tip of the chapter (published or not; the admin
// may still be reviewing a booklet's notes).
func (s Service) chapterNotes(ctx context.Context, chapterID string) ([]Tip, error) {
	tips, err := s.repo.ListTips(ctx)
	if err != nil {
		return nil, err
	}
	var out []Tip
	for _, t := range tips {
		if t.ChapterID == strings.TrimSpace(chapterID) {
			out = append(out, t)
		}
	}
	if len(out) > maxContextNotes {
		out = out[:maxContextNotes]
	}
	return out, nil
}

func linesText(lines []Line) string {
	parts := make([]string, 0, len(lines))
	for _, l := range lines {
		if l.IsMath {
			parts = append(parts, l.Math)
		} else {
			parts = append(parts, l.Text)
		}
	}
	return strings.Join(parts, " / ")
}

// notesContext appends the chapter's study notes to the exercise prompt,
// so solutions are built on what the app teaches and cite it in tipIds.
func notesContext(notes []Tip) string {
	if len(notes) == 0 {
		return "\n\nThere are no study notes for this chapter yet: use [] for \"tipIds\"."
	}
	var b strings.Builder
	b.WriteString("\n\nSTUDY NOTES of this chapter (the app teaches these). Build each solution on these notes, ")
	b.WriteString("using the same method and wording where possible, and list the ids of the notes it uses in \"tipIds\". ")
	b.WriteString("Use only ids from this list; if no note fits, use []:\n")
	for _, t := range notes {
		fmt.Fprintf(&b, "- id: %s | %s: %s\n", t.ID, t.Title, linesText(t.Body))
	}
	return b.String()
}

// knownTipIDs keeps only ids of the given notes (the model may invent
// some), in order and without duplicates.
func knownTipIDs(ids []string, notes []Tip) []string {
	known := make(map[string]bool, len(notes))
	for _, t := range notes {
		known[t.ID] = true
	}
	var out []string
	seen := map[string]bool{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if known[id] && !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

// rewriteInstruction turns a test book's questions into our own: the
// book's questions belong to its publisher, so only the idea is kept.
const rewriteInstruction = `

REWRITE MODE: this page is from a commercial test book, so do NOT copy its questions. For each question, ` +
	`write a NEW question that tests the same idea at the same difficulty, in your own Persian wording and with ` +
	`different numbers, and four new choices (one correct, three plausible distractors). Then solve YOUR question ` +
	`yourself: "answer" is the index of its correct choice and "solution" its worked steps (both are required in ` +
	`this mode). Check the arithmetic twice. Use null for "number". Never mention the book, publisher or author.`

// questionTipsField asks for the study notes a question uses (filled by
// notesContext below it).
const questionTipsField = `

Also add to each object a field "tipIds": the ids of the study notes below that the question tests, most ` +
	`important first.`

func nonNilStrings(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
