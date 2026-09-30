// Package otpservice sends and checks the SMS codes that prove a phone
// number is the user's — for sign-up and password reset. Same flow and
// limits as LingoFlow (Shadowing-backend service/otp): a 5-digit code
// valid for 2 minutes, one resend per minute, 5 wrong tries; a correct
// code yields a one-time token (valid 10 minutes) that register /
// reset-pass must present.
package otpservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"time"

	"mathmotion/go-api/internal/pkg/richerror"
)

const (
	PurposeRegister = "register"
	PurposeReset    = "reset"

	CodeLength     = 5
	codeTTL        = 2 * time.Minute
	tokenTTL       = 10 * time.Minute
	resendCooldown = 60 * time.Second
	maxAttempts    = 5
)

// ErrNotFound is returned by the repository when there's no matching row.
var ErrNotFound = errors.New("not found")

// Code is one otp_codes row.
type Code struct {
	ID        string
	Code      string
	Attempts  int
	ExpiresAt time.Time
	CreatedAt time.Time
}

type Repository interface {
	Create(ctx context.Context, phone, purpose, code string, expiresAt time.Time) error
	// LatestPending is the newest not-yet-verified code for phone+purpose.
	LatestPending(ctx context.Context, phone, purpose string) (Code, error)
	IncrementAttempts(ctx context.Context, id string) error
	MarkVerified(ctx context.Context, id, token string, tokenExpiresAt time.Time) error
	// ConsumeToken marks a verified, unexpired, unused token for
	// phone+purpose as used; ErrNotFound when there's no such token.
	ConsumeToken(ctx context.Context, phone, purpose, token string) error
}

type SMSSender interface {
	SendCode(ctx context.Context, phone, code string) error
}

type Service struct {
	repo Repository
	sms  SMSSender
	now  func() time.Time
}

func New(repo Repository, sms SMSSender) Service {
	return Service{repo: repo, sms: sms, now: time.Now}
}

func ValidPurpose(p string) bool {
	return p == PurposeRegister || p == PurposeReset
}

func generateCode() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(100000))
	return fmt.Sprintf("%05d", n.Int64())
}

func generateToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// Send texts a fresh code, unless the last one went out less than a
// minute ago (so the endpoint can't be used to spam a number).
func (s Service) Send(ctx context.Context, phone, purpose string) error {
	const op = "otpservice.Send"

	if last, err := s.repo.LatestPending(ctx, phone, purpose); err == nil {
		if s.now().Sub(last.CreatedAt) < resendCooldown {
			return richerror.New(op).WithKind(richerror.KindTooManyRequests).
				WithMessage("لطفاً یک دقیقه صبر کن و دوباره تلاش کن")
		}
	}

	code := generateCode()
	if err := s.repo.Create(ctx, phone, purpose, code, s.now().Add(codeTTL)); err != nil {
		return richerror.New(op).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("خطا در ذخیره‌ی کد تایید")
	}
	if err := s.sms.SendCode(ctx, phone, code); err != nil {
		return richerror.New(op).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("ارسال پیامک ناموفق بود، کمی بعد دوباره تلاش کن")
	}
	return nil
}

// Verify checks code against the latest pending one and, if it matches,
// returns the one-time token that proves the phone.
func (s Service) Verify(ctx context.Context, phone, purpose, code string) (string, error) {
	const op = "otpservice.Verify"

	row, err := s.repo.LatestPending(ctx, phone, purpose)
	if errors.Is(err, ErrNotFound) {
		return "", richerror.New(op).WithKind(richerror.KindInvalid).
			WithMessage("کد تاییدی برای این شماره پیدا نشد، دوباره کد بگیر")
	}
	if err != nil {
		return "", richerror.New(op).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("خطا در بررسی کد تایید")
	}
	if row.Attempts >= maxAttempts {
		return "", richerror.New(op).WithKind(richerror.KindInvalid).
			WithMessage("تعداد تلاش‌های مجاز تمام شده، دوباره کد بگیر")
	}
	if s.now().After(row.ExpiresAt) {
		return "", richerror.New(op).WithKind(richerror.KindInvalid).
			WithMessage("کد تایید منقضی شده، دوباره کد بگیر")
	}
	if row.Code != code {
		_ = s.repo.IncrementAttempts(ctx, row.ID)
		return "", richerror.New(op).WithKind(richerror.KindInvalid).WithMessage("کد تایید نادرست است")
	}

	token, err := generateToken()
	if err != nil {
		return "", richerror.New(op).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("خطا در تایید کد")
	}
	if err := s.repo.MarkVerified(ctx, row.ID, token, s.now().Add(tokenTTL)); err != nil {
		return "", richerror.New(op).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("خطا در تایید کد")
	}
	return token, nil
}

// ConsumeToken accepts a token from Verify exactly once — the proof
// register / reset-pass need that the phone really was confirmed.
func (s Service) ConsumeToken(ctx context.Context, phone, purpose, token string) error {
	const op = "otpservice.ConsumeToken"

	if token == "" {
		return richerror.New(op).WithKind(richerror.KindInvalid).
			WithMessage("اول شماره موبایل را با کد پیامکی تایید کن")
	}
	err := s.repo.ConsumeToken(ctx, phone, purpose, token)
	if errors.Is(err, ErrNotFound) {
		return richerror.New(op).WithKind(richerror.KindInvalid).
			WithMessage("تایید شماره موبایل نامعتبر یا منقضی شده، دوباره تلاش کن")
	}
	if err != nil {
		return richerror.New(op).WithErr(err).WithKind(richerror.KindUnexpected).
			WithMessage("خطا در تایید شماره موبایل")
	}
	return nil
}
