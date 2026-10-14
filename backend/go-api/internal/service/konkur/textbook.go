package konkurservice

import (
	"context"
	"fmt"
	"strings"
)

// «تمرین‌های کتاب»: the official textbooks' exercises, chapter by chapter.
// The statement is the book's own wording; the solution (and the optional
// solving guide) is written by us. Same storage, versioning, drafts and
// AI-extraction pipeline as the konkur content.
//
// The document shape mirrors
// mobile/MathMotion/src/content/textbook/types.ts exactly (camelCase).

const (
	KindExercise = "exercise"

	SectionExercise  = "exercise"  // «تمرین» at the end of a lesson
	SectionClasswork = "classwork" // «کار در کلاس»
	SectionActivity  = "activity"  // «فعالیت»
)

// ExercisePart is one lettered part («الف»، «ب»، ...) of an exercise.
type ExercisePart struct {
	Label    string `json:"label"`
	Text     []Line `json:"text"`
	Answer   []Line `json:"answer,omitempty"`
	Solution []Line `json:"solution"`
}

// Exercise is the app's TextbookExercise. BookID and ChapterID are the
// ids of mobile/MathMotion/src/content/curriculum.ts.
type Exercise struct {
	ID        string `json:"id"`
	BookID    string `json:"bookId"`
	ChapterID string `json:"chapterId"`
	// 1-based lesson («درس») inside the chapter; 0 = not tied to one.
	Lesson  int    `json:"lesson,omitempty"`
	Section string `json:"section"`
	Page    int    `json:"page"`
	Number  int    `json:"number"`
	Text    []Line `json:"text"`
	// FigureURL is a path relative to the API host (/uploads/x.png).
	FigureURL string         `json:"figureUrl,omitempty"`
	Parts     []ExercisePart `json:"parts,omitempty"`
	// Answer is the short final result; Solution the worked steps. An
	// exercise with parts may leave both empty and solve each part.
	Answer   []Line `json:"answer,omitempty"`
	Solution []Line `json:"solution"`
	Guide    *Guide `json:"guide,omitempty"`
	// TipIDs are the teaching notes (konkur tips of this chapter, e.g.
	// extracted from an uploaded booklet) the solution is built on; the
	// app links to them under the solution.
	TipIDs []string `json:"tipIds,omitempty"`
	// Free exercises are open without Premium (on top of every chapter's
	// first lesson, which the app always shows for free).
	Free bool `json:"free,omitempty"`
}

type ExerciseFilter struct {
	BookID    string
	ChapterID string
	Query     string
}

// TextbookSnapshot is GET /api/v1/public/textbook.
type TextbookSnapshot struct {
	Version   int64      `json:"version"`
	Exercises []Exercise `json:"exercises"`
}

func validSection(s string) bool {
	return s == SectionExercise || s == SectionClasswork || s == SectionActivity
}

func nonNilLines(l []Line) []Line {
	if l == nil {
		return []Line{}
	}
	return l
}

func normalizeExercise(e Exercise) Exercise {
	e.ID = strings.TrimSpace(e.ID)
	e.BookID = strings.TrimSpace(e.BookID)
	e.ChapterID = strings.TrimSpace(e.ChapterID)
	e.Section = strings.TrimSpace(e.Section)
	if e.Section == "" {
		e.Section = SectionExercise
	}
	tipIDs := make([]string, 0, len(e.TipIDs))
	for _, id := range e.TipIDs {
		if id = strings.TrimSpace(id); id != "" {
			tipIDs = append(tipIDs, id)
		}
	}
	e.TipIDs = nil
	if len(tipIDs) > 0 {
		e.TipIDs = tipIDs
	}
	e.Text = nonNilLines(e.Text)
	e.Solution = nonNilLines(e.Solution)
	if len(e.Answer) == 0 {
		e.Answer = nil
	}
	parts := make([]ExercisePart, 0, len(e.Parts))
	for _, p := range e.Parts {
		p.Label = strings.TrimSpace(p.Label)
		p.Text = nonNilLines(p.Text)
		p.Solution = nonNilLines(p.Solution)
		if len(p.Answer) == 0 {
			p.Answer = nil
		}
		parts = append(parts, p)
	}
	e.Parts = nil
	if len(parts) > 0 {
		e.Parts = parts
	}
	if e.Guide != nil {
		hints := make([][]Line, 0, len(e.Guide.Hints))
		for _, h := range e.Guide.Hints {
			if len(h) > 0 {
				hints = append(hints, h)
			}
		}
		e.Guide.Hints = hints
		if e.Guide.Empty() {
			e.Guide = nil
		}
	}
	return e
}

