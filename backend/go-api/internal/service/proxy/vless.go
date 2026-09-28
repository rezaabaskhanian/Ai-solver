// Package proxy lets an operator point this server's outbound AI calls
// (internal/pkg/outboundhttp) at an Xray server over VLESS, when the
// provider blocks this server's own IP directly (see
// docs/xray-proxy-setup.md for the end-to-end runbook). This package only
// handles the client side: parsing the vless:// link an operator pastes
// into POST /admin/proxy, and writing it as the local Xray sidecar's
// config.
package proxy

import (
	"fmt"
	"net/url"
	"strconv"
)

// ParsedVless is the subset of a vless:// link's fields needed to build
// an Xray VLESS outbound. Both a self-hosted Reality server and the usual
// VLESS+TLS-over-CDN links (ws/grpc/httpupgrade/xhttp) are supported, so
// the same link another project on this server already uses works here.
type ParsedVless struct {
	UUID    string
	Address string
	Port    int
	Flow    string // e.g. "xtls-rprx-vision"

	Security string // "reality", "tls" or "none"
	Network  string // "tcp", "ws", "grpc", "httpupgrade" or "xhttp"

	ServerName    string // "sni" query param
	Fingerprint   string // "fp" query param
	ALPN          string // "alpn" query param, comma-separated
	AllowInsecure bool   // "allowInsecure" query param (tls only)

	PublicKey string // "pbk" query param (reality only)
	ShortID   string // "sid" query param (reality only)

	Host        string // "host" query param (ws/httpupgrade/xhttp)
	Path        string // "path" query param (ws/httpupgrade/xhttp)
	ServiceName string // "serviceName" query param (grpc)
	Mode        string // "mode" query param (grpc/xhttp)
}

// ParseVlessLink parses a standard vless:// share link, e.g.
//
//	vless://<uuid>@<host>:<port>?security=reality&sni=...&fp=...&pbk=...&sid=...&flow=...
//	vless://<uuid>@<host>:<port>?security=tls&sni=...&type=ws&host=...&path=/...
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
	parsed := ParsedVless{
		UUID:          u.User.Username(),
		Address:       host,
		Port:          port,
		Flow:          q.Get("flow"),
		ServerName:    q.Get("sni"),
		Fingerprint:   q.Get("fp"),
		ALPN:          q.Get("alpn"),
		AllowInsecure: q.Get("allowInsecure") == "1" || q.Get("allowInsecure") == "true",
		PublicKey:     q.Get("pbk"),
		ShortID:       q.Get("sid"),
		Host:          q.Get("host"),
		Path:          q.Get("path"),
		ServiceName:   q.Get("serviceName"),
		Mode:          q.Get("mode"),
	}

	switch network := q.Get("type"); network {
	case "", "tcp", "raw":
		parsed.Network = "tcp"
		if ht := q.Get("headerType"); ht != "" && ht != "none" {
			return ParsedVless{}, fmt.Errorf("unsupported tcp headerType %q", ht)
		}
	case "ws", "grpc", "httpupgrade":
		parsed.Network = network
	case "xhttp", "splithttp":
		parsed.Network = "xhttp"
	default:
		return ParsedVless{}, fmt.Errorf(
			"unsupported transport type %q (supported: tcp, ws, grpc, httpupgrade, xhttp)", network)
	}

	switch security := q.Get("security"); security {
	case "reality":
		parsed.Security = "reality"
		if parsed.ServerName == "" {
			return ParsedVless{}, fmt.Errorf("vless link is missing the \"sni\" query parameter (required for reality)")
		}
		if parsed.PublicKey == "" {
			return ParsedVless{}, fmt.Errorf("vless link is missing the \"pbk\" query parameter (required for reality)")
		}
	case "tls":
		parsed.Security = "tls"
		// Clients fall back to the Host header, then the server address,
		// when a TLS link has no explicit sni.
		if parsed.ServerName == "" {
			parsed.ServerName = parsed.Host
		}
		if parsed.ServerName == "" {
			parsed.ServerName = parsed.Address
		}
	case "", "none":
		parsed.Security = "none"
	default:
		return ParsedVless{}, fmt.Errorf(
			"unsupported security %q (supported: reality, tls, none)", security)
	}

	return parsed, nil
}
