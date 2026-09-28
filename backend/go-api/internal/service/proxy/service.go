package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"mathmotion/go-api/internal/pkg/outboundhttp"
)

// connectivityTestURLs are IP-echo services tried in order: if one returns
// the Xray server's IP, traffic is genuinely leaving through the tunnel,
// not just parsing into valid config. More than one because these services
// rate-limit per IP (ipinfo.io answers 429 once other projects on the same
// server or exit IP have used up its free quota).
var connectivityTestURLs = []string{
	"https://ipinfo.io/json",
	"https://api.ipify.org?format=json",
	"https://api.myip.com",
}

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
	// testURLs defaults to connectivityTestURLs; overridable (same-package
	// tests only, via a struct literal) so tests can point it at an
	// httptest.Server instead of the real internet.
	testURLs []string
}

func New(configPath, proxyURL string) Service {
	return Service{
		configPath: configPath,
		proxyURL:   proxyURL,
		reloadWait: 5 * time.Second,
		testURLs:   connectivityTestURLs,
	}
}

type ConnectResult struct {
	Connected bool   `json:"connected"`
	IP        string `json:"ip,omitempty"`
	Country   string `json:"country,omitempty"`
	Org       string `json:"org,omitempty"`
	Error     string `json:"error,omitempty"`
	// ViaProxy is false when AI_OUTBOUND_PROXY is unset: the check then
	// dials directly, so IP is this server's own address, not the tunnel's.
	ViaProxy bool `json:"via_proxy"`
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

// Status runs the same connectivity check Connect ends with, without
// touching the Xray config — backs GET /admin/proxy/status, so the admin
// panel can show whether AI traffic currently leaves through the tunnel.
func (s Service) Status(ctx context.Context) ConnectResult {
	return s.testConnectivity(ctx)
}

func (s Service) testConnectivity(ctx context.Context) ConnectResult {
	result := s.checkConnectivity(ctx)
	result.ViaProxy = s.proxyURL != ""
	return result
}

func (s Service) checkConnectivity(ctx context.Context) ConnectResult {
	client, err := outboundhttp.New(s.proxyURL)
	if err != nil {
		return ConnectResult{Connected: false, Error: fmt.Sprintf("building proxied http client: %v", err)}
	}

	var errs []string
	for _, testURL := range s.testURLs {
		result, err := checkOne(ctx, client, testURL)
		if err == nil {
			return result
		}
		errs = append(errs, err.Error())
		if ctx.Err() != nil {
			break
		}
	}
	return ConnectResult{Connected: false, Error: strings.Join(errs, "; ")}
}

func checkOne(ctx context.Context, client *http.Client, testURL string) (ConnectResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, testURL, nil)
	if err != nil {
		return ConnectResult{}, fmt.Errorf("building connectivity test request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return ConnectResult{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if err != nil {
		return ConnectResult{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return ConnectResult{}, fmt.Errorf("unexpected status %d from %s: %s",
			resp.StatusCode, req.URL.Host, strings.TrimSpace(string(body)))
	}

	var info struct {
		IP      string `json:"ip"`
		Country string `json:"country"`
		Org     string `json:"org"`
	}
	if err := json.Unmarshal(body, &info); err != nil || info.IP == "" {
		return ConnectResult{}, fmt.Errorf("could not parse connectivity check response from %s", req.URL.Host)
	}

	return ConnectResult{Connected: true, IP: info.IP, Country: info.Country, Org: info.Org}, nil
}
