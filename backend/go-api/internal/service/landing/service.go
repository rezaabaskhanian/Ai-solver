// Package landingservice is the content of the mathmotion.ir landing page
// (backend/landing), edited from the admin panel's «صفحه‌ی معرفی» tab —
// the same model as LingoFlow's (Shadowing-backend service/landing):
// global settings (hero, download links, closing banner), feature and
// step cards, extra sections with screenshots, and FAQs.
package landingservice

import (
	"context"
	"errors"
	"strings"

	"mathmotion/go-api/internal/pkg/richerror"
)

// ErrNotFound is returned by the repository for an unknown id.
var ErrNotFound = errors.New("not found")

const (
	KindFeature = "feature"
	KindStep    = "step"
)

type Settings struct {
	HeroTitle     string `json:"hero_title"`
	HeroSubtitle  string `json:"hero_subtitle"`
	HeroImageURL  string `json:"hero_image_url"`
	GooglePlayURL string `json:"google_play_url"`
	BazaarURL     string `json:"bazaar_url"`
	CTATitle      string `json:"cta_title"`
	CTASubtitle   string `json:"cta_subtitle"`
}

type Highlight struct {
	ID          string `json:"id"`
	Icon        string `json:"icon"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Position    int    `json:"position"`
}

type Image struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type Section struct {
	ID          string  `json:"id"`
	TabLabel    string  `json:"tab_label"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Position    int     `json:"position"`
	Images      []Image `json:"images"`
}

