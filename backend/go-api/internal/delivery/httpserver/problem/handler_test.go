package problemhandler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"

	domain "mathmotion/go-api/internal/domain/problem"
	problemservice "mathmotion/go-api/internal/service/problem"
	"mathmotion/go-api/internal/service/problem/dto"
	"mathmotion/go-api/internal/service/quota"
)

type fakeRepo struct {
	saveProblemID string
	listItems     []dto.HistoryItem
}

func (f *fakeRepo) SaveProblemAndSolution(
	ctx context.Context,
	userID, rawInput, normalizedExpression, problemType, answer string,
	verified bool,
	steps []domain.Step,
) (string, error) {
	return f.saveProblemID, nil
}

func (f *fakeRepo) ListHistory(ctx context.Context, userID string, limit, offset int) ([]dto.HistoryItem, error) {
	return f.listItems, nil
}

func (f *fakeRepo) CountProblems(ctx context.Context, userID string) (int, error) {
	return 0, nil
}

// noQuota lets every request through (quota logic is tested in
// internal/service/quota).
type noQuota struct{}

func (noQuota) Allow(context.Context, string, bool, quota.Kind) error { return nil }
func (noQuota) Record(context.Context, string, quota.Kind) error      { return nil }
func (noQuota) Status(context.Context, string, bool) (quota.Status, error) {
	return quota.Status{}, nil
}

func newEngineServer(status int, body map[string]any) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(body)
	}))
}

func TestParse_InvalidJSONBodyReturns400(t *testing.T) {
	h := New(problemservice.New(&fakeRepo{}, problemservice.NewMathEngineClient("http://unused"), noQuota{}))

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"input":`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := h.Parse(c); err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestParse_HappyPathReturns200(t *testing.T) {
	engineSrv := newEngineServer(http.StatusOK, map[string]any{
		"problem": "2x + 5 = 17", "type": "linear_equation", "confidence": 0.99,
	})
	defer engineSrv.Close()

	h := New(problemservice.New(&fakeRepo{}, problemservice.NewMathEngineClient(engineSrv.URL), noQuota{}))

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"input":"2x + 5 = 17"}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := h.Parse(c); err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var got dto.ParseResult
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshaling response: %v", err)
	}
	if got.Type != "linear_equation" {
		t.Fatalf("Type = %q, want %q", got.Type, "linear_equation")
	}
}

func TestParse_EngineErrorReturns422(t *testing.T) {
	engineSrv := newEngineServer(http.StatusUnprocessableEntity, map[string]any{
		"error": "parse_error", "message": "Could not parse the input",
	})
	defer engineSrv.Close()

	h := New(problemservice.New(&fakeRepo{}, problemservice.NewMathEngineClient(engineSrv.URL), noQuota{}))

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"input":"???"}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := h.Parse(c); err != nil {
		t.Fatalf("Parse returned error: %v", err)
	}
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusUnprocessableEntity)
	}
}

func TestHistory_DefaultsLimitAndOffsetWhenInvalid(t *testing.T) {
	repo := &fakeRepo{listItems: []dto.HistoryItem{{ProblemID: "p1"}}}
	h := New(problemservice.New(repo, problemservice.NewMathEngineClient("http://unused"), noQuota{}))

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/?"+url.Values{"limit": {"not-a-number"}}.Encode(), nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := h.History(c); err != nil {
		t.Fatalf("History returned error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body map[string][]dto.HistoryItem
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshaling response: %v", err)
	}
	if len(body["items"]) != 1 {
		t.Fatalf("items = %+v, want 1 item", body["items"])
	}
}
