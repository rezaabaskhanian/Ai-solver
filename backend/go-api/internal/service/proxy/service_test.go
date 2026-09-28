package proxy

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func newTestService(t *testing.T, testURL string) Service {
	t.Helper()
	configPath := filepath.Join(t.TempDir(), "config.json")
	return Service{
		configPath: configPath,
		proxyURL:   "", // dial the httptest.Server directly, no real SOCKS5 hop needed for this test
		reloadWait: 0,
		testURL:    testURL,
	}
}

func TestService_Connect_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"ip":"203.0.113.10"}`))
	}))
	defer srv.Close()

	svc := newTestService(t, srv.URL)

	result, err := svc.Connect(context.Background(), validLink)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !result.Connected {
		t.Fatalf("expected Connected=true, got %+v", result)
	}
	if result.IP != "203.0.113.10" {
		t.Fatalf("expected the connectivity check's IP to be echoed back, got %+v", result)
	}

	written, err := os.ReadFile(svc.configPath)
	if err != nil {
		t.Fatalf("expected the xray config to have been written: %v", err)
	}
	if len(written) == 0 {
		t.Fatalf("expected non-empty xray config")
	}
}

func TestService_Connect_UnreachableUpstreamIsNotAnError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer srv.Close()

	svc := newTestService(t, srv.URL)

	result, err := svc.Connect(context.Background(), validLink)
	if err != nil {
		t.Fatalf("a working tunnel that reaches a failing upstream should not be a Go error: %v", err)
	}
	if result.Connected {
		t.Fatalf("expected Connected=false, got %+v", result)
	}
	if result.Error == "" {
		t.Fatalf("expected a diagnostic message in ConnectResult.Error")
	}
}

func TestService_Connect_InvalidLinkIsAnError(t *testing.T) {
	svc := newTestService(t, "http://unused.invalid")

	if _, err := svc.Connect(context.Background(), "not-a-vless-link"); err == nil {
		t.Fatalf("expected an error for a malformed vless link")
	}
}
