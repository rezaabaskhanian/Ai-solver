package konkurservice

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"testing"

	"mathmotion/go-api/internal/pkg/richerror"
)

// ---------- fakeRepo: textbook exercises ----------

func (f *fakeRepo) sortedExercises() []Exercise {
	var out []Exercise
	for _, e := range f.exercises {
		out = append(out, e)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

func (f *fakeRepo) PublishedExercises(ctx context.Context) ([]Exercise, error) {
	return f.sortedExercises(), nil
}

func (f *fakeRepo) ListExercises(ctx context.Context, fl ExerciseFilter) ([]Exercise, error) {
	var out []Exercise
	for _, e := range f.sortedExercises() {
		if (fl.BookID == "" || e.BookID == fl.BookID) && (fl.ChapterID == "" || e.ChapterID == fl.ChapterID) {
			out = append(out, e)
		}
	}
	return out, nil
}

func (f *fakeRepo) SaveExercise(ctx context.Context, e Exercise, mode SaveMode) error {
	_, exists := f.exercises[e.ID]
	if mode == ModeCreate && exists {
		return ErrExists
	}
	if mode == ModeReplace && !exists {
		return ErrNotFound
	}
	f.exercises[e.ID] = e
	f.version++
	return nil
}

func (f *fakeRepo) DeleteExercise(ctx context.Context, id string) error {
	if _, ok := f.exercises[id]; !ok {
		return ErrNotFound
	}
	delete(f.exercises, id)
	f.version++
	return nil
}

func (f *fakeRepo) ImportExercises(ctx context.Context, ex []Exercise) error {
	for _, e := range ex {
		f.exercises[e.ID] = e
	}
	f.version++
	return nil
}

func (f *fakeRepo) ApproveExerciseDraft(ctx context.Context, id string, e Exercise, overwrite bool) error {
	d, ok := f.drafts[id]
	if !ok {
		return ErrNotFound
	}
	mode := ModeCreate
	if overwrite {
		mode = ModeUpsert
	}
	if err := f.SaveExercise(ctx, e, mode); err != nil {
		return err
	}
	d.Status = StatusApproved
	f.drafts[id] = d
	return nil
}

// ---------- tests ----------

func validExercise() Exercise {
	return Exercise{
		BookID:    "math9",
		ChapterID: "g9_sets",
		Lesson:    1,
		Page:      12,
		Number:    3,
		Text:      []Line{{Text: "مجموعه‌ی زیر را با علامت‌ها بنویسید."}},
		Solution:  []Line{{Text: "عضوها را می‌شماریم."}, {Math: "A = {1, 2, 3}", IsMath: true}},
	}
}

func TestExerciseValidation(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(e *Exercise)
		bad    bool
	}{
		{"valid", func(e *Exercise) {}, false},
		{"no book", func(e *Exercise) { e.BookID = "" }, true},
		{"no chapter", func(e *Exercise) { e.ChapterID = " " }, true},
		{"no page", func(e *Exercise) { e.Page = 0 }, true},
		{"no number", func(e *Exercise) { e.Number = 0 }, true},
		{"bad section", func(e *Exercise) { e.Section = "homework" }, true},
		{"no text", func(e *Exercise) { e.Text = nil }, true},
		{"no solution", func(e *Exercise) { e.Solution = nil }, true},
		{"parts solve it", func(e *Exercise) {
			e.Solution = nil
			e.Parts = []ExercisePart{{Label: "الف", Text: []Line{{Text: "a"}}, Solution: []Line{{Text: "b"}}}}
		}, false},
		{"part without solution", func(e *Exercise) {
			e.Solution = nil
			e.Parts = []ExercisePart{{Label: "الف", Text: []Line{{Text: "a"}}}}
		}, true},
		{"part without label", func(e *Exercise) {
			e.Parts = []ExercisePart{{Text: []Line{{Text: "a"}}, Solution: []Line{{Text: "b"}}}}
		}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			e := validExercise()
			c.mutate(&e)
			_, err := checkExercise("test", e)
			if (err != nil) != c.bad {
				t.Fatalf("err = %v, want bad=%v", err, c.bad)
			}
		})
	}
}

func TestCreateExerciseDerivesIDAndBumpsVersion(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	ctx := context.Background()

	e, err := svc.CreateExercise(ctx, validExercise())
	if err != nil {
		t.Fatal(err)
	}
	if e.ID != "math9-p12-3" || e.Section != SectionExercise {
		t.Fatalf("exercise = %+v", e)
	}
	if repo.version != 2 {
		t.Fatalf("version = %d, want 2", repo.version)
	}

	classwork := validExercise()
	classwork.Section = SectionClasswork
	if e, err = svc.CreateExercise(ctx, classwork); err != nil || e.ID != "math9-p12-3-classwork" {
		t.Fatalf("classwork id = %q, err = %v", e.ID, err)
	}
	if _, err := svc.CreateExercise(ctx, validExercise()); kindOf(t, err) != richerror.KindConflict {
		t.Fatalf("duplicate create err = %v", err)
	}

	snap, err := svc.PublicTextbook(ctx)
	if err != nil || len(snap.Exercises) != 2 || snap.Version != repo.version {
		t.Fatalf("snapshot = %+v, err = %v", snap, err)
	}
}

