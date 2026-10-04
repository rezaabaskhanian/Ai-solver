package konkurservice

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"mathmotion/go-api/internal/pkg/richerror"
	"mathmotion/go-api/internal/service/aiusage"
	"mathmotion/go-api/internal/service/vision"
)

// Repository is the storage the service needs (postgreskonkur). Every
// method that changes a published tip/question also bumps the version
// counter in the same transaction.
type Repository interface {
	Version(ctx context.Context) (int64, error)
	// Published returns the published tips (by position, id) and
	// questions (by id).
	Published(ctx context.Context) ([]Tip, []Question, error)

	ListTips(ctx context.Context) ([]Tip, error)
	SaveTip(ctx context.Context, t Tip, mode SaveMode) error
	DeleteTip(ctx context.Context, id string) error

	ListQuestions(ctx context.Context, f QuestionFilter) ([]Question, error)
	SaveQuestion(ctx context.Context, q Question, mode SaveMode) error
	DeleteQuestion(ctx context.Context, id string) error

	// Import upserts everything as published and bumps the version once.
	Import(ctx context.Context, tips []Tip, questions []Question) error

	InsertDrafts(ctx context.Context, drafts []Draft) ([]Draft, error)
	ListDrafts(ctx context.Context, status string) ([]Draft, error)
	GetDraft(ctx context.Context, id string) (Draft, error)
	UpdateDraft(ctx context.Context, id string, data json.RawMessage, warnings []string) (Draft, error)
	RejectDraft(ctx context.Context, id string) error
	// ApproveDraft atomically upserts the tip or question (exactly one is
	// non-nil) as published, bumps the version and marks the draft
	// approved. Without overwrite an existing id yields ErrExists.
	ApproveDraft(ctx context.Context, id string, tip *Tip, question *Question, overwrite bool) error
}

// Extractor is the vision client (visionservice.Client): one image plus a
// prompt in, raw text out, using whichever AI provider the admin chose.
type Extractor interface {
	Complete(ctx context.Context, prompt string, maxTokens int, imageBase64, mediaType string) (string, vision.Usage, error)
}

// UsageRecorder is internal/service/aiusage.
type UsageRecorder interface {
	Record(ctx context.Context, e aiusage.Entry)
}

type Service struct {
	repo      Repository
	extractor Extractor     // optional
	usage     UsageRecorder // optional
}

func New(repo Repository) Service {
	return Service{repo: repo}
}

func (s Service) WithExtractor(e Extractor) Service {
	s.extractor = e
	return s
}

func (s Service) WithUsageRecorder(r UsageRecorder) Service {
	s.usage = r
	return s
}

func invalid(op, msg string) error {
	return richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).WithMessage(msg)
}

// wrap turns a repository error into the right RichError.
func wrap(op string, err error) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, ErrNotFound):
		return richerror.New(richerror.Op(op)).WithKind(richerror.KindNotFound).WithMessage("پیدا نشد")
	case errors.Is(err, ErrExists):
		return richerror.New(richerror.Op(op)).WithKind(richerror.KindConflict).WithMessage("این شناسه از قبل وجود دارد")
	}
	return richerror.New(richerror.Op(op)).WithErr(err).WithKind(richerror.KindUnexpected).
		WithMessage("خطای داخلی سرور")
}

// ---------- public ----------

// Version is GET /api/v1/public/konkur/version.
func (s Service) Version(ctx context.Context) (int64, error) {
	v, err := s.repo.Version(ctx)
	return v, wrap("konkurservice.Version", err)
}

// Public is GET /api/v1/public/konkur. The version is read before the
// content, so a concurrent edit can only make the app refetch once more,
// never keep stale data under a newer version.
func (s Service) Public(ctx context.Context) (Snapshot, error) {
	const op = "konkurservice.Public"
	v, err := s.repo.Version(ctx)
	if err != nil {
		return Snapshot{}, wrap(op, err)
	}
	tips, questions, err := s.repo.Published(ctx)
	if err != nil {
		return Snapshot{}, wrap(op, err)
	}
	if tips == nil {
		tips = []Tip{}
	}
	if questions == nil {
		questions = []Question{}
	}
	return Snapshot{Version: v, Tips: tips, Questions: questions}, nil
}

// ---------- tips ----------

