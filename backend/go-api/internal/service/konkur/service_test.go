package konkurservice

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"testing"
	"time"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/aiusage"
	"mathmotion/go-api/internal/service/vision"
)

// fakeRepo is an in-memory Repository that, like the real one, bumps the
// version on every change to a published tip/question.
type fakeRepo struct {
	version   int64
	tips      map[string]Tip
	questions map[string]Question
	drafts    map[string]Draft
	draftSeq  []string
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		version:   1,
		tips:      map[string]Tip{},
		questions: map[string]Question{},
		drafts:    map[string]Draft{},
	}
}

func (f *fakeRepo) Version(ctx context.Context) (int64, error) { return f.version, nil }

func (f *fakeRepo) Published(ctx context.Context) ([]Tip, []Question, error) {
	var tips []Tip
	for _, t := range f.tips {
		tips = append(tips, t)
	}
	sort.Slice(tips, func(i, j int) bool { return tips[i].ID < tips[j].ID })
	var qs []Question
	for _, q := range f.questions {
		qs = append(qs, q)
	}
	sort.Slice(qs, func(i, j int) bool { return qs[i].ID < qs[j].ID })
	return tips, qs, nil
}

func (f *fakeRepo) ListTips(ctx context.Context) ([]Tip, error) {
	t, _, err := f.Published(ctx)
	return t, err
}

func (f *fakeRepo) ListQuestions(ctx context.Context, _ QuestionFilter) ([]Question, error) {
	_, q, err := f.Published(ctx)
	return q, err
}

func (f *fakeRepo) SaveTip(ctx context.Context, t Tip, mode SaveMode) error {
	_, exists := f.tips[t.ID]
	if mode == ModeCreate && exists {
		return ErrExists
	}
	if mode == ModeReplace && !exists {
		return ErrNotFound
	}
	f.tips[t.ID] = t
	f.version++
	return nil
}

func (f *fakeRepo) SaveQuestion(ctx context.Context, q Question, mode SaveMode) error {
	_, exists := f.questions[q.ID]
	if mode == ModeCreate && exists {
		return ErrExists
	}
	if mode == ModeReplace && !exists {
		return ErrNotFound
	}
	f.questions[q.ID] = q
	f.version++
	return nil
}

func (f *fakeRepo) DeleteTip(ctx context.Context, id string) error {
	if _, ok := f.tips[id]; !ok {
		return ErrNotFound
	}
	delete(f.tips, id)
	f.version++
	return nil
}

func (f *fakeRepo) DeleteQuestion(ctx context.Context, id string) error {
	if _, ok := f.questions[id]; !ok {
		return ErrNotFound
	}
	delete(f.questions, id)
	f.version++
	return nil
}

func (f *fakeRepo) Import(ctx context.Context, tips []Tip, qs []Question) error {
	for _, t := range tips {
		f.tips[t.ID] = t
	}
	for _, q := range qs {
		f.questions[q.ID] = q
	}
	f.version++
	return nil
}

func (f *fakeRepo) InsertDrafts(ctx context.Context, drafts []Draft) ([]Draft, error) {
	var out []Draft
	for _, d := range drafts {
		d.CreatedAt = time.Unix(0, 0).UTC()
		f.drafts[d.ID] = d
		f.draftSeq = append(f.draftSeq, d.ID)
		out = append(out, d)
	}
	return out, nil
}

func (f *fakeRepo) ListDrafts(ctx context.Context, status string) ([]Draft, error) {
	var out []Draft
	for _, id := range f.draftSeq {
		if d := f.drafts[id]; status == "" || d.Status == status {
			out = append(out, d)
		}
	}
	return out, nil
}

func (f *fakeRepo) GetDraft(ctx context.Context, id string) (Draft, error) {
	d, ok := f.drafts[id]
	if !ok {
		return Draft{}, ErrNotFound
	}
	return d, nil
}

func (f *fakeRepo) UpdateDraft(ctx context.Context, id string, data json.RawMessage, warnings []string) (Draft, error) {
	d, ok := f.drafts[id]
	if !ok {
		return Draft{}, ErrNotFound
	}
	d.Data, d.Warnings = data, warnings
	f.drafts[id] = d
	return d, nil
}