const exercisePage = `[
 {"number": 3, "section": "exercise",
  "text": ["حاصل را به دست آورید."],
  "parts": [
   {"label": "الف", "text": [{"math": "2 + 3*4"}], "answer": ["14"], "solution": ["اول ضرب:", {"math": "3*4 = 12"}, {"math": "2 + 12 = 14"}]},
   {"label": "ب", "text": [{"math": "(2+3)*4"}], "solution": [{"math": "5*4 = 20"}]}
  ],
  "solution": []},
 {"number": 4, "section": "کار در کلاس", "text": ["یک مثال بزنید."], "solution": ["مثلاً ۵."]},
 {"number": 5, "text": [], "parts": []}
]`

func TestExtractExercises(t *testing.T) {
	repo := newFakeRepo()
	ex := &fakeExtractor{reply: exercisePage}
	usage := &fakeUsage{}
	svc := New(repo).WithExtractor(ex).WithUsageRecorder(usage)
	ctx := context.Background()

	in := ExtractInput{
		ImageBase64: "aGVsbG8=", MediaType: "image/png", SourceName: "math9.pdf",
		Kind: KindExtractExercises, BookID: "math9", ChapterID: "g9_real", Lesson: 2, Page: 30,
	}
	res, err := svc.Extract(ctx, in)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(ex.prompt, exercisesPrompt) || len(usage.entries) != 1 || usage.entries[0].Feature != "textbook_extract" {
		t.Fatalf("prompt/usage wrong: %d entries", len(usage.entries))
	}
	// The empty third item is skipped.
	if len(res.Drafts) != 2 || len(res.Skipped) != 1 {
		t.Fatalf("drafts=%d skipped=%v", len(res.Drafts), res.Skipped)
	}
	d := res.Drafts[0]
	var e Exercise
	if err := json.Unmarshal(d.Data, &e); err != nil {
		t.Fatal(err)
	}
	if d.Kind != KindExercise || e.ID != "math9-p30-3" || e.ChapterID != "g9_real" || e.Lesson != 2 ||
		len(e.Parts) != 2 || len(e.Parts[0].Answer) != 1 || !e.Parts[0].Solution[1].IsMath {
		t.Fatalf("exercise = %+v", e)
	}
	// Every AI-written solution is flagged for review.
	if !strings.Contains(strings.Join(d.Warnings, " "), "هوش مصنوعی") {
		t.Fatalf("warnings = %v", d.Warnings)
	}
	// An unknown section falls back to «تمرین», with a warning.
	var e2 Exercise
	_ = json.Unmarshal(res.Drafts[1].Data, &e2)
	if e2.Section != SectionExercise || e2.ID != "math9-p30-4" {
		t.Fatalf("second exercise = %+v", e2)
	}

	// Approve publishes it; approving the same id again needs overwrite.
	if _, err := svc.ApproveDraft(ctx, d.ID, false); err != nil {
		t.Fatal(err)
	}
	if _, ok := repo.exercises["math9-p30-3"]; !ok {
		t.Fatal("approved exercise not published")
	}
}

func TestExtractExercisesNeedsPlace(t *testing.T) {
	svc := New(newFakeRepo()).WithExtractor(&fakeExtractor{reply: exercisePage})
	_, err := svc.Extract(context.Background(), ExtractInput{
		ImageBase64: "aGVsbG8=", MediaType: "image/png", Kind: KindExtractExercises, BookID: "math9",
	})
	if kindOf(t, err) != richerror.KindInvalid {
		t.Fatalf("err = %v, want invalid", err)
	}
}

func TestUpdateExerciseDraftRecomputesWarnings(t *testing.T) {
	repo := newFakeRepo()
	svc := New(repo)
	ctx := context.Background()
	repo.drafts["d1"] = Draft{ID: "d1", Kind: KindExercise, Status: StatusPending, Data: json.RawMessage(`{}`)}
	repo.draftSeq = append(repo.draftSeq, "d1")

	data, _ := json.Marshal(validExercise())
	d, err := svc.UpdateDraft(ctx, "d1", data)
	if err != nil {
		t.Fatal(err)
	}
	if len(d.Warnings) != 0 {
		t.Fatalf("warnings = %v, want none", d.Warnings)
	}
	var e Exercise
	_ = json.Unmarshal(d.Data, &e)
	if e.ID != "math9-p12-3" {
		t.Fatalf("id = %q", e.ID)
	}
}

