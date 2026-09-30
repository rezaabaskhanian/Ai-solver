package accountservice

import (
	"context"
	"testing"
	"time"

	domain "mathmotion/go-api/internal/domain/user"
	"mathmotion/go-api/internal/pkg/richerror"
	authservice "mathmotion/go-api/internal/service/auth"
)

type fakeRepo struct {
	byID     map[string]domain.User
	byDevice map[string]string // device id -> user id
	created  int
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{byID: map[string]domain.User{}, byDevice: map[string]string{}}
}

func (f *fakeRepo) EnsureUser(ctx context.Context, deviceID string) (domain.User, error) {
	if id, ok := f.byDevice[deviceID]; ok {
		return f.byID[id], nil
	}
	u := domain.User{ID: "dev-" + deviceID, DeviceID: deviceID}
	f.byID[u.ID], f.byDevice[deviceID] = u, u.ID
	return u, nil
}

func (f *fakeRepo) GetByID(ctx context.Context, id string) (domain.User, error) {
	u, ok := f.byID[id]
	if !ok {
		return domain.User{}, domain.ErrNotFound
	}
	return u, nil
}

func (f *fakeRepo) GetByPhone(ctx context.Context, phone string) (domain.User, error) {
	for _, u := range f.byID {
		if u.Phone != nil && *u.Phone == phone {
			return u, nil
		}
	}
	return domain.User{}, domain.ErrNotFound
}

func (f *fakeRepo) AttachAccount(ctx context.Context, userID, phone, nickname, hash string) (domain.User, error) {
	if _, err := f.GetByPhone(ctx, phone); err == nil {
		return domain.User{}, domain.ErrPhoneTaken
	}
	u := f.byID[userID]
	u.Phone, u.Name, u.PasswordHash = &phone, &nickname, hash
	f.byID[userID] = u
	return u, nil
}

func (f *fakeRepo) CreateAccount(ctx context.Context, phone, nickname, hash string) (domain.User, error) {
	if _, err := f.GetByPhone(ctx, phone); err == nil {
		return domain.User{}, domain.ErrPhoneTaken
	}
	f.created++
	u := domain.User{ID: "acct-" + phone, Phone: &phone, Name: &nickname, PasswordHash: hash}
	f.byID[u.ID] = u
	return u, nil
}

func (f *fakeRepo) SetPassword(ctx context.Context, userID, hash string) error {
	u := f.byID[userID]
	u.PasswordHash = hash
	f.byID[userID] = u
	return nil
}

// fakeOTP accepts the token "ok" for any phone/purpose.
type fakeOTP struct{ sent []string }

func (f *fakeOTP) Send(ctx context.Context, phone, purpose string) error {
	f.sent = append(f.sent, phone+"/"+purpose)
	return nil
}

func (f *fakeOTP) Verify(ctx context.Context, phone, purpose, code string) (string, error) {
	return "ok", nil
}

func (f *fakeOTP) ConsumeToken(ctx context.Context, phone, purpose, token string) error {
	if token != "ok" {
		return richerror.New("fake").WithKind(richerror.KindInvalid).WithMessage("bad token")
	}
	return nil
}

func newService() (Service, *fakeRepo, *fakeOTP) {
	repo, otp := newFakeRepo(), &fakeOTP{}
	tokens := authservice.New(authservice.Config{SignKey: "k", AccessTTL: time.Hour, RefreshTTL: time.Hour})
	return New(repo, otp, tokens), repo, otp
}

func kind(t *testing.T, err error) richerror.Kind {
	t.Helper()
	re, ok := err.(richerror.RichError)
	if !ok {
		t.Fatalf("error %T %v is not a RichError", err, err)
	}
	return re.Kind()
}

