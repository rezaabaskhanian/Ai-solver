package config

import "mathmotion/go-api/internal/repository/postgres"

type HttpServer struct {
	Port string
}

type RateLimit struct {
	RPS   float64
	Burst int
}

// Billing configures the Cafe Bazaar Purchase Validator integration
// (internal/service/billing) and the free-tier quota it gates
// (internal/service/problem.Solve). ClientID/ClientSecret/RefreshToken
// come from Cafe Bazaar's developer panel (Pishkhan) — see
// mobile/MathMotion/APP.md for the manual setup this depends on.
type Billing struct {
	PackageName    string
	ProductID      string
	ClientID       string
	ClientSecret   string
	RefreshToken   string
	FreeSolveLimit int
}

// Vision configures the camera-based "Scan Problem" flow
// (internal/service/vision): a vision-capable Claude model reads a
// photo of a handwritten/printed equation and returns it as plain
// text — it never computes or verifies an answer (PRD section 38);
// the recognized text is handed to the existing Solve flow unchanged.
type Vision struct {
	AnthropicAPIKey string
}

// Outbound configures how this server's outbound calls to third-party AI
// APIs (currently just Claude Vision) reach the internet
// (internal/pkg/outboundhttp). Empty ProxyURL means dial directly — the
// default, for a server whose IP the provider doesn't block. When it
// does, ProxyURL points at the local Xray sidecar's SOCKS5 inbound (e.g.
// "socks5://xray:1080"), which internal/service/proxy configures — see
// docs/xray-proxy-setup.md for the full runbook.
type Outbound struct {
	ProxyURL string
}

// Proxy configures the admin-only POST /admin/proxy endpoint
// (internal/service/proxy), which lets an operator paste a fresh
// vless:// (VLESS+Reality) link and have the Xray sidecar reconfigure
// itself without a redeploy.
type Proxy struct {
	AdminToken string
	// XrayConfigPath is where the sidecar's config.json lives on the
	// volume this container shares with it (deploy/xray/watch.sh reads
	// the same path from the other side).
	XrayConfigPath string
}

type Config struct {
	Postgres      postgres.Config
	MathEngineURL string
	HttpServer    HttpServer
	RateLimit     RateLimit
	Billing       Billing
	Vision        Vision
	Outbound      Outbound
	Proxy         Proxy
}
