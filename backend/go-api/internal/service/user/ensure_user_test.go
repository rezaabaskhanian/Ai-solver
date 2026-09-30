package userservice

import (
	"context"
	"errors"
	"testing"

	domain "mathmotion/go-api/internal/domain/user"
	"mathmotion/go-api/internal/pkg/richerror"
)

type fakeUserRepo struct {
	user domain.User
	err  error
}

func (f fakeUserRepo) EnsureUser(ctx context.Context, deviceID string) (domain.User, error) {
	return f.user, f.err
}

func (f fakeUserRepo) GetByID(ctx context.Context, id string) (domain.User, error) {
	return f.user, f.err
}

func TestEnsureUser_Success(t *testing.T) {
	want := domain.NewUser("user-1", "device-1")
	svc := New(fakeUserRepo{user: want})

	got, err := svc.EnsureUser(context.Background(), "device-1")
	if err != nil {
		t.Fatalf("EnsureUser returned error: %v", err)
	}
	if got.ID != want.ID || got.DeviceID != want.DeviceID {
		t.Fatalf("EnsureUser() = %+v, want %+v", got, want)
	}
}

func TestEnsureUser_RepositoryErrorIsWrapped(t *testing.T) {
	svc := New(fakeUserRepo{err: errors.New("connection refused")})

	_, err := svc.EnsureUser(context.Background(), "device-1")
	if err == nil {
		t.Fatal("EnsureUser() returned nil error, want wrapped error")
	}

	richErr, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error type = %T, want richerror.RichError", err)
	}
	if richErr.Kind() != richerror.KindUnexpected {
		t.Fatalf("Kind() = %v, want %v", richErr.Kind(), richerror.KindUnexpected)
	}
}
