package errorhandling

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/pkg/richerror"
)

func newTestContext() (echo.Context, *httptest.ResponseRecorder) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func TestErrorHandling_KindInvalidReturns422(t *testing.T) {
	c, rec := newTestContext()
	err := richerror.New("op").WithKind(richerror.KindInvalid).WithMessage("bad equation")

	if handleErr := ErrorHandling(err, c); handleErr != nil {
		t.Fatalf("ErrorHandling returned error: %v", handleErr)
	}

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshaling body: %v", err)
	}
	if body["error"] != "invalid_input" || body["message"] != "bad equation" {
		t.Fatalf("body = %v, want error=invalid_input message=bad equation", body)
	}
}

func TestErrorHandling_KindNotFoundReturns404(t *testing.T) {
	c, rec := newTestContext()
	err := richerror.New("op").WithKind(richerror.KindNotFound).WithMessage("missing")

	_ = ErrorHandling(err, c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestErrorHandling_KindPaymentRequiredReturns402(t *testing.T) {
	c, rec := newTestContext()
	err := richerror.New("op").WithKind(richerror.KindPaymentRequired).WithMessage("quota used up")

	_ = ErrorHandling(err, c)

	if rec.Code != http.StatusPaymentRequired {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusPaymentRequired)
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshaling body: %v", err)
	}
	if body["error"] != "quota_exceeded" || body["message"] != "quota used up" {
		t.Fatalf("body = %v, want error=quota_exceeded message=quota used up", body)
	}
}

func TestErrorHandling_KindUnexpectedReturns500(t *testing.T) {
	c, rec := newTestContext()
	err := richerror.New("op").WithKind(richerror.KindUnexpected).WithMessage("db down")

	_ = ErrorHandling(err, c)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func TestErrorHandling_PlainErrorReturns500(t *testing.T) {
	c, rec := newTestContext()

	_ = ErrorHandling(errors.New("unexpected"), c)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshaling body: %v", err)
	}
	if body["error"] != "internal_error" {
		t.Fatalf(`body["error"] = %q, want "internal_error"`, body["error"])
	}
}
