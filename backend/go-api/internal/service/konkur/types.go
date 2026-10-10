// Package konkurservice is the «نکات کنکوری» content (tips + multiple
// choice questions) that used to ship inside the mobile app bundle: it is
// edited from the admin panel, fetched by the app, and can be extracted
// from photographed/rendered exam pages with the admin-configured vision
// model (reviewed as drafts before anything reaches the app).
//
// The document shapes mirror mobile/MathMotion/src/content/konkur/types.ts
// exactly (camelCase), except that the RN `figure` image is `figureUrl`.
package konkurservice

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

var (
	// ErrNotFound is returned by the repository for an unknown id.
	ErrNotFound = errors.New("not found")
	// ErrExists is returned by the repository when a create (or an
	// approve without overwrite) hits an id that is already taken.
	ErrExists = errors.New("already exists")
)

const (
	KindQuestion = "question"
	KindTip      = "tip"

	StatusPending  = "pending"
	StatusApproved = "approved"
	StatusRejected = "rejected"

	SourceAuthored = "authored"
	SourceKonkur   = "konkur"

	TrackRiazi   = "riazi"
	TrackTajrobi = "tajrobi"
)

// Line is one line of rich text: Persian prose (a JSON string) or a math
// line ({"math": "..."}), the app's KonkurLine.
type Line struct {
	Text   string
	Math   string
	IsMath bool
}

func (l Line) MarshalJSON() ([]byte, error) {
	if l.IsMath {
		return json.Marshal(map[string]string{"math": l.Math})
	}
	return json.Marshal(l.Text)
}

func (l *Line) UnmarshalJSON(b []byte) error {
	trimmed := bytes.TrimSpace(b)
	if len(trimmed) > 0 && trimmed[0] == '"' {
		var s string
		if err := json.Unmarshal(trimmed, &s); err != nil {
			return err
		}
		*l = Line{Text: s}
		return nil
	}
	var o struct {
		Math *string `json:"math"`
	}
	if err := json.Unmarshal(trimmed, &o); err != nil || o.Math == nil {
		return fmt.Errorf("هر خط باید رشته یا {\"math\": \"...\"} باشد")
	}
	*l = Line{Math: *o.Math, IsMath: true}
	return nil
}

type Example struct {
	Question []Line `json:"question"`
	Solution []Line `json:"solution"`
}

// Tip is the app's KonkurTip. Grade nil = a general tip for every grade.
// Tracks limits the tip to study tracks ("riazi", "tajrobi"); empty means
// every track.
type Tip struct {
	ID        string   `json:"id"`
	Grade     *int     `json:"grade"`
	ChapterID string   `json:"chapterId,omitempty"`
	Tracks    []string `json:"tracks,omitempty"`
	Title     string   `json:"title"`
	Body      []Line   `json:"body"`
	Details   []Line   `json:"details,omitempty"`
	Example   *Example `json:"example,omitempty"`
}

// Source is the app's KonkurSource: {kind:'authored'} or a transcription
// of an official booklet question.
type Source struct {
	Kind      string `json:"kind"`
	Year      int    `json:"year,omitempty"`
	Track     string `json:"track,omitempty"`
	Number    int    `json:"number,omitempty"`
	Abroad    bool   `json:"abroad,omitempty"`
	NewSystem bool   `json:"newSystem,omitempty"`
	Round     int    `json:"round,omitempty"`
}

// Guide is the app's KonkurGuide: how to approach a question before
// reading its solution — what it gives, what it asks, hints revealed one
// at a time, and the trap most students fall into. Every part is optional.
type Guide struct {
	Given []Line   `json:"given,omitempty"`
	Asked []Line   `json:"asked,omitempty"`
	Hints [][]Line `json:"hints,omitempty"`
	Trap  []Line   `json:"trap,omitempty"`
}

// Empty reports whether the guide has nothing to show.
func (g *Guide) Empty() bool {
	return g == nil || (len(g.Given) == 0 && len(g.Asked) == 0 && len(g.Hints) == 0 && len(g.Trap) == 0)
}

// Question is the app's KonkurQuestion. Answer is a pointer only so an
// incomplete draft can carry "answer": null; a published question always
// has 0..3.
type Question struct {
	ID          string   `json:"id"`
	TipIDs      []string `json:"tipIds"`
	Text        string   `json:"text"`
	Expression  string   `json:"expression,omitempty"`
	FigureURL   string   `json:"figureUrl,omitempty"`
	Choices     []string `json:"choices"`
	ChoicesMath *bool    `json:"choicesMath,omitempty"`
	Answer      *int     `json:"answer"`
	Solution    []Line   `json:"solution"`
	Guide       *Guide   `json:"guide,omitempty"`
	Source      Source   `json:"source"`
}

// Draft is an item waiting for review. Data is a tip or question
// document and may be incomplete.
type Draft struct {
	ID         string          `json:"id"`
	Kind       string          `json:"kind"`
	SourceName string          `json:"source_name"`
	Status     string          `json:"status"`
	Data       json.RawMessage `json:"data"`
	Warnings   []string        `json:"warnings"`
	CreatedAt  time.Time       `json:"created_at"`
}

// Snapshot is GET /api/v1/public/konkur.
type Snapshot struct {
	Version   int64      `json:"version"`
	Tips      []Tip      `json:"tips"`
	Questions []Question `json:"questions"`
}

// ImportResult is what POST /admin/konkur/import reports.
type ImportResult struct {
	Tips      int   `json:"tips"`
	Questions int   `json:"questions"`
	Version   int64 `json:"version"`
}

type QuestionFilter struct {
	Year  string
	Track string
	TipID string
	Query string
}

// SaveMode says how Save* treats an existing id.
type SaveMode int

const (
	// ModeCreate fails with ErrExists when the id is taken.
	ModeCreate SaveMode = iota
	// ModeReplace fails with ErrNotFound when the id is missing.
	ModeReplace
	// ModeUpsert creates or replaces.
	ModeUpsert
)
