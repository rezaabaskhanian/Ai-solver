package authservice

import (
	"testing"
	"time"
)

func newTestService() Service {
	return New(Config{SignKey: "test-key", AccessTTL: time.Hour, RefreshTTL: 24 * time.Hour})
}

func TestIssueAndParse(t *testing.T) {
	s := newTestService()
	tokens, err := s.IssueTokens("user-1")
	if err != nil {
		t.Fatalf("IssueTokens: %v", err)
	}
	if id, err := s.ParseAccessToken(tokens.AccessToken); err != nil || id != "user-1" {
		t.Fatalf("ParseAccessToken = %q, %v", id, err)
	}
	if id, err := s.ParseRefreshToken(tokens.RefreshToken); err != nil || id != "user-1" {
		t.Fatalf("ParseRefreshToken = %q, %v", id, err)
	}
}

func TestTokensCantBeSwapped(t *testing.T) {
	s := newTestService()
	tokens, _ := s.IssueTokens("user-1")
	if _, err := s.ParseAccessToken(tokens.RefreshToken); err == nil {
		t.Fatal("a refresh token must not work as an access token")
	}
	if _, err := s.ParseRefreshToken(tokens.AccessToken); err == nil {
		t.Fatal("an access token must not work as a refresh token")
	}
}

func TestExpiredToken(t *testing.T) {
	s := newTestService()
	tokens, _ := s.IssueTokens("user-1")
	s.now = func() time.Time { return time.Now().Add(2 * time.Hour) }
	if _, err := s.ParseAccessToken(tokens.AccessToken); err == nil {
		t.Fatal("expired access token was accepted")
	}
}

func TestWrongKeyAndTampering(t *testing.T) {
	s := newTestService()
	tokens, _ := s.IssueTokens("user-1")

	other := New(Config{SignKey: "other-key", AccessTTL: time.Hour, RefreshTTL: time.Hour})
	if _, err := other.ParseAccessToken(tokens.AccessToken); err == nil {
		t.Fatal("token signed with another key was accepted")
	}
	tampered := tokens.AccessToken[:len(tokens.AccessToken)-2] + "xx"
	if _, err := s.ParseAccessToken(tampered); err == nil {
		t.Fatal("tampered token was accepted")
	}
	if _, err := s.ParseAccessToken("not.a.jwt"); err == nil {
		t.Fatal("garbage was accepted")
	}
}