func (f *fakeRepo) RejectDraft(ctx context.Context, id string) error {
	d, ok := f.drafts[id]
	if !ok {
		return ErrNotFound
	}
	d.Status = StatusRejected
	f.drafts[id] = d
	return nil
}

func (f *fakeRepo) ApproveDraft(ctx context.Context, id string, tip *Tip, q *Question, overwrite bool) error {
	d, ok := f.drafts[id]
	if !ok {
		return ErrNotFound
	}
	mode := ModeCreate
	if overwrite {
		mode = ModeUpsert
	}
	if tip != nil {
		if err := f.SaveTip(ctx, *tip, mode); err != nil {
			return err
		}
	} else if err := f.SaveQuestion(ctx, *q, mode); err != nil {
		return err
	}
	d.Status = StatusApproved
	f.drafts[id] = d
	return nil
}

type fakeExtractor struct {
	reply   string
	err     error
	prompt  string
	maxToks int
}

func (f *fakeExtractor) Complete(ctx context.Context, prompt string, maxTokens int, imageBase64, mediaType string) (string, vision.Usage, error) {
	f.prompt, f.maxToks = prompt, maxTokens
	return f.reply, vision.Usage{Provider: "anthropic", Model: "m", InputTokens: 10, OutputTokens: 20}, f.err
}

type fakeUsage struct{ entries []aiusage.Entry }

func (f *fakeUsage) Record(ctx context.Context, e aiusage.Entry) { f.entries = append(f.entries, e) }

func intp(n int) *int { return &n }

func validQuestion(id string) Question {
	return Question{
		ID:      id,
		TipIDs:  []string{"tip-1"},
		Text:    "حاصل عبارت کدام است؟",
		Choices: []string{"1", "2", "3", "4"},
		Answer:  intp(2),
		Source:  Source{Kind: SourceKonkur, Year: 1402, Track: TrackRiazi, Number: 5},
	}
}

func kindOf(t *testing.T, err error) richerror.Kind {
	t.Helper()
	var re richerror.RichError
	if !errors.As(err, &re) {
		t.Fatalf("error %v is not a RichError", err)
	}
	return re.Kind()
}

