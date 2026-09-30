package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"

	domain "mathmotion/go-api/internal/domain/user"
	userservice "mathmotion/go-api/internal/service/user"
)

type fakeUserRepo struct {
	lastDeviceID string
	userID       string
	isPremium    bool
	err          error
}

func (f *fakeUserRepo) EnsureUser(ctx context.Context, deviceID string) (domain.User, error) {
	f.lastDeviceID = deviceID
	if f.err != nil {
		return domain.User{}, f.err
	}
	return domain.User{ID: f.userID, DeviceID: deviceID, IsPremium: f.isPremium}, nil
}

func (f *fakeUserRepo) GetByID(ctx context.Context, id string) (domain.User, error) {
	if id != f.userID {
		return domain.User{}, domain.ErrNotFound
	}
	return domain.User{ID: f.userID, IsPremium: f.isPremium}, nil
}

func TestDevice_MintsIDWhenHeaderMissing(t *testing.T) {
	repo := &fakeUserRepo{userID: "user-1"}
	mw := Device(userservice.New(repo), nil)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	var gotUserID string
	handler := mw(func(c echo.Context) error {
		gotUserID = UserIDFromContext(c)
		return c.NoContent(http.StatusOK)
	})

	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}

	echoedID := rec.Header().Get("X-Device-Id")
	if echoedID == "" {
		t.Fatal("expected X-Device-Id response header to be set")
	}
	if repo.lastDeviceID != echoedID {
		t.Fatalf("EnsureUser called with %q, want minted id %q", repo.lastDeviceID, echoedID)
	}
	if gotUserID != "user-1" {
		t.Fatalf("UserIDFromContext() = %q, want %q", gotUserID, "user-1")
	}
}

func TestDevice_ReusesProvidedDeviceID(t *testing.T) {
	repo := &fakeUserRepo{userID: "user-2"}
	mw := Device(userservice.New(repo), nil)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Device-Id", "my-device-42")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handler := mw(func(c echo.Context) error { return c.NoContent(http.StatusOK) })
	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}

	if repo.lastDeviceID != "my-device-42" {
		t.Fatalf("EnsureUser called with %q, want %q", repo.lastDeviceID, "my-device-42")
	}
	if got := rec.Header().Get("X-Device-Id"); got != "my-device-42" {
		t.Fatalf("X-Device-Id response header = %q, want %q", got, "my-device-42")
	}
}

func TestDevice_SetsIsPremiumInContext(t *testing.T) {
	repo := &fakeUserRepo{userID: "user-3", isPremium: true}
	mw := Device(userservice.New(repo), nil)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	var gotIsPremium bool
	handler := mw(func(c echo.Context) error {
		gotIsPremium = IsPremiumFromContext(c)
		return c.NoContent(http.StatusOK)
	})

	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if !gotIsPremium {
		t.Fatal("IsPremiumFromContext() = false, want true")
	}
}

func TestDevice_RepositoryErrorSkipsNextHandler(t *testing.T) {
	repo := &fakeUserRepo{err: errors.New("db down")}
	mw := Device(userservice.New(repo), nil)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	nextCalled := false
	handler := mw(func(c echo.Context) error {
		nextCalled = true
		return nil
	})

	if err := handler(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if nextCalled {
		t.Fatal("next handler should not be called when EnsureUser fails")
	}
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}
