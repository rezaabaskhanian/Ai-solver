package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"mathmotion/go-api/internal/pkg/outboundhttp"
)

// connectivityTestURL matches the ops runbook's own step 7 check: if this
// returns the operator's new server's IP, traffic is genuinely leaving
// through the tunnel, not just parsing into valid config.
const connectivityTestURL = "https://ipinfo.io/json"

// Service backs POST /admin/proxy: writes an operator-submitted vless
// link as the Xray sidecar's config and confirms the resulting tunnel
// actually carries traffic, instead of just accepting a link that merely
// parses.
type Service struct {
	configPath string
	proxyURL   string // e.g. "socks5://xray:1080" -- the sidecar's own inbound
	// reloadWait gives the sidecar's watcher (deploy/xray/watch.sh) time
	// to notice the rewritten config and restart xray before the
	// connectivity test request goes out.
	reloadWait time.Duration
	// testURL defaults to connectivityTestURL; overridable (same-package
	// tests only, via a struct literal) so tests can point it at an
	// httptest.Server instead of the real internet.
	testURL string
}

func New(configPath, proxyURL string) Service {
	return Service{
		configPath: configPath,
		proxyURL:   proxyURL,
		reloadWait: 5 * time.Second,
		testURL:    connectivityTestURL,
	}
}

type ConnectResult struct {
	Connected bool   `json:"connected"`
	IP        string `json:"ip,omitempty"`
	Error     string `json:"error,omitempty"`
}

// Connect parses vlessLink, writes it as the sidecar's Xray config, waits
// for the sidecar to pick it up, then makes a real request through the
// resulting SOCKS5 tunnel. A malformed link is a returned error (the
// request itself was invalid); a well-formed link that just doesn't work
// (blocked, wrong key, server down) comes back as
// ConnectResult{Connected: false, Error: "..."} instead, since that's an
// expected, actionable outcome for the operator -- not a server bug.
func (s Service) Connect(ctx context.Context, vlessLink string) (ConnectResult, error) {
	parsed, err := ParseVlessLink(vlessLink)
	if err != nil {
		return ConnectResult{}, fmt.Errorf("invalid vless link: %w", err)
	}

	if err := s.writeConfig(parsed); err != nil {
		return ConnectResult{}, err
	}

	select {
	case <-time.After(s.reloadWait):
	case <-ctx.Done():
		return ConnectResult{}, ctx.Err()
	}

	return s.testConnectivity(ctx), nil
}

func (s Service) writeConfig(parsed ParsedVless) error {
	cfg := buildXrayClientConfig(parsed)
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling xray config: %w", err)
	}
	if err := os.WriteFile(s.configPath, data, 0o600); err != nil {
		return fmt.Errorf("writing xray config to %s: %w", s.configPath, err)
	}
	return nil
}

func (s Service) testConnectivity(ctx context.Context) ConnectResult {
	client, err := outboundhttp.New(s.proxyURL)
	if err != nil {
		return ConnectResult{Connected: false, Error: fmt.Sprintf("building proxied http client: %v", err)}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.testURL, nil)
	if err != nil {
		return ConnectResult{Connected: false, Error: fmt.Sprintf("building connectivity test request: %v", err)}
	}

	resp, err := client.Do(req)
	if err != nil {
		return ConnectResult{Connected: false, Error: err.Error()}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ConnectResult{Connected: false, Error: err.Error()}
	}
	if resp.StatusCode != http.StatusOK {
		return ConnectResult{
			Connected: false,
			Error:     fmt.Sprintf("unexpected status %d from connectivity check: %s", resp.StatusCode, string(body)),
		}
	}

	var info struct {
		IP string `json:"ip"`
	}
	if err := json.Unmarshal(body, &info); err != nil {
		return ConnectResult{Connected: false, Error: "could not parse connectivity check response"}
	}

	return ConnectResult{Connected: true, IP: info.IP}
}