func TestQuestionValidation(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(q *Question)
		bad    bool
	}{
		{"valid", func(q *Question) {}, false},
		{"empty id", func(q *Question) { q.ID = " " }, true},
		{"empty text", func(q *Question) { q.Text = "" }, true},
		{"three choices", func(q *Question) { q.Choices = q.Choices[:3] }, true},
		{"blank choice", func(q *Question) { q.Choices[1] = "  " }, true},
		{"answer missing", func(q *Question) { q.Answer = nil }, true},
		{"answer out of range", func(q *Question) { q.Answer = intp(4) }, true},
		{"no tips", func(q *Question) { q.TipIDs = nil }, true},
		{"bad source kind", func(q *Question) { q.Source = Source{Kind: "x"} }, true},
		{"konkur without year", func(q *Question) { q.Source = Source{Kind: SourceKonkur, Track: TrackRiazi} }, true},
		{"konkur bad track", func(q *Question) { q.Source = Source{Kind: SourceKonkur, Year: 1400, Track: "x"} }, true},
		{"authored ok", func(q *Question) { q.Source = Source{Kind: SourceAuthored} }, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			q := validQuestion("q1")
			q.Choices = append([]string(nil), q.Choices...)
			tc.mutate(&q)
			svc := New(newFakeRepo())
			_, err := svc.CreateQuestion(context.Background(), q)
			if tc.bad {
				if err == nil {
					t.Fatal("want validation error")
				}
				if k := kindOf(t, err); k != richerror.KindInvalid {
					t.Fatalf("kind = %v, want invalid", k)
				}
			} else if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestTipValidation(t *testing.T) {
	svc := New(newFakeRepo())
	ctx := context.Background()

	if _, err := svc.CreateTip(ctx, Tip{ID: "t1", Title: "x", Grade: intp(13)}); err == nil {
		t.Fatal("grade 13 should be invalid")
	}
	if _, err := svc.CreateTip(ctx, Tip{ID: "t1", Title: ""}); err == nil {
		t.Fatal("empty title should be invalid")
	}
	if _, err := svc.CreateTip(ctx, Tip{ID: "t1", Title: "نکته", Grade: nil}); err != nil {
		t.Fatalf("general tip rejected: %v", err)
	}
	if _, err := svc.CreateTip(ctx, Tip{ID: "t2", Title: "نکته", Grade: intp(9)}); err != nil {
		t.Fatalf("grade 9 tip rejected: %v", err)
	}
}

func TestCreateConflictAndReplaceNotFound(t *testing.T) {
	svc := New(newFakeRepo())
	ctx := context.Background()

	if _, err := svc.CreateQuestion(ctx, validQuestion("q1")); err != nil {
		t.Fatal(err)
	}
	_, err := svc.CreateQuestion(ctx, validQuestion("q1"))
	if kindOf(t, err) != richerror.KindConflict {
		t.Fatalf("duplicate create kind = %v, want conflict", kindOf(t, err))
	}
	_, err = svc.ReplaceQuestion(ctx, "missing", validQuestion("missing"))
	if kindOf(t, err) != richerror.KindNotFound {
		t.Fatalf("replace missing kind = %v, want not found", kindOf(t, err))
	}
}

func TestVersionBumpsOnChanges(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	ctx := context.Background()

	v0, _ := svc.Version(ctx)
	if _, err := svc.CreateQuestion(ctx, validQuestion("q1")); err != nil {
		t.Fatal(err)
	}
	v1, _ := svc.Version(ctx)
	if v1 <= v0 {
		t.Fatalf("version %d -> %d, want increase", v0, v1)
	}
	if err := svc.DeleteQuestion(ctx, "q1"); err != nil {
		t.Fatal(err)
	}
	v2, _ := svc.Version(ctx)
	if v2 <= v1 {
		t.Fatalf("version %d -> %d after delete, want increase", v1, v2)
	}
}

func TestPublicIsNeverNullAndCarriesVersion(t *testing.T) {
	svc := New(newFakeRepo())
	snap, err := svc.Public(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(snap)
	if !strings.Contains(string(raw), `"tips":[]`) || !strings.Contains(string(raw), `"questions":[]`) {
		t.Fatalf("empty snapshot JSON = %s, want empty arrays", raw)
	}
	if snap.Version != 1 {
		t.Fatalf("version = %d, want 1", snap.Version)
	}
}

func TestImportIsAllOrNothingAndBumpsOnce(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	ctx := context.Background()

	bad := validQuestion("bad")
	bad.Choices = nil
	if _, err := svc.Import(ctx, []Tip{{ID: "t1", Title: "a"}}, []Question{validQuestion("q1"), bad}); err == nil {
		t.Fatal("import with an invalid question should fail")
	}
	if len(repo.tips) != 0 || len(repo.questions) != 0 || repo.version != 1 {
		t.Fatal("a failed import must not write anything")
	}

	res, err := svc.Import(ctx, []Tip{{ID: "t1", Title: "a"}, {ID: "t2", Title: "b"}},
		[]Question{validQuestion("q1"), validQuestion("q2")})
	if err != nil {
		t.Fatal(err)
	}
	if res.Tips != 2 || res.Questions != 2 || res.Version != 2 {
		t.Fatalf("result = %+v, want 2 tips, 2 questions, version 2", res)
	}
}

func TestLineJSON(t *testing.T) {
	var lines []Line
	if err := json.Unmarshal([]byte(`["متن", {"math":"x^2"}]`), &lines); err != nil {
		t.Fatal(err)
	}
	if len(lines) != 2 || lines[0].IsMath || lines[0].Text != "متن" || !lines[1].IsMath || lines[1].Math != "x^2" {
		t.Fatalf("lines = %+v", lines)
	}
	out, _ := json.Marshal(lines)
	if string(out) != `["متن",{"math":"x^2"}]` {
		t.Fatalf("marshal = %s", out)
	}
	if err := json.Unmarshal([]byte(`[42]`), &lines); err == nil {
		t.Fatal("a number is not a valid line")
	}
}

func addDraft(t *testing.T, repo *fakeRepo, id, kind string, data any) {
	t.Helper()
	raw, err := json.Marshal(data)
	if err != nil {
		t.Fatal(err)
	}
	repo.drafts[id] = Draft{ID: id, Kind: kind, Status: StatusPending, Data: raw, Warnings: []string{}}
	repo.draftSeq = append(repo.draftSeq, id)
}

func TestApproveDraftPublishesAndBumps(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	ctx := context.Background()
	addDraft(t, repo, "d1", KindQuestion, validQuestion("q1"))

	d, err := svc.ApproveDraft(ctx, "d1", false)
	if err != nil {
		t.Fatal(err)
	}
	if d.Status != StatusApproved || repo.drafts["d1"].Status != StatusApproved {
		t.Fatal("draft should be approved")
	}
	if _, ok := repo.questions["q1"]; !ok || repo.version != 2 {
		t.Fatalf("question published = %v, version = %d", ok, repo.version)
	}

	// Approving again is refused: it is no longer pending.
	if _, err := svc.ApproveDraft(ctx, "d1", false); kindOf(t, err) != richerror.KindInvalid {
		t.Fatalf("second approve should be invalid, got %v", err)
	}
}

func TestApproveDraftRejectsInvalidData(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	q := validQuestion("q1")
	q.Answer = nil
	addDraft(t, repo, "d1", KindQuestion, q)

	_, err := svc.ApproveDraft(context.Background(), "d1", false)
	if err == nil || kindOf(t, err) != richerror.KindInvalid {
		t.Fatalf("err = %v, want invalid (422)", err)
	}
	if repo.drafts["d1"].Status != StatusPending || len(repo.questions) != 0 {
		t.Fatal("an invalid draft must stay pending and unpublished")
	}
}

func TestApproveDraftExistingIDNeedsOverwrite(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	ctx := context.Background()
	if _, err := svc.CreateQuestion(ctx, validQuestion("q1")); err != nil {
		t.Fatal(err)
	}
	newer := validQuestion("q1")
	newer.Text = "متن جدید"
	addDraft(t, repo, "d1", KindQuestion, newer)

	_, err := svc.ApproveDraft(ctx, "d1", false)
	if err == nil || kindOf(t, err) != richerror.KindInvalid || !strings.Contains(err.Error(), "overwrite") {
		t.Fatalf("err = %v, want invalid mentioning overwrite", err)
	}
	if repo.questions["q1"].Text == "متن جدید" {
		t.Fatal("must not overwrite without the flag")
	}
	if _, err := svc.ApproveDraft(ctx, "d1", true); err != nil {
		t.Fatalf("overwrite approve: %v", err)
	}
	if repo.questions["q1"].Text != "متن جدید" {
		t.Fatal("overwrite should replace the question")
	}
}

func TestApproveTipDraft(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	addDraft(t, repo, "d1", KindTip, Tip{ID: "t1", Title: "نکته", Body: []Line{{Text: "متن"}, {Math: "x", IsMath: true}}})
	if _, err := svc.ApproveDraft(context.Background(), "d1", false); err != nil {
		t.Fatal(err)
	}
	if len(repo.tips["t1"].Body) != 2 {
		t.Fatalf("tip = %+v", repo.tips["t1"])
	}
}

func TestUpdateDraftRecomputesWarnings(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	q := validQuestion("q1")
	q.Answer = nil
	addDraft(t, repo, "d1", KindQuestion, q)

	fixed := validQuestion("q1")
	raw, _ := json.Marshal(fixed)
	d, err := svc.UpdateDraft(context.Background(), "d1", raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(d.Warnings) != 0 {
		t.Fatalf("warnings = %v, want none", d.Warnings)
	}
	if _, err := svc.UpdateDraft(context.Background(), "d1", json.RawMessage(`[1,2]`)); kindOf(t, err) != richerror.KindInvalid {
		t.Fatal("non-object data should be invalid")
	}
}

func TestRejectDraft(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	addDraft(t, repo, "d1", KindQuestion, validQuestion("q1"))
	if err := svc.RejectDraft(context.Background(), "d1"); err != nil {
		t.Fatal(err)
	}
	pending, _ := svc.ListDrafts(context.Background(), StatusPending)
	if len(pending) != 0 {
		t.Fatalf("pending = %d, want 0", len(pending))
	}
	if err := svc.RejectDraft(context.Background(), "nope"); kindOf(t, err) != richerror.KindNotFound {
		t.Fatal("unknown draft should be not found")
	}
}

// ---------- extraction ----------

const goodPage = `[
 {"number": 5, "text": "مقدار حد کدام است؟", "expression": "lim(x->0) sin(x)/x",
  "choices": ["0", "1", "2", "oo"], "answer": 1,
  "solution": ["از حد معروف", {"math": "sin(x)/x -> 1"}], "tipIds": []},
 {"number": 6, "text": "سؤال دوم", "expression": null,
  "choices": ["a", "b", "c", "d"], "answer": null, "solution": [], "tipIds": []}
]`

func extractInput() ExtractInput {
	return ExtractInput{
		ImageBase64: "ZmFrZQ==", MediaType: "image/png", SourceName: "konkur-1402.pdf",
		Kind: KindExtractQuestions, Year: 1402, Track: TrackRiazi, Round: 1, PageLabel: "p3",
	}
}

func TestExtractStoresPendingDrafts(t *testing.T) {
	repo := newFakeRepo()
	ex := &fakeExtractor{reply: goodPage}
	usage := &fakeUsage{}
	svc := New(repo).WithExtractor(ex).WithUsageRecorder(usage)

	res, err := svc.Extract(context.Background(), extractInput())
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Drafts) != 2 || len(res.Skipped) != 0 {
		t.Fatalf("drafts=%d skipped=%v, want 2 and 0", len(res.Drafts), res.Skipped)
	}
	if ex.maxToks <= 512 || ex.prompt != questionsPrompt {
		t.Fatalf("extractor got maxTokens=%d, wrong prompt=%v", ex.maxToks, ex.prompt != questionsPrompt)
	}
	d := res.Drafts[0]
	if d.Status != StatusPending || d.Kind != KindQuestion || d.SourceName != "konkur-1402.pdf — p3" {
		t.Fatalf("draft = %+v", d)
	}
	var q Question
	if err := json.Unmarshal(d.Data, &q); err != nil {
		t.Fatal(err)
	}
	if q.ID != "konkur-1402-riazi-5-r1" || q.Source.Kind != SourceKonkur || q.Source.Number != 5 ||
		q.Answer == nil || *q.Answer != 1 || len(q.Choices) != 4 || len(q.Solution) != 2 || !q.Solution[1].IsMath {
		t.Fatalf("question = %+v", q)
	}
	// The second one has no answer: kept as a draft, flagged.
	if len(res.Drafts[1].Warnings) == 0 {
		t.Fatal("answer-less question should carry warnings")
	}
	// Nothing is published by extraction.
	if len(repo.questions) != 0 || repo.version != 1 {
		t.Fatal("extraction must not publish")
	}
	if len(usage.entries) != 1 || usage.entries[0].Feature != "konkur_extract" || usage.entries[0].InputTokens != 10 {
		t.Fatalf("usage = %+v", usage.entries)
	}
}

func TestExtractToleratesFencesAndProse(t *testing.T) {
	for name, reply := range map[string]string{
		"fenced":       "```json\n" + goodPage + "\n```",
		"fenced bare":  "```\n" + goodPage + "\n```",
		"prose":        "البته! این سؤال‌ها هستند:\n" + goodPage + "\nامیدوارم مفید باشد.",
		"fenced+prose": "Here you go:\n```json\n" + goodPage + "\n```\nDone.",
	} {
		t.Run(name, func(t *testing.T) {
			svc := New(newFakeRepo()).WithExtractor(&fakeExtractor{reply: reply})
			res, err := svc.Extract(context.Background(), extractInput())
			if err != nil {
				t.Fatal(err)
			}
			if len(res.Drafts) != 2 {
				t.Fatalf("drafts = %d, want 2", len(res.Drafts))
			}
		})
	}
}

func TestExtractSkipsMalformedItemsWithReason(t *testing.T) {
	reply := `[
	  {"text": "", "choices": ["1","2","3","4"]},
	  "not an object",
	  {"text": "سؤال سالم", "choices": ["1","2","3"], "answer": 7, "solution": [42, "خط خوب"]}
	]`
	svc := New(newFakeRepo()).WithExtractor(&fakeExtractor{reply: reply})
	res, err := svc.Extract(context.Background(), extractInput())
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Skipped) != 2 || res.Skipped[0].Index != 0 || res.Skipped[1].Index != 1 || res.Skipped[0].Reason == "" {
		t.Fatalf("skipped = %+v", res.Skipped)
	}
	if len(res.Drafts) != 1 {
		t.Fatalf("drafts = %d, want 1", len(res.Drafts))
	}
	var q Question
	_ = json.Unmarshal(res.Drafts[0].Data, &q)
	if q.Answer != nil || len(q.Solution) != 1 || len(res.Drafts[0].Warnings) < 2 {
		t.Fatalf("question = %+v warnings = %v", q, res.Drafts[0].Warnings)
	}
}

func TestExtractGarbageReplyFailsCleanly(t *testing.T) {
	svc := New(newFakeRepo()).WithExtractor(&fakeExtractor{reply: "متأسفم، نمی‌توانم"})
	_, err := svc.Extract(context.Background(), extractInput())
	if err == nil || kindOf(t, err) != richerror.KindUnexpected {
		t.Fatalf("err = %v, want unexpected", err)
	}
}

func TestExtractProviderErrorAndInputChecks(t *testing.T) {
	svc := New(newFakeRepo()).WithExtractor(&fakeExtractor{err: errors.New("boom")})
	if _, err := svc.Extract(context.Background(), extractInput()); err == nil {
		t.Fatal("provider error should surface")
	}

	svc = New(newFakeRepo()).WithExtractor(&fakeExtractor{reply: "[]"})
	in := extractInput()
	in.Kind = "other"
	if _, err := svc.Extract(context.Background(), in); kindOf(t, err) != richerror.KindInvalid {
		t.Fatal("bad kind should be invalid")
	}
	in = extractInput()
	in.Track = "x"
	if _, err := svc.Extract(context.Background(), in); kindOf(t, err) != richerror.KindInvalid {
		t.Fatal("bad track should be invalid")
	}
	if _, err := New(newFakeRepo()).Extract(context.Background(), extractInput()); err == nil {
		t.Fatal("no extractor configured should error")
	}
}

func TestExtractTips(t *testing.T) {
	reply := "```json\n" + `[{"title":"میانبر","grade":10,"body":["خط",{"math":"x^2"}],"example":{"question":["q"],"solution":[{"math":"1"}]}},{"title":""}]` + "\n```"
	ex := &fakeExtractor{reply: reply}
	svc := New(newFakeRepo()).WithExtractor(ex)
	in := extractInput()
	in.Kind = KindExtractTips
	res, err := svc.Extract(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	if ex.prompt != tipsPrompt || len(res.Drafts) != 1 || len(res.Skipped) != 1 {
		t.Fatalf("drafts=%d skipped=%d", len(res.Drafts), len(res.Skipped))
	}
	var tip Tip
	if err := json.Unmarshal(res.Drafts[0].Data, &tip); err != nil {
		t.Fatal(err)
	}
	if res.Drafts[0].Kind != KindTip || tip.Grade == nil || *tip.Grade != 10 || len(tip.Body) != 2 || tip.Example == nil {
		t.Fatalf("tip = %+v", tip)
	}
}

func TestMissingSourceFallsBackToAuthoredWithWarning(t *testing.T) {
	svc := New(newFakeRepo()).WithExtractor(&fakeExtractor{reply: goodPage})
	in := extractInput()
	in.Year, in.Track = 0, ""
	res, err := svc.Extract(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	var q Question
	_ = json.Unmarshal(res.Drafts[0].Data, &q)
	if q.Source.Kind != SourceAuthored || !strings.HasPrefix(q.ID, "q-") {
		t.Fatalf("question = %+v", q)
	}
}

// ---------- solving guide ----------

func guideQuestion() Question {
	a := 1
	return Question{
		Text:     "جواب معادله کدام است؟",
		Choices:  []string{"1", "2", "3", "4"},
		Answer:   &a,
		Solution: []Line{{Text: "دو طرف را تقسیم می‌کنیم"}, {Math: "x = 2", IsMath: true}},
	}
}

func TestGenerateGuideParsesReplyAndRecordsUsage(t *testing.T) {
	reply := "```json\n" + `{
  "given": ["معادله‌ی خطی", {"math": "2x = 4"}],
  "asked": ["مقدار x"],
  "hints": [["از تقسیم استفاده کن"], "خط تنها هم قبول است", []],
  "trap": []
}` + "\n```"
	ex := &fakeExtractor{reply: reply}
	usage := &fakeUsage{}
	svc := New(newFakeRepo()).WithExtractor(ex).WithUsageRecorder(usage)

	g, err := svc.GenerateGuide(context.Background(), guideQuestion())
	if err != nil {
		t.Fatalf("GenerateGuide: %v", err)
	}
	if len(g.Given) != 2 || !g.Given[1].IsMath || g.Given[1].Math != "2x = 4" {
		t.Fatalf("given = %+v", g.Given)
	}
	if len(g.Hints) != 2 || g.Hints[1][0].Text != "خط تنها هم قبول است" {
		t.Fatalf("hints = %+v (empty hint should be dropped, bare line accepted)", g.Hints)
	}
	if len(g.Trap) != 0 {
		t.Fatalf("trap = %+v", g.Trap)
	}
	if !strings.Contains(ex.prompt, "CORRECT CHOICE: 2") || !strings.Contains(ex.prompt, "x = 2") {
		t.Fatalf("prompt is missing the key or the solution:\n%s", ex.prompt)
	}
	if len(usage.entries) != 1 || usage.entries[0].Feature != "konkur_guide" {
		t.Fatalf("usage = %+v", usage.entries)
	}
}

func TestGenerateGuideRejectsBadInputAndReplies(t *testing.T) {
	svc := New(newFakeRepo()).WithExtractor(&fakeExtractor{reply: "{}"})
	q := guideQuestion()
	q.Choices = q.Choices[:3]
	if _, err := svc.GenerateGuide(context.Background(), q); err == nil {
		t.Fatal("expected an error for 3 choices")
	}
	if _, err := svc.GenerateGuide(context.Background(), guideQuestion()); err == nil {
		t.Fatal("expected an error for an empty guide")
	}
	svc = New(newFakeRepo()).WithExtractor(&fakeExtractor{reply: "نمی‌دانم"})
	if _, err := svc.GenerateGuide(context.Background(), guideQuestion()); err == nil {
		t.Fatal("expected an error for a reply without JSON")
	}
	if _, err := New(newFakeRepo()).GenerateGuide(context.Background(), guideQuestion()); err == nil {
		t.Fatal("expected an error without an AI model")
	}
}

func TestNormalizeQuestionDropsEmptyGuide(t *testing.T) {
	q := normalizeQuestion(Question{Guide: &Guide{Hints: [][]Line{{}}}})
	if q.Guide != nil {
		t.Fatalf("guide = %+v, want nil", q.Guide)
	}
	q = normalizeQuestion(Question{Guide: &Guide{Hints: [][]Line{{}, {{Text: "x"}}}}})
	if q.Guide == nil || len(q.Guide.Hints) != 1 {
		t.Fatalf("guide = %+v, want one hint", q.Guide)
	}
}