func TestExtractExercisesUsesChapterNotes(t *testing.T) {
	repo := newFakeRepo()
	repo.tips["tip-order"] = Tip{ID: "tip-order", Title: "ترتیب عملیات", ChapterID: "g9_real", Body: []Line{{Text: "اول ضرب"}}}
	repo.tips["tip-other"] = Tip{ID: "tip-other", Title: "مجموعه", ChapterID: "g9_sets", Body: []Line{{Text: "x"}}}
	reply := `[{"number": 1, "text": ["حساب کنید."], "solution": ["ضرب اول."], "tipIds": ["tip-order", "tip-other", "made-up", "tip-order"]}]`
	ex := &fakeExtractor{reply: reply}
	svc := New(repo).WithExtractor(ex)

	res, err := svc.Extract(context.Background(), ExtractInput{
		ImageBase64: "aGVsbG8=", MediaType: "image/png", Kind: KindExtractExercises,
		BookID: "math9", ChapterID: "g9_real", Page: 31,
	})
	if err != nil {
		t.Fatal(err)
	}
	// Only this chapter's notes are offered to the model...
	if !strings.Contains(ex.prompt, "tip-order") || strings.Contains(ex.prompt, "tip-other") {
		t.Fatalf("prompt context wrong:\n%s", ex.prompt)
	}
	// ...and only those ids survive, once each.
	var e Exercise
	_ = json.Unmarshal(res.Drafts[0].Data, &e)
	if len(e.TipIDs) != 1 || e.TipIDs[0] != "tip-order" {
		t.Fatalf("tipIds = %v", e.TipIDs)
	}
}

func TestExtractNotesFromBooklet(t *testing.T) {
	repo := newFakeRepo()
	reply := `[{"title": "ترتیب عملیات", "body": ["اول پرانتز، بعد ضرب و تقسیم، بعد جمع و تفریق."]}]`
	ex := &fakeExtractor{reply: reply}
	svc := New(repo).WithExtractor(ex)
	ctx := context.Background()

	if _, err := svc.Extract(ctx, ExtractInput{ImageBase64: "aGVsbG8=", MediaType: "image/png", Kind: KindExtractNotes, ChapterID: "g9_real"}); kindOf(t, err) != richerror.KindInvalid {
		t.Fatalf("notes without grade: err = %v", err)
	}

	res, err := svc.Extract(ctx, ExtractInput{
		ImageBase64: "aGVsbG8=", MediaType: "image/png", Kind: KindExtractNotes, Grade: 9, ChapterID: "g9_real",
	})
	if err != nil {
		t.Fatal(err)
	}
	if ex.prompt != notesPrompt || len(res.Drafts) != 1 || res.Drafts[0].Kind != KindTip {
		t.Fatalf("drafts = %+v", res.Drafts)
	}
	var tip Tip
	_ = json.Unmarshal(res.Drafts[0].Data, &tip)
	if tip.Grade == nil || *tip.Grade != 9 || tip.ChapterID != "g9_real" {
		t.Fatalf("tip = %+v", tip)
	}
}

func TestExtractQuestionsForChapterAndRewrite(t *testing.T) {
	repo := newFakeRepo()
	repo.tips["tip-sets"] = Tip{ID: "tip-sets", Title: "اجتماع", ChapterID: "g10_sets", Body: []Line{{Text: "x"}}}
	reply := `[{"number": null, "text": "کدام درست است؟", "choices": ["1","2","3","4"], "answer": 2,
	  "solution": ["چون..."], "tipIds": ["tip-sets", "invented"]}]`
	ex := &fakeExtractor{reply: reply}
	svc := New(repo).WithExtractor(ex)

	res, err := svc.Extract(context.Background(), ExtractInput{
		ImageBase64: "aGVsbG8=", MediaType: "image/png", Kind: KindExtractQuestions,
		ChapterID: "g10_sets", Rewrite: true, Year: 1402, Track: TrackRiazi,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(ex.prompt, "REWRITE MODE") || !strings.Contains(ex.prompt, "tip-sets") {
		t.Fatal("prompt is missing the rewrite instruction or the chapter notes")
	}
	var q Question
	_ = json.Unmarshal(res.Drafts[0].Data, &q)
	// Rewritten = our own question, linked only to real notes of the chapter.
	if q.Source.Kind != SourceAuthored || len(q.TipIDs) != 1 || q.TipIDs[0] != "tip-sets" {
		t.Fatalf("question = %+v", q)
	}
	// It is valid as is, so it can be approved straight away.
	if _, err := svc.ApproveDraft(context.Background(), res.Drafts[0].ID, false); err != nil {
		t.Fatal(err)
	}
}
