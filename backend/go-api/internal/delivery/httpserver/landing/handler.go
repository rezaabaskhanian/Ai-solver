// Package landinghandler serves the mathmotion.ir landing page's content:
// the public read endpoint the site renders from, and the admin panel's
// «صفحه‌ی معرفی» editing endpoints — the same set LingoFlow has
// (Shadowing-backend landinghandler + adminhandler/landing.go), plus the
// image upload they use.
package landinghandler

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/pkg/errorhandling"
	landingservice "mathmotion/go-api/internal/service/landing"
)

// UploadURLPath is where uploaded images are served (httpserver.Server
// maps it to the upload directory).
const UploadURLPath = "/uploads"

const maxImageBytes = 5 << 20

var imageExtensions = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

type Handler struct {
	svc       landingservice.Service
	uploadDir string
}

func New(svc landingservice.Service, uploadDir string) Handler {
	return Handler{svc: svc, uploadDir: uploadDir}
}

// SetPublicRoutes registers the read endpoint the landing site calls
// (no auth: it's public content).
func (h Handler) SetPublicRoutes(e *echo.Echo, mws ...echo.MiddlewareFunc) {
	e.GET("/api/v1/public/landing", h.Content, mws...)
}

// SetAdminRoutes registers the editing endpoints on the admin group
// (gated by middleware.Admin — see httpserver.Server).
func (h Handler) SetAdminRoutes(admin *echo.Group) {
	admin.POST("/upload", h.UploadImage)

	admin.GET("/landing-settings", h.GetSettings)
	admin.PUT("/landing-settings", h.UpdateSettings)

	admin.GET("/landing-highlights/:kind", h.ListHighlights)
	admin.POST("/landing-highlights/:kind", h.SaveHighlight)
	admin.PUT("/landing-highlights/:kind/:id", h.SaveHighlight)
	admin.DELETE("/landing-highlights/:kind/:id", h.DeleteHighlight)

	admin.GET("/landing-sections", h.ListSections)
	admin.POST("/landing-sections", h.SaveSection)
	admin.PUT("/landing-sections/:id", h.SaveSection)
	admin.DELETE("/landing-sections/:id", h.DeleteSection)
	admin.POST("/landing-sections/:id/images", h.AddSectionImage)
	admin.DELETE("/landing-sections/:id/images/:imageID", h.DeleteSectionImage)

	admin.GET("/landing-faqs", h.ListFAQs)
	admin.POST("/landing-faqs", h.SaveFAQ)
	admin.PUT("/landing-faqs/:id", h.SaveFAQ)
	admin.DELETE("/landing-faqs/:id", h.DeleteFAQ)
}

func invalidBody(c echo.Context) error {
	return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid_body", "message": "درخواست نامعتبر است"})
}

func ok(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"message": "saved"})
}

// Content handles GET /api/v1/public/landing.
func (h Handler) Content(c echo.Context) error {
	content, err := h.svc.Content(c.Request().Context())
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, content)
}

// ---------- settings ----------

func (h Handler) GetSettings(c echo.Context) error {
	s, err := h.svc.GetSettings(c.Request().Context())
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, s)
}

func (h Handler) UpdateSettings(c echo.Context) error {
	var req landingservice.Settings
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	if err := h.svc.UpdateSettings(c.Request().Context(), req); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return ok(c)
}

// ---------- highlights ----------

func (h Handler) ListHighlights(c echo.Context) error {
	items, err := h.svc.ListHighlights(c.Request().Context(), c.Param("kind"))
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]any{"highlights": items})
}

// SaveHighlight: POST creates, PUT /:id updates.
func (h Handler) SaveHighlight(c echo.Context) error {
	var req landingservice.Highlight
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	req.ID = c.Param("id")
	saved, err := h.svc.SaveHighlight(c.Request().Context(), c.Param("kind"), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, saved)
}

func (h Handler) DeleteHighlight(c echo.Context) error {
	if err := h.svc.DeleteHighlight(c.Request().Context(), c.Param("kind"), c.Param("id")); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return ok(c)
}

// ---------- sections ----------

func (h Handler) ListSections(c echo.Context) error {
	items, err := h.svc.ListSections(c.Request().Context())
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]any{"sections": items})
}

// SaveSection: POST creates, PUT /:id updates.
func (h Handler) SaveSection(c echo.Context) error {
	var req landingservice.Section
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	req.ID = c.Param("id")
	saved, err := h.svc.SaveSection(c.Request().Context(), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, saved)
}

func (h Handler) DeleteSection(c echo.Context) error {
	if err := h.svc.DeleteSection(c.Request().Context(), c.Param("id")); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return ok(c)
}

type addImageRequest struct {
	URL      string `json:"url"`
	Position int    `json:"position"`
}

// AddSectionImage attaches an image already uploaded with POST /admin/upload.
func (h Handler) AddSectionImage(c echo.Context) error {
	var req addImageRequest
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	img, err := h.svc.AddSectionImage(c.Request().Context(), c.Param("id"), req.URL, req.Position)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusCreated, img)
}

func (h Handler) DeleteSectionImage(c echo.Context) error {
	if err := h.svc.DeleteSectionImage(c.Request().Context(), c.Param("id"), c.Param("imageID")); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return ok(c)
}

// ---------- FAQs ----------

func (h Handler) ListFAQs(c echo.Context) error {
	items, err := h.svc.ListFAQs(c.Request().Context())
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]any{"faqs": items})
}

// SaveFAQ: POST creates, PUT /:id updates.
func (h Handler) SaveFAQ(c echo.Context) error {
	var req landingservice.FAQ
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	req.ID = c.Param("id")
	saved, err := h.svc.SaveFAQ(c.Request().Context(), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, saved)
}

func (h Handler) DeleteFAQ(c echo.Context) error {
	if err := h.svc.DeleteFAQ(c.Request().Context(), c.Param("id")); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return ok(c)
}

// ---------- upload ----------

// UploadImage handles POST /admin/upload (multipart field "image"): saves
// a PNG/JPEG/WebP/GIF of up to 5 MB under the upload directory and returns
// its public path, {"url": "/uploads/<name>"}. The type is sniffed from
// the bytes, not trusted from the file name.
func (h Handler) UploadImage(c echo.Context) error {
	fail := func(msg string) error {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "upload_failed", "message": msg})
	}

	header, err := c.FormFile("image")
	if err != nil {
		return fail("فایل تصویر ارسال نشده است (فیلد image)")
	}
	if header.Size > maxImageBytes {
		return fail("حجم تصویر باید کمتر از ۵ مگابایت باشد")
	}
	file, err := header.Open()
	if err != nil {
		return fail("خواندن فایل ناموفق بود")
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxImageBytes+1))
	if err != nil || len(data) > maxImageBytes {
		return fail("حجم تصویر باید کمتر از ۵ مگابایت باشد")
	}
	ext, allowed := imageExtensions[http.DetectContentType(data)]
	if !allowed {
		return fail("فقط تصویر PNG، JPG، WebP یا GIF")
	}

	if err := os.MkdirAll(h.uploadDir, 0o755); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal_error", "message": "ذخیره‌ی تصویر ناموفق بود"})
	}
	name := uuid.NewString() + ext
	if err := os.WriteFile(filepath.Join(h.uploadDir, name), data, 0o644); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "internal_error", "message": "ذخیره‌ی تصویر ناموفق بود"})
	}
	return c.JSON(http.StatusCreated, map[string]string{
		"url":  UploadURLPath + "/" + name,
		"size": strconv.Itoa(len(data)),
	})
}
