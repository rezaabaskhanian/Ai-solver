// Package konkurhandler serves the «نکات کنکوری» content: the public
// endpoints the mobile app syncs from (ETag = content version) and the
// admin panel's editing, import, AI-extraction and draft-review endpoints.
package konkurhandler

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"io/fs"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/pkg/errorhandling"
	konkurservice "mathmotion/go-api/internal/service/konkur"
)

const maxExtractImageBytes = 8 << 20

var extractMediaTypes = map[string]bool{
	"image/png":  true,
	"image/jpeg": true,
	"image/webp": true,
}

type Handler struct {
	svc       konkurservice.Service
	uploadDir string
	seed      fs.FS
}

func New(svc konkurservice.Service, uploadDir string) Handler {
	return Handler{svc: svc, uploadDir: uploadDir, seed: konkurservice.EmbeddedSeed()}
}

// SetPublicRoutes registers the endpoints the app calls (no auth).
func (h Handler) SetPublicRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	e.GET("/api/v1/public/konkur", h.Public, mws...)
	e.GET("/api/v1/public/konkur/version", h.Version, mws...)
}

// SetAdminRoutes registers the admin panel's endpoints on the admin group.
func (h Handler) SetAdminRoutes(admin *echo.Group) {
	admin.GET("/konkur/tips", h.ListTips)
	admin.POST("/konkur/tips", h.CreateTip)
	admin.PUT("/konkur/tips/:id", h.ReplaceTip)
	admin.DELETE("/konkur/tips/:id", h.DeleteTip)

	admin.GET("/konkur/questions", h.ListQuestions)
	admin.POST("/konkur/questions", h.CreateQuestion)
	admin.PUT("/konkur/questions/:id", h.ReplaceQuestion)
	admin.DELETE("/konkur/questions/:id", h.DeleteQuestion)

	admin.POST("/konkur/import", h.Import)
	admin.GET("/konkur/seed", h.SeedStatus)
	admin.POST("/konkur/seed", h.ApplySeed)
	admin.POST("/konkur/extract", h.Extract)
	admin.POST("/konkur/guide", h.GenerateGuide)

	admin.GET("/konkur/drafts", h.ListDrafts)
	admin.PUT("/konkur/drafts/:id", h.UpdateDraft)
	admin.POST("/konkur/drafts/:id/approve", h.ApproveDraft)
	admin.DELETE("/konkur/drafts/:id", h.RejectDraft)
}

func invalidBody(c echo.Context) error {
	return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid_body", "message": "درخواست نامعتبر است"})
}

func ok(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"message": "saved"})
}

// ---------- public ----------

func etagFor(version int64) string {
	return `"` + strconv.FormatInt(version, 10) + `"`
}

// matchesETag reports whether an If-None-Match header names this etag
// (weak validators and comma-separated lists included).
func matchesETag(header, etag string) bool {
	for _, part := range strings.Split(header, ",") {
		part = strings.TrimPrefix(strings.TrimSpace(part), "W/")
		if part == "*" || part == etag {
			return true
		}
	}
	return false
}

// Public handles GET /api/v1/public/konkur.
func (h Handler) Public(c echo.Context) error {
	ctx := c.Request().Context()
	res := c.Response()

	if inm := c.Request().Header.Get("If-None-Match"); inm != "" {
		v, err := h.svc.Version(ctx)
		if err != nil {
			return errorhandling.ErrorHandling(err, c)
		}
		if matchesETag(inm, etagFor(v)) {
			res.Header().Set("ETag", etagFor(v))
			return c.NoContent(http.StatusNotModified)
		}
	}

	snap, err := h.svc.Public(ctx)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	res.Header().Set("ETag", etagFor(snap.Version))
	// no-cache = always revalidate with If-None-Match, which is cheap.
	res.Header().Set("Cache-Control", "no-cache")
	return c.JSON(http.StatusOK, snap)
}