func TestNormalizePhone(t *testing.T) {
	for raw, want := range map[string]string{
		"09121234567":      "09121234567",
		"۰۹۱۲۱۲۳۴۵۶۷":      "09121234567",
		"+98 912 123 4567": "09121234567",
		"9121234567":       "09121234567",
		"0912123456":       "",
		"08121234567":      "",
	} {
		if got := NormalizePhone(raw); got != want {
			t.Errorf("NormalizePhone(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestRegisterTurnsTheDeviceUserIntoTheAccount(t *testing.T) {
	svc, repo, _ := newService()
	ctx := context.Background()
	device, _ := repo.EnsureUser(ctx, "device-1")

	res, err := svc.Register(ctx, "device-1", RegisterRequest{
		Nickname: "رضا", Phone: "09121234567", Password: "secret1", OtpToken: "ok",
	})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if res.User.ID != device.ID || repo.created != 0 {
		t.Fatalf("user id = %q (created %d), want the device user %q", res.User.ID, repo.created, device.ID)
	}
	if res.Tokens.AccessToken == "" || res.User.Phone != "09121234567" || res.User.Nickname != "رضا" {
		t.Fatalf("unexpected result %+v", res)
	}
}

func TestRegisterOnADeviceThatAlreadyHasAnAccountCreatesANewOne(t *testing.T) {
	svc, repo, _ := newService()
	ctx := context.Background()
	req := RegisterRequest{Nickname: "a", Phone: "09121234567", Password: "secret1", OtpToken: "ok"}
	if _, err := svc.Register(ctx, "device-1", req); err != nil {
		t.Fatal(err)
	}
	req.Phone = "09129999999"
	res, err := svc.Register(ctx, "device-1", req)
	if err != nil {
		t.Fatal(err)
	}
	if repo.created != 1 || res.User.Phone != "09129999999" {
		t.Fatalf("created = %d, user = %+v", repo.created, res.User)
	}
}

func TestRegisterRejections(t *testing.T) {
	svc, _, _ := newService()
	ctx := context.Background()
	good := RegisterRequest{Nickname: "a", Phone: "09121234567", Password: "secret1", OtpToken: "ok"}

	for name, req := range map[string]RegisterRequest{
		"bad phone":      {Nickname: "a", Phone: "123", Password: "secret1", OtpToken: "ok"},
		"no nickname":    {Nickname: " ", Phone: "09121234567", Password: "secret1", OtpToken: "ok"},
		"short password": {Nickname: "a", Phone: "09121234567", Password: "123", OtpToken: "ok"},
		"no otp":         {Nickname: "a", Phone: "09121234567", Password: "secret1"},
	} {
		if _, err := svc.Register(ctx, "d", req); err == nil || kind(t, err) != richerror.KindInvalid {
			t.Errorf("%s: err = %v, want KindInvalid", name, err)
		}
	}

	if _, err := svc.Register(ctx, "d1", good); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Register(ctx, "d2", good); err == nil || kind(t, err) != richerror.KindConflict {
		t.Fatalf("duplicate phone: err = %v, want KindConflict", err)
	}
}

func TestLoginAndRefresh(t *testing.T) {
	svc, _, _ := newService()
	ctx := context.Background()
	if _, err := svc.Register(ctx, "d", RegisterRequest{Nickname: "a", Phone: "09121234567", Password: "secret1", OtpToken: "ok"}); err != nil {
		t.Fatal(err)
	}

	res, err := svc.Login(ctx, "۰۹۱۲۱۲۳۴۵۶۷", "secret1")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	if _, err := svc.Login(ctx, "09121234567", "wrong-pass"); err == nil || kind(t, err) != richerror.KindUnauthorized {
		t.Fatalf("wrong password: err = %v, want KindUnauthorized", err)
	}
	if _, err := svc.Login(ctx, "09120000000", "secret1"); err == nil || kind(t, err) != richerror.KindNotFound {
		t.Fatalf("unknown phone: err = %v, want KindNotFound", err)
	}

	refreshed, err := svc.Refresh(ctx, res.Tokens.RefreshToken)
	if err != nil || refreshed.Tokens.AccessToken == "" {
		t.Fatalf("Refresh: %v", err)
	}
	if _, err := svc.Refresh(ctx, res.Tokens.AccessToken); err == nil {
		t.Fatal("an access token was accepted as a refresh token")
	}
}

func TestSendOTPChecksThePhone(t *testing.T) {
	svc, _, otp := newService()
	ctx := context.Background()

	if err := svc.SendOTP(ctx, "09121234567", "reset"); err == nil || kind(t, err) != richerror.KindNotFound {
		t.Fatalf("reset for unknown phone: err = %v, want KindNotFound", err)
	}
	if err := svc.SendOTP(ctx, "09121234567", "register"); err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := svc.Register(ctx, "d", RegisterRequest{Nickname: "a", Phone: "09121234567", Password: "secret1", OtpToken: "ok"}); err != nil {
		t.Fatal(err)
	}
	if err := svc.SendOTP(ctx, "09121234567", "register"); err == nil || kind(t, err) != richerror.KindConflict {
		t.Fatalf("register for taken phone: err = %v, want KindConflict", err)
	}
	if len(otp.sent) != 1 {
		t.Fatalf("sent = %v, want exactly one SMS", otp.sent)
	}
}

func TestResetPassword(t *testing.T) {
	svc, _, _ := newService()
	ctx := context.Background()
	if _, err := svc.Register(ctx, "d", RegisterRequest{Nickname: "a", Phone: "09121234567", Password: "secret1", OtpToken: "ok"}); err != nil {
		t.Fatal(err)
	}
	if err := svc.ResetPassword(ctx, ResetPasswordRequest{Phone: "09121234567", OtpToken: "ok", Password: "newpass"}); err != nil {
		t.Fatalf("ResetPassword: %v", err)
	}
	if _, err := svc.Login(ctx, "09121234567", "newpass"); err != nil {
		t.Fatalf("login with new password: %v", err)
	}
	if err := svc.ResetPassword(ctx, ResetPasswordRequest{Phone: "09121234567", OtpToken: "bad", Password: "other1"}); err == nil {
		t.Fatal("reset without a valid SMS token was accepted")
	}
}