// exerciseID is deterministic, so the same page extracted twice collides
// and shows up as "already exists" on approve.
func exerciseID(e Exercise) string {
	if e.BookID == "" || e.Page <= 0 || e.Number <= 0 {
		return ""
	}
	id := fmt.Sprintf("%s-p%d-%d", e.BookID, e.Page, e.Number)
	if e.Section != "" && e.Section != SectionExercise {
		id += "-" + e.Section
	}
	return id
}

// exerciseProblems lists everything wrong with an exercise (empty = valid).
func exerciseProblems(e Exercise) []string {
	var p []string
	if e.ID == "" {
		p = append(p, "شناسه (id) خالی است")
	}
	if e.BookID == "" {
		p = append(p, "کتاب (bookId) مشخص نشده است")
	}
	if e.ChapterID == "" {
		p = append(p, "فصل (chapterId) مشخص نشده است")
	}
	if !validSection(e.Section) {
		p = append(p, "نوع (section) باید exercise، classwork یا activity باشد")
	}
	if e.Page <= 0 {
		p = append(p, "شماره‌ی صفحه (page) مشخص نشده است")
	}
	if e.Number <= 0 {
		p = append(p, "شماره‌ی تمرین (number) مشخص نشده است")
	}
	if e.Lesson < 0 {
		p = append(p, "شماره‌ی درس (lesson) نامعتبر است")
	}
	if len(e.Text) == 0 && len(e.Parts) == 0 {
		p = append(p, "صورت تمرین (text) خالی است")
	}
	if len(e.Parts) == 0 {
		if len(e.Solution) == 0 {
			p = append(p, "راه‌حل (solution) خالی است")
		}
	} else {
		for i, part := range e.Parts {
			if part.Label == "" {
				p = append(p, fmt.Sprintf("قسمت %d برچسب (label) ندارد", i+1))
			}
			if len(part.Text) == 0 {
				p = append(p, fmt.Sprintf("قسمت %d صورت (text) ندارد", i+1))
			}
			if len(part.Solution) == 0 && len(e.Solution) == 0 {
				p = append(p, fmt.Sprintf("قسمت %d راه‌حل (solution) ندارد", i+1))
			}
		}
	}
	return p
}

func checkExercise(op string, e Exercise) (Exercise, error) {
	e = normalizeExercise(e)
	if e.ID == "" {
		e.ID = exerciseID(e)
	}
	if p := exerciseProblems(e); len(p) > 0 {
		return e, invalid(op, strings.Join(p, "؛ "))
	}
	return e, nil
}

// ---------- public ----------

// PublicTextbook is GET /api/v1/public/textbook.
func (s Service) PublicTextbook(ctx context.Context) (TextbookSnapshot, error) {
	const op = "konkurservice.PublicTextbook"
	v, err := s.repo.Version(ctx)
	if err != nil {
		return TextbookSnapshot{}, wrap(op, err)
	}
	ex, err := s.repo.PublishedExercises(ctx)
	if err != nil {
		return TextbookSnapshot{}, wrap(op, err)
	}
	if ex == nil {
		ex = []Exercise{}
	}
	return TextbookSnapshot{Version: v, Exercises: ex}, nil
}

// ---------- admin ----------

func (s Service) ListExercises(ctx context.Context, f ExerciseFilter) ([]Exercise, error) {
	ex, err := s.repo.ListExercises(ctx, f)
	if ex == nil {
		ex = []Exercise{}
	}
	return ex, wrap("konkurservice.ListExercises", err)
}

// CreateExercise is POST /admin/textbook/exercises. An empty id is
// derived from the book, page and number.
func (s Service) CreateExercise(ctx context.Context, e Exercise) (Exercise, error) {
	const op = "konkurservice.CreateExercise"
	e, err := checkExercise(op, e)
	if err != nil {
		return e, err
	}
	return e, wrap(op, s.repo.SaveExercise(ctx, e, ModeCreate))
}

// ReplaceExercise is PUT /admin/textbook/exercises/:id — the URL id wins.
func (s Service) ReplaceExercise(ctx context.Context, id string, e Exercise) (Exercise, error) {
	const op = "konkurservice.ReplaceExercise"
	e.ID = id
	e, err := checkExercise(op, e)
	if err != nil {
		return e, err
	}
	return e, wrap(op, s.repo.SaveExercise(ctx, e, ModeReplace))
}

func (s Service) DeleteExercise(ctx context.Context, id string) error {
	return wrap("konkurservice.DeleteExercise", s.repo.DeleteExercise(ctx, id))
}