// Version handles GET /api/v1/public/konkur/version.
func (h Handler) Version(c echo.Context) error {
	v, err := h.svc.Version(c.Request().Context())
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]int64{"version": v})
}

// ---------- tips ----------

func (h Handler) ListTips(c echo.Context) error {
	tips, err := h.svc.ListTips(c.Request().Context())
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]any{"tips": tips})
}

func (h Handler) CreateTip(c echo.Context) error {
	var req konkurservice.Tip
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	saved, err := h.svc.CreateTip(c.Request().Context(), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusCreated, saved)
}

func (h Handler) ReplaceTip(c echo.Context) error {
	var req konkurservice.Tip
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	saved, err := h.svc.ReplaceTip(c.Request().Context(), c.Param("id"), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, saved)
}

func (h Handler) DeleteTip(c echo.Context) error {
	if err := h.svc.DeleteTip(c.Request().Context(), c.Param("id")); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return ok(c)
}

// ---------- questions ----------

// ListQuestions supports ?year=&track=&tipId=&q=.
func (h Handler) ListQuestions(c echo.Context) error {
	qs, err := h.svc.ListQuestions(c.Request().Context(), konkurservice.QuestionFilter{
		Year:  strings.TrimSpace(c.QueryParam("year")),
		Track: strings.TrimSpace(c.QueryParam("track")),
		TipID: strings.TrimSpace(c.QueryParam("tipId")),
		Query: strings.TrimSpace(c.QueryParam("q")),
	})
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]any{"questions": qs})
}

func (h Handler) CreateQuestion(c echo.Context) error {
	var req konkurservice.Question
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	saved, err := h.svc.CreateQuestion(c.Request().Context(), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusCreated, saved)
}

func (h Handler) ReplaceQuestion(c echo.Context) error {
	var req konkurservice.Question
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	saved, err := h.svc.ReplaceQuestion(c.Request().Context(), c.Param("id"), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, saved)
}

func (h Handler) DeleteQuestion(c echo.Context) error {
	if err := h.svc.DeleteQuestion(c.Request().Context(), c.Param("id")); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return ok(c)
}

// ---------- import ----------

type importRequest struct {
	Tips      []konkurservice.Tip      `json:"tips"`
	Questions []konkurservice.Question `json:"questions"`
}

// Import handles POST /admin/konkur/import.
func (h Handler) Import(c echo.Context) error {
	var req importRequest
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	res, err := h.svc.Import(c.Request().Context(), req.Tips, req.Questions)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, res)
}

// ---------- bundled seed ----------

// SeedStatus handles GET /admin/konkur/seed: how many of the app's
// bundled items are not on the server yet.
func (h Handler) SeedStatus(c echo.Context) error {
	st, err := h.svc.SeedStatus(c.Request().Context(), h.seed)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, st)
}

// ApplySeed handles POST /admin/konkur/seed, with an optional body
// {"overwrite": true}. Only missing items are added by default.
func (h Handler) ApplySeed(c echo.Context) error {
	var req struct {
		Overwrite bool `json:"overwrite"`
	}
	if c.Request().ContentLength != 0 {
		if err := c.Bind(&req); err != nil {
			return invalidBody(c)
		}
	}
	// Figures first, so a question never goes live with a missing image.
	figures, err := konkurservice.CopySeedFigures(h.seed, h.uploadDir)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "seed_figures_failed", "message": "کپی تصویرهای سؤال‌ها ناموفق بود: " + err.Error(),
		})
	}
	res, err := h.svc.ApplySeed(c.Request().Context(), h.seed, req.Overwrite)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]any{
		"added_tips":        res.AddedTips,
		"added_questions":   res.AddedQuestions,
		"skipped_tips":      res.SkippedTips,
		"skipped_questions": res.SkippedQuestions,
		"invalid_tips":      res.InvalidTips,
		"invalid_questions": res.InvalidQuestions,
		"problems":          res.Problems,
		"figures_copied":    figures,
		"version":           res.Version,
	})
}

// ---------- solving guide ----------

