package outboundhttp

import (
	"net/http"
	"testing"
)

func TestNew_EmptyProxyReturnsDefaultClient(t *testing.T) {
	client, err := New("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client != http.DefaultClient {
		t.Fatalf("expected http.DefaultClient, got a different client")
	}
}

func TestNew_ValidSocks5UrlReturnsConfiguredClient(t *testing.T) {
	client, err := New("socks5://xray:1080")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client == http.DefaultClient {
		t.Fatalf("expected a dedicated client, got http.DefaultClient")
	}
	if client.Transport == nil {
		t.Fatalf("expected a configured Transport")
	}
	if client.Timeout != defaultTimeout {
		t.Fatalf("expected timeout %v, got %v", defaultTimeout, client.Timeout)
	}
}

func TestNew_RejectsUnsupportedScheme(t *testing.T) {
	if _, err := New("http://xray:1080"); err == nil {
		t.Fatalf("expected an error for a non-socks5 scheme")
	}
}

func TestNew_RejectsMissingHost(t *testing.T) {
	if _, err := New("socks5://"); err == nil {
		t.Fatalf("expected an error for a missing host")
	}
}

func TestNew_RejectsUnparseableUrl(t *testing.T) {
	if _, err := New("://not-a-url"); err == nil {
		t.Fatalf("expected an error for an unparseable url")
	}
}