func (s Service) ListTips(ctx context.Context) ([]Tip, error) {
	tips, err := s.repo.ListTips(ctx)
	if tips == nil {
		tips = []Tip{}
	}
	return tips, wrap("konkurservice.ListTips", err)
}

func (s Service) saveTip(op string, t Tip, mode SaveMode) (Tip, error) {
	t = normalizeTip(t)
	if p := tipProblems(t); len(p) > 0 {
		return t, invalid(op, strings.Join(p, "؛ "))
	}
	return t, nil
}

// CreateTip is POST /admin/konkur/tips.
func (s Service) CreateTip(ctx context.Context, t Tip) (Tip, error) {
	const op = "konkurservice.CreateTip"
	t, err := s.saveTip(op, t, ModeCreate)
	if err != nil {
		return t, err
	}
	return t, wrap(op, s.repo.SaveTip(ctx, t, ModeCreate))
}

// ReplaceTip is PUT /admin/konkur/tips/:id — the id in the URL wins.
func (s Service) ReplaceTip(ctx context.Context, id string, t Tip) (Tip, error) {
	const op = "konkurservice.ReplaceTip"
	t.ID = id
	t, err := s.saveTip(op, t, ModeReplace)
	if err != nil {
		return t, err
	}
	return t, wrap(op, s.repo.SaveTip(ctx, t, ModeReplace))
}

func (s Service) DeleteTip(ctx context.Context, id string) error {
	return wrap("konkurservice.DeleteTip", s.repo.DeleteTip(ctx, id))
}

// ---------- questions ----------

func (s Service) ListQuestions(ctx context.Context, f QuestionFilter) ([]Question, error) {
	qs, err := s.repo.ListQuestions(ctx, f)
	if qs == nil {
		qs = []Question{}
	}
	return qs, wrap("konkurservice.ListQuestions", err)
}

func checkQuestion(op string, q Question) (Question, error) {
	q = normalizeQuestion(q)
	if p := questionProblems(q, true); len(p) > 0 {
		return q, invalid(op, strings.Join(p, "؛ "))
	}
	return q, nil
}

// CreateQuestion is POST /admin/konkur/questions.
func (s Service) CreateQuestion(ctx context.Context, q Question) (Question, error) {
	const op = "konkurservice.CreateQuestion"
	q, err := checkQuestion(op, q)
	if err != nil {
		return q, err
	}
	return q, wrap(op, s.repo.SaveQuestion(ctx, q, ModeCreate))
}

// ReplaceQuestion is PUT /admin/konkur/questions/:id — the URL id wins.
func (s Service) ReplaceQuestion(ctx context.Context, id string, q Question) (Question, error) {
	const op = "konkurservice.ReplaceQuestion"
	q.ID = id
	q, err := checkQuestion(op, q)
	if err != nil {
		return q, err
	}
	return q, wrap(op, s.repo.SaveQuestion(ctx, q, ModeReplace))
}

func (s Service) DeleteQuestion(ctx context.Context, id string) error {
	return wrap("konkurservice.DeleteQuestion", s.repo.DeleteQuestion(ctx, id))
}

// ---------- import ----------

const maxImportProblems = 10

// Import is POST /admin/konkur/import: upserts everything as published in
// one transaction (bumping the version once). Nothing is written if any
// item is invalid.
func (s Service) Import(ctx context.Context, tips []Tip, questions []Question) (ImportResult, error) {
	const op = "konkurservice.Import"
	var problems []string
	for i := range tips {
		tips[i] = normalizeTip(tips[i])
		for _, p := range tipProblems(tips[i]) {
			problems = append(problems, "نکته "+tips[i].ID+": "+p)
		}
	}
	for i := range questions {
		questions[i] = normalizeQuestion(questions[i])
		for _, p := range questionProblems(questions[i], true) {
			problems = append(problems, "سؤال "+questions[i].ID+": "+p)
		}
	}
	if len(problems) > 0 {
		more := ""
		if len(problems) > maxImportProblems {
			more = " (و موارد دیگر)"
			problems = problems[:maxImportProblems]
		}
		return ImportResult{}, invalid(op, strings.Join(problems, "؛ ")+more)
	}
	if err := s.repo.Import(ctx, tips, questions); err != nil {
		return ImportResult{}, wrap(op, err)
	}
	v, err := s.repo.Version(ctx)
	if err != nil {
		return ImportResult{}, wrap(op, err)
	}
	return ImportResult{Tips: len(tips), Questions: len(questions), Version: v}, nil
}