// GenerateGuide handles POST /admin/konkur/guide: the body is a question
// (possibly unsaved, from the form) and the reply is an AI-drafted
// solving guide for the admin to review. Nothing is stored.
func (h Handler) GenerateGuide(c echo.Context) error {
	var q konkurservice.Question
	if err := c.Bind(&q); err != nil {
		return invalidBody(c)
	}
	g, err := h.svc.GenerateGuide(c.Request().Context(), q)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, g)
}

// ---------- extract ----------

func truthy(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on":
		return true
	}
	return false
}

// Extract handles POST /admin/konkur/extract (multipart: image, kind,
// source_name, optional year/track/round/abroad/page_label).
func (h Handler) Extract(c echo.Context) error {
	fail := func(msg string) error {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "extract_failed", "message": msg})
	}

	header, err := c.FormFile("image")
	if err != nil {
		return fail("تصویر صفحه ارسال نشده است (فیلد image)")
	}
	if header.Size > maxExtractImageBytes {
		return fail("حجم تصویر باید کمتر از ۸ مگابایت باشد")
	}
	file, err := header.Open()
	if err != nil {
		return fail("خواندن فایل ناموفق بود")
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxExtractImageBytes+1))
	if err != nil || len(data) > maxExtractImageBytes {
		return fail("حجم تصویر باید کمتر از ۸ مگابایت باشد")
	}
	mediaType := http.DetectContentType(data)
	if !extractMediaTypes[mediaType] {
		return fail("فقط تصویر PNG، JPG یا WebP")
	}

	in := konkurservice.ExtractInput{
		ImageBase64: base64.StdEncoding.EncodeToString(data),
		MediaType:   mediaType,
		SourceName:  c.FormValue("source_name"),
		Kind:        strings.TrimSpace(c.FormValue("kind")),
		Track:       strings.TrimSpace(c.FormValue("track")),
		Abroad:      truthy(c.FormValue("abroad")),
		PageLabel:   c.FormValue("page_label"),
	}
	if v := strings.TrimSpace(c.FormValue("year")); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			return fail("year نامعتبر است")
		}
		in.Year = n
	}
	if v := strings.TrimSpace(c.FormValue("round")); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			return fail("round نامعتبر است")
		}
		in.Round = n
	}

	res, err := h.svc.Extract(c.Request().Context(), in)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, res)
}

// ---------- drafts ----------

func (h Handler) ListDrafts(c echo.Context) error {
	drafts, err := h.svc.ListDrafts(c.Request().Context(), strings.TrimSpace(c.QueryParam("status")))
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]any{"drafts": drafts})
}

// UpdateDraft handles PUT /admin/konkur/drafts/:id. The body is either
// the bare tip/question document or {"data": <document>}.
func (h Handler) UpdateDraft(c echo.Context) error {
	body, err := io.ReadAll(io.LimitReader(c.Request().Body, 1<<20))
	if err != nil || len(body) == 0 {
		return invalidBody(c)
	}
	var wrapper struct {
		Data json.RawMessage `json:"data"`
	}
	data := json.RawMessage(body)
	if json.Unmarshal(body, &wrapper) == nil && len(wrapper.Data) > 0 {
		data = wrapper.Data
	}
	d, err := h.svc.UpdateDraft(c.Request().Context(), c.Param("id"), data)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, d)
}

// ApproveDraft handles POST /admin/konkur/drafts/:id/approve, with an
// optional body {"overwrite": true}.
func (h Handler) ApproveDraft(c echo.Context) error {
	var req struct {
		Overwrite bool `json:"overwrite"`
	}
	if c.Request().ContentLength != 0 {
		if err := c.Bind(&req); err != nil {
			return invalidBody(c)
		}
	}
	d, err := h.svc.ApproveDraft(c.Request().Context(), c.Param("id"), req.Overwrite)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, d)
}

func (h Handler) RejectDraft(c echo.Context) error {
	if err := h.svc.RejectDraft(c.Request().Context(), c.Param("id")); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return ok(c)
}
