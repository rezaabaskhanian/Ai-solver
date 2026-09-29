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
	PackageName  string
	ProductID    string
	ClientID     string
	ClientSecret string
	RefreshToken string
}

// Outbound configures how this server's outbound calls to third-party AI
// APIs (the Scan Problem vision provider — Claude, OpenRouter or DeepSeek) reach the internet
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
	// XrayConfigPath is where the sidecar's config.json lives on the
	// volume this container shares with it (deploy/xray/watch.sh reads
	// the same path from the other side).
	XrayConfigPath string
}

// Admin configures the /admin/* endpoints the admin panel
// (backend/admin-panel) calls. There's no admin user system in this MVP:
// Token is a static bearer token the operator types into the panel's
// login page (see middleware.Admin). PanelOrigins are the browser origins
// allowed to call the API cross-origin (CORS), e.g. the panel's own URL.
type Admin struct {
	Token        string
	PanelOrigins []string
}

type Config struct {
	Postgres      postgres.Config
	MathEngineURL string
	HttpServer    HttpServer
	RateLimit     RateLimit
	Billing       Billing
	Outbound      Outbound
	Proxy         Proxy
	Admin         Admin
}