// ---------- drafts ----------

func (s Service) ListDrafts(ctx context.Context, status string) ([]Draft, error) {
	const op = "konkurservice.ListDrafts"
	switch status {
	case "", StatusPending, StatusApproved, StatusRejected:
	default:
		return nil, invalid(op, "وضعیت نامعتبر است")
	}
	drafts, err := s.repo.ListDrafts(ctx, status)
	if drafts == nil {
		drafts = []Draft{}
	}
	return drafts, wrap(op, err)
}

// parseDraftData decodes a draft's data per its kind and returns the
// normalized document (re-marshaled) plus its problems as warnings.
func parseDraftData(kind string, data json.RawMessage) (json.RawMessage, []string, error) {
	switch kind {
	case KindTip:
		var t Tip
		if err := json.Unmarshal(data, &t); err != nil {
			return nil, nil, err
		}
		t = normalizeTip(t)
		out, err := json.Marshal(t)
		return out, nonNil(tipProblems(t)), err
	default:
		var q Question
		if err := json.Unmarshal(data, &q); err != nil {
			return nil, nil, err
		}
		q = normalizeQuestion(q)
		out, err := json.Marshal(q)
		return out, nonNil(questionProblems(q, true)), err
	}
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// UpdateDraft is PUT /admin/konkur/drafts/:id: replaces the data (it may
// stay incomplete) and recomputes the warnings.
func (s Service) UpdateDraft(ctx context.Context, id string, data json.RawMessage) (Draft, error) {
	const op = "konkurservice.UpdateDraft"
	d, err := s.repo.GetDraft(ctx, id)
	if err != nil {
		return Draft{}, wrap(op, err)
	}
	if d.Status != StatusPending {
		return Draft{}, invalid(op, "این پیش‌نویس قبلاً بررسی شده است")
	}
	normalized, warnings, err := parseDraftData(d.Kind, data)
	if err != nil {
		return Draft{}, invalid(op, "ساختار داده نامعتبر است: "+err.Error())
	}
	out, err := s.repo.UpdateDraft(ctx, id, normalized, warnings)
	return out, wrap(op, err)
}

// ApproveDraft is POST /admin/konkur/drafts/:id/approve: validates the
// data strictly, publishes it (bumping the version) and marks the draft
// approved. An id that already exists is refused unless overwrite is set.
func (s Service) ApproveDraft(ctx context.Context, id string, overwrite bool) (Draft, error) {
	const op = "konkurservice.ApproveDraft"
	d, err := s.repo.GetDraft(ctx, id)
	if err != nil {
		return Draft{}, wrap(op, err)
	}
	if d.Status != StatusPending {
		return Draft{}, invalid(op, "این پیش‌نویس قبلاً بررسی شده است")
	}

	var tip *Tip
	var question *Question
	if d.Kind == KindTip {
		var t Tip
		if err := json.Unmarshal(d.Data, &t); err != nil {
			return Draft{}, invalid(op, "ساختار داده نامعتبر است: "+err.Error())
		}
		t = normalizeTip(t)
		if p := tipProblems(t); len(p) > 0 {
			return Draft{}, invalid(op, strings.Join(p, "؛ "))
		}
		tip = &t
	} else {
		var q Question
		if err := json.Unmarshal(d.Data, &q); err != nil {
			return Draft{}, invalid(op, "ساختار داده نامعتبر است: "+err.Error())
		}
		q = normalizeQuestion(q)
		if p := questionProblems(q, true); len(p) > 0 {
			return Draft{}, invalid(op, strings.Join(p, "؛ "))
		}
		question = &q
	}

	if err := s.repo.ApproveDraft(ctx, id, tip, question, overwrite); err != nil {
		if errors.Is(err, ErrExists) {
			return Draft{}, invalid(op, "این شناسه از قبل وجود دارد؛ برای جایگزینی با overwrite=true دوباره بفرستید")
		}
		return Draft{}, wrap(op, err)
	}
	d.Status = StatusApproved
	return d, nil
}

// RejectDraft is DELETE /admin/konkur/drafts/:id (marks it rejected).
func (s Service) RejectDraft(ctx context.Context, id string) error {
	return wrap("konkurservice.RejectDraft", s.repo.RejectDraft(ctx, id))
}
