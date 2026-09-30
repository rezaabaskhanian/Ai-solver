// Package authservice issues and checks the login tokens (JWT, HS256) —
// the same scheme as LingoFlow (Shadowing-backend service/auth): a
// short-lived access token sent on every request, and a long-lived
// refresh token that only POST /api/v1/auth/refresh accepts. The two are
// told apart by their subject, so a refresh token can't be used as an
// access token.
//
// HS256 is implemented directly on crypto/hmac rather than pulling in a
// JWT library for three small functions.
package authservice

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const (
	subjectAccess  = "access"
	subjectRefresh = "refresh"
)

// ErrInvalidToken covers a bad signature, a malformed or expired token,
// and the wrong kind of token.
var ErrInvalidToken = errors.New("invalid token")

type Config struct {
	SignKey    string
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

type Service struct {
	cfg Config
	now func() time.Time
}

func New(cfg Config) Service {
	return Service{cfg: cfg, now: time.Now}
}

// Tokens is the pair handed to the app after login/register/refresh.
type Tokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type claims struct {
	UserID    string `json:"uid"`
	Subject   string `json:"sub"`
	ExpiresAt int64  `json:"exp"`
}

var jwtHeader = base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))

// IssueTokens creates a fresh access + refresh pair for userID.
func (s Service) IssueTokens(userID string) (Tokens, error) {
	access, err := s.sign(claims{UserID: userID, Subject: subjectAccess, ExpiresAt: s.now().Add(s.cfg.AccessTTL).Unix()})
	if err != nil {
		return Tokens{}, err
	}
	refresh, err := s.sign(claims{UserID: userID, Subject: subjectRefresh, ExpiresAt: s.now().Add(s.cfg.RefreshTTL).Unix()})
	if err != nil {
		return Tokens{}, err
	}
	return Tokens{AccessToken: access, RefreshToken: refresh}, nil
}

// ParseAccessToken returns the user id of a valid access token.
func (s Service) ParseAccessToken(token string) (string, error) {
	return s.parse(token, subjectAccess)
}

// ParseRefreshToken returns the user id of a valid refresh token.
func (s Service) ParseRefreshToken(token string) (string, error) {
	return s.parse(token, subjectRefresh)
}

func (s Service) sign(c claims) (string, error) {
	payload, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	unsigned := jwtHeader + "." + base64.RawURLEncoding.EncodeToString(payload)
	return unsigned + "." + s.signature(unsigned), nil
}

func (s Service) signature(unsigned string) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.SignKey))
	mac.Write([]byte(unsigned))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func (s Service) parse(token, wantSubject string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || parts[0] != jwtHeader {
		return "", ErrInvalidToken
	}
	unsigned := parts[0] + "." + parts[1]
	if !hmac.Equal([]byte(parts[2]), []byte(s.signature(unsigned))) {
		return "", ErrInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", ErrInvalidToken
	}
	var c claims
	if err := json.Unmarshal(payload, &c); err != nil {
		return "", ErrInvalidToken
	}
	if c.Subject != wantSubject || c.UserID == "" || s.now().Unix() >= c.ExpiresAt {
		return "", ErrInvalidToken
	}
	return c.UserID, nil
}
