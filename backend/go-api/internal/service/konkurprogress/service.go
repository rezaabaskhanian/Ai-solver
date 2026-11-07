// Package konkurprogress stores the student's konkur progress (synced from
// the app with optimistic concurrency) and the best result of each timed
// full-year exam, from which an approximate rank is computed.
package konkurprogress

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"regexp"
	"time"

	"mathmotion/go-api/internal/pkg/richerror"
)

// MaxProgressBytes caps the synced document.
const MaxProgressBytes = 512 * 1024

// Sanjesh-style taraz: the caller's percent standardized against the
// paper's participants, تراز = TarazMean + TarazScale × z.
const (
	TarazMean  = 5000.0
	TarazScale = 1000.0
	// MinStatsSample hides aggregate numbers below this many participants:
	// a lone user's score must not leak through the average/taraz.
	MinStatsSample = 5
)

var (
	// ErrConflict is returned by the repository when the stored revision is
	// not the one the client based its change on.
	ErrConflict = errors.New("konkurprogress: revision conflict")
	ErrNotFound = errors.New("konkurprogress: not found")
)

var paperKeyRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{2,63}$`)

// Doc is a stored progress document. A user who never synced has revision 0
// and an empty object.
type Doc struct {
	Revision  int64           `json:"revision"`
	UpdatedAt time.Time       `json:"updated_at"`
	Data      json.RawMessage `json:"data"`
}

// ConflictError carries the current server document back to the client.
type ConflictError struct {
	Current Doc
}

func (e *ConflictError) Error() string { return "نسخه‌ی پیشرفت قدیمی است" }

type ExamResult struct {
	PaperKey string  `json:"paper_key"`
	Percent  float64 `json:"percent"`
	Correct  int     `json:"correct"`
	Wrong    int     `json:"wrong"`
	Blank    int     `json:"blank"`
	Seconds  int     `json:"seconds"`
}

// PaperStats is the distribution of best percents for one paper.
// Percentile is nil when the caller has no stored result for it; Taraz is
// nil when there are fewer than MinStatsSample participants, when the
// percents have no spread (stddev 0) or when the caller has no result.
type PaperStats struct {
	Count      int      `json:"count"`
	Percentile *float64 `json:"percentile"`
	Median     float64  `json:"median"`
	P25        float64  `json:"p25"`
	P75        float64  `json:"p75"`
	Mean       float64  `json:"mean"`
	Taraz      *float64 `json:"taraz"`
	// StdDev and Mine are inputs for the taraz computation, not API surface.
	StdDev float64  `json:"-"`
	Mine   *float64 `json:"-"`
}

// PaperSummary is one row of the admin report.
type PaperSummary struct {
	PaperKey       string  `json:"paper_key"`
	Count          int     `json:"count"`
	AveragePercent float64 `json:"average_percent"`
	BestPercent    float64 `json:"best_percent"`
}

// PublicPaperSummary is one row of the public all-papers stats list
// (the konkur exam list screen); papers with fewer than MinStatsSample
// participants are omitted.
type PublicPaperSummary struct {
	PaperKey string  `json:"paper_key"`
	Count    int     `json:"count"`
	Mean     float64 `json:"mean"`
}

// Repository is the storage the service needs (postgreskonkurprogress).
type Repository interface {
	// GetProgress returns ErrNotFound when the user never saved.
	GetProgress(ctx context.Context, userID string) (Doc, error)
	// SaveProgress stores data if the stored revision equals baseRevision
	// (0 = nothing stored yet) and returns the new document; otherwise
	// ErrConflict.
	SaveProgress(ctx context.Context, userID string, baseRevision int64, data json.RawMessage) (Doc, error)

	// UpsertExamResult keeps only the user's best percent per paper.
	UpsertExamResult(ctx context.Context, userID string, r ExamResult) error
	// PaperStats: userID is used to compute that user's percentile.
	PaperStats(ctx context.Context, paperKey, userID string) (PaperStats, error)
	// AllPaperStats returns every paper's participant count and average.
	AllPaperStats(ctx context.Context) ([]PublicPaperSummary, error)
	AdminStats(ctx context.Context) ([]PaperSummary, error)
}

type Service struct {
	repo Repository
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func invalid(op, msg string) error {
	return richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).WithMessage(msg)
}

func internal(op string, err error) error {
	return richerror.New(richerror.Op(op)).WithErr(err).WithKind(richerror.KindUnexpected).
		WithMessage("خطای داخلی سرور")
}

func emptyDoc() Doc {
	return Doc{Revision: 0, UpdatedAt: time.Time{}, Data: json.RawMessage(`{}`)}
}

// GetProgress is GET /api/v1/konkur/progress.
func (s Service) GetProgress(ctx context.Context, userID string) (Doc, error) {
	const op = "konkurprogress.GetProgress"
	doc, err := s.repo.GetProgress(ctx, userID)
	if errors.Is(err, ErrNotFound) {
		return emptyDoc(), nil
	}
	if err != nil {
		return Doc{}, internal(op, err)
	}
	return doc, nil
}

// PutProgress is PUT /api/v1/konkur/progress. On a stale revision it returns
// a *ConflictError holding the current document.
func (s Service) PutProgress(ctx context.Context, userID string, baseRevision int64, data json.RawMessage) (Doc, error) {
	const op = "konkurprogress.PutProgress"
	if baseRevision < 0 {
		return Doc{}, invalid(op, "نسخه نامعتبر است")
	}
	if len(data) > MaxProgressBytes {
		return Doc{}, invalid(op, "حجم داده‌ی پیشرفت بیش از حد مجاز است")
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(data, &obj); err != nil || obj == nil {
		return Doc{}, invalid(op, "داده‌ی پیشرفت باید یک شیء JSON باشد")
	}
	doc, err := s.repo.SaveProgress(ctx, userID, baseRevision, data)
	if errors.Is(err, ErrConflict) {
		cur, gerr := s.repo.GetProgress(ctx, userID)
		if gerr != nil && !errors.Is(gerr, ErrNotFound) {
			return Doc{}, internal(op, gerr)
		}
		if errors.Is(gerr, ErrNotFound) {
			cur = emptyDoc()
		}
		return Doc{}, &ConflictError{Current: cur}
	}
	if err != nil {
		return Doc{}, internal(op, err)
	}
	return doc, nil
}

func validResult(r ExamResult) bool {
	if !paperKeyRe.MatchString(r.PaperKey) {
		return false
	}
	if math.IsNaN(r.Percent) || math.IsInf(r.Percent, 0) || r.Percent < -100 || r.Percent > 100 {
		return false
	}
	for _, n := range []int{r.Correct, r.Wrong, r.Blank} {
		if n < 0 || n > 500 {
			return false
		}
	}
	return r.Seconds >= 0 && r.Seconds <= 24*3600
}

// SubmitResult is POST /api/v1/konkur/exam-results.
func (s Service) SubmitResult(ctx context.Context, userID string, r ExamResult) error {
	const op = "konkurprogress.SubmitResult"
	if !validResult(r) {
		return invalid(op, "نتیجه‌ی آزمون نامعتبر است")
	}
	if err := s.repo.UpsertExamResult(ctx, userID, r); err != nil {
		return internal(op, err)
	}
	return nil
}

// Stats is GET /api/v1/konkur/exam-results/stats?paper_key=…: the
// distribution for one paper plus, when possible, the caller's taraz.
func (s Service) Stats(ctx context.Context, userID, paperKey string) (PaperStats, error) {
	const op = "konkurprogress.Stats"
	if !paperKeyRe.MatchString(paperKey) {
		return PaperStats{}, invalid(op, "کلید آزمون نامعتبر است")
	}
	st, err := s.repo.PaperStats(ctx, paperKey, userID)
	if err != nil {
		return PaperStats{}, internal(op, err)
	}
	if st.Mine != nil && st.Count >= MinStatsSample && st.StdDev > 0 {
		t := TarazMean + TarazScale*(*st.Mine-st.Mean)/st.StdDev
		st.Taraz = &t
	}
	return st, nil
}

// AllStats is GET /api/v1/konkur/exam-results/stats without a paper_key:
// per-paper averages for the exam list. Papers with fewer than
// MinStatsSample participants are omitted (privacy: no average of a
// near-single user).
func (s Service) AllStats(ctx context.Context) ([]PublicPaperSummary, error) {
	const op = "konkurprogress.AllStats"
	rows, err := s.repo.AllPaperStats(ctx)
	if err != nil {
		return nil, internal(op, err)
	}
	out := make([]PublicPaperSummary, 0, len(rows))
	for _, r := range rows {
		if r.Count >= MinStatsSample {
			out = append(out, r)
		}
	}
	return out, nil
}

// AdminStats is GET /admin/konkur/exam-stats.
func (s Service) AdminStats(ctx context.Context) ([]PaperSummary, error) {
	const op = "konkurprogress.AdminStats"
	rows, err := s.repo.AdminStats(ctx)
	if err != nil {
		return nil, internal(op, err)
	}
	if rows == nil {
		rows = []PaperSummary{}
	}
	return rows, nil
}
