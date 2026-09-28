// Package proxy lets an operator point this server's outbound AI calls
// (internal/pkg/outboundhttp) at a self-hosted Xray server over
// VLESS+Reality, when the provider blocks this server's own IP directly
// (see docs/xray-proxy-setup.md for the end-to-end runbook, including
// setting up that Xray server itself). This package only handles the
// client side: parsing the vless:// link an operator pastes into
// POST /admin/proxy, and writing it as the local Xray sidecar's config.
package proxy

import (
	"fmt"
	"net/url"
	"strconv"
)

// ParsedVless is the subset of a vless:// link's fields needed to build
// an Xray VLESS+Reality outbound. Reality is the only security mode
// supported here on purpose -- it's the whole reason to self-host (no
// CDN/domain needed, and immune to the ASN-based blocking a shared
// vless-over-CDN subscription runs into for server-to-server traffic).
type ParsedVless struct {
	UUID        string
	Address     string
	Port        int
	Flow        string // e.g. "xtls-rprx-vision"
	ServerName  string // "sni" query param
	Fingerprint string // "fp" query param
	PublicKey   string // "pbk" query param
	ShortID     string // "sid" query param
}

// ParseVlessLink parses a link in the form produced by the ops runbook's
// step 5:
//
//	vless://<uuid>@<host>:<port>?security=reality&sni=...&fp=...&pbk=...&sid=...&flow=...
func ParseVlessLink(link string) (ParsedVless, error) {
	u, err := url.Parse(link)
	if err != nil {
		return ParsedVless{}, fmt.Errorf("parsing vless link: %w", err)
	}
	if u.Scheme != "vless" {
		return ParsedVless{}, fmt.Errorf("not a vless:// link (got scheme %q)", u.Scheme)
	}
	if u.User == nil || u.User.Username() == "" {
		return ParsedVless{}, fmt.Errorf("vless link is missing the UUID")
	}

	host := u.Hostname()
	if host == "" {
		return ParsedVless{}, fmt.Errorf("vless link is missing the server address")
	}
	if u.Port() == "" {
		return ParsedVless{}, fmt.Errorf("vless link is missing the port")
	}
	port, err := strconv.Atoi(u.Port())
	if err != nil {
		return ParsedVless{}, fmt.Errorf("vless link has an invalid port %q: %w", u.Port(), err)
	}

	q := u.Query()
	if security := q.Get("security"); security != "reality" {
		return ParsedVless{}, fmt.Errorf(
			"unsupported security %q (only \"reality\" is supported by this server)", security)
	}

	parsed := ParsedVless{
		UUID:        u.User.Username(),
		Address:     host,
		Port:        port,
		Flow:        q.Get("flow"),
		ServerName:  q.Get("sni"),
		Fingerprint: q.Get("fp"),
		PublicKey:   q.Get("pbk"),
		ShortID:     q.Get("sid"),
	}
	if parsed.ServerName == "" {
		return ParsedVless{}, fmt.Errorf("vless link is missing the \"sni\" query parameter (required for reality)")
	}
	if parsed.PublicKey == "" {
		return ParsedVless{}, fmt.Errorf("vless link is missing the \"pbk\" query parameter (required for reality)")
	}
	return parsed, nil
}