type FAQ struct {
	ID       string `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Position int    `json:"position"`
}

// Content is everything the public page renders, in one response.
type Content struct {
	Settings   Settings `json:"settings"`
	Highlights struct {
		Features []Highlight `json:"features"`
		Steps    []Highlight `json:"steps"`
	} `json:"highlights"`
	Sections []Section `json:"sections"`
	FAQs     []FAQ     `json:"faqs"`
}

type Repository interface {
	GetSettings(ctx context.Context) (Settings, error)
	UpdateSettings(ctx context.Context, s Settings) error

	ListHighlights(ctx context.Context, kind string) ([]Highlight, error)
	CreateHighlight(ctx context.Context, kind string, h Highlight) (Highlight, error)
	UpdateHighlight(ctx context.Context, kind string, h Highlight) error
	DeleteHighlight(ctx context.Context, kind, id string) error

	ListSections(ctx context.Context) ([]Section, error)
	CreateSection(ctx context.Context, s Section) (Section, error)
	UpdateSection(ctx context.Context, s Section) error
	DeleteSection(ctx context.Context, id string) error
	AddSectionImage(ctx context.Context, sectionID, url string, position int) (Image, error)
	DeleteSectionImage(ctx context.Context, sectionID, imageID string) error

	ListFAQs(ctx context.Context) ([]FAQ, error)
	CreateFAQ(ctx context.Context, f FAQ) (FAQ, error)
	UpdateFAQ(ctx context.Context, f FAQ) error
	DeleteFAQ(ctx context.Context, id string) error
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

// wrap turns a repository error into the right RichError.
func wrap(op string, err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrNotFound) {
		return richerror.New(richerror.Op(op)).WithKind(richerror.KindNotFound).WithMessage("پیدا نشد")
	}
	return richerror.New(richerror.Op(op)).WithErr(err).WithKind(richerror.KindUnexpected).
		WithMessage("خطای داخلی سرور")
}

// Content is GET /api/v1/public/landing.
func (s Service) Content(ctx context.Context) (Content, error) {
	const op = "landingservice.Content"
	var c Content
	var err error
	if c.Settings, err = s.repo.GetSettings(ctx); err != nil {
		return c, wrap(op, err)
	}
	if c.Highlights.Features, err = s.repo.ListHighlights(ctx, KindFeature); err != nil {
		return c, wrap(op, err)
	}
	if c.Highlights.Steps, err = s.repo.ListHighlights(ctx, KindStep); err != nil {
		return c, wrap(op, err)
	}
	if c.Sections, err = s.repo.ListSections(ctx); err != nil {
		return c, wrap(op, err)
	}
	if c.FAQs, err = s.repo.ListFAQs(ctx); err != nil {
		return c, wrap(op, err)
	}
	return c, nil
}

// ---------- settings ----------

func (s Service) GetSettings(ctx context.Context) (Settings, error) {
	v, err := s.repo.GetSettings(ctx)
	return v, wrap("landingservice.GetSettings", err)
}

func (s Service) UpdateSettings(ctx context.Context, v Settings) error {
	return wrap("landingservice.UpdateSettings", s.repo.UpdateSettings(ctx, v))
}

// ---------- highlights ----------

func validKind(kind string) bool { return kind == KindFeature || kind == KindStep }

func (s Service) ListHighlights(ctx context.Context, kind string) ([]Highlight, error) {
	if !validKind(kind) {
		return nil, invalid("landingservice.ListHighlights", "نوع نامعتبر است")
	}
	v, err := s.repo.ListHighlights(ctx, kind)
	return v, wrap("landingservice.ListHighlights", err)
}

func (s Service) SaveHighlight(ctx context.Context, kind string, h Highlight) (Highlight, error) {
	const op = "landingservice.SaveHighlight"
	h.Title = strings.TrimSpace(h.Title)
	if !validKind(kind) || h.Title == "" {
		return Highlight{}, invalid(op, "عنوان الزامی است")
	}
	if h.ID == "" {
		created, err := s.repo.CreateHighlight(ctx, kind, h)
		return created, wrap(op, err)
	}
	return h, wrap(op, s.repo.UpdateHighlight(ctx, kind, h))
}

func (s Service) DeleteHighlight(ctx context.Context, kind, id string) error {
	return wrap("landingservice.DeleteHighlight", s.repo.DeleteHighlight(ctx, kind, id))
}

// ---------- sections ----------

func (s Service) ListSections(ctx context.Context) ([]Section, error) {
	v, err := s.repo.ListSections(ctx)
	return v, wrap("landingservice.ListSections", err)
}

func (s Service) SaveSection(ctx context.Context, sec Section) (Section, error) {
	const op = "landingservice.SaveSection"
	sec.TabLabel, sec.Title = strings.TrimSpace(sec.TabLabel), strings.TrimSpace(sec.Title)
	if sec.TabLabel == "" || sec.Title == "" {
		return Section{}, invalid(op, "برچسب تب و عنوان الزامی است")
	}
	if sec.ID == "" {
		created, err := s.repo.CreateSection(ctx, sec)
		return created, wrap(op, err)
	}
	return sec, wrap(op, s.repo.UpdateSection(ctx, sec))
}

func (s Service) DeleteSection(ctx context.Context, id string) error {
	return wrap("landingservice.DeleteSection", s.repo.DeleteSection(ctx, id))
}

func (s Service) AddSectionImage(ctx context.Context, sectionID, url string, position int) (Image, error) {
	if strings.TrimSpace(url) == "" {
		return Image{}, invalid("landingservice.AddSectionImage", "آدرس عکس الزامی است")
	}
	img, err := s.repo.AddSectionImage(ctx, sectionID, url, position)
	return img, wrap("landingservice.AddSectionImage", err)
}

func (s Service) DeleteSectionImage(ctx context.Context, sectionID, imageID string) error {
	return wrap("landingservice.DeleteSectionImage", s.repo.DeleteSectionImage(ctx, sectionID, imageID))
}

// ---------- FAQs ----------

func (s Service) ListFAQs(ctx context.Context) ([]FAQ, error) {
	v, err := s.repo.ListFAQs(ctx)
	return v, wrap("landingservice.ListFAQs", err)
}

func (s Service) SaveFAQ(ctx context.Context, f FAQ) (FAQ, error) {
	const op = "landingservice.SaveFAQ"
	f.Question = strings.TrimSpace(f.Question)
	if f.Question == "" {
		return FAQ{}, invalid(op, "سوال الزامی است")
	}
	if f.ID == "" {
		created, err := s.repo.CreateFAQ(ctx, f)
		return created, wrap(op, err)
	}
	return f, wrap(op, s.repo.UpdateFAQ(ctx, f))
}

func (s Service) DeleteFAQ(ctx context.Context, id string) error {
	return wrap("landingservice.DeleteFAQ", s.repo.DeleteFAQ(ctx, id))
}
