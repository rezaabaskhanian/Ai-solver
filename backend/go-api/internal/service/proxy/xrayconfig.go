package proxy

import "strings"

// This is the client-side Xray config: a local SOCKS5 inbound -- what
// internal/pkg/outboundhttp's AI_OUTBOUND_PROXY dials into -- forwarding
// everything through a single VLESS outbound (Reality or TLS, over any of
// the supported transports). Modeled as typed structs (not a generic
// map[string]any) so a typo in a field name fails to compile instead of
// silently producing JSON Xray ignores.

const socksInboundPort = 1080

type xrayClientConfig struct {
	Log       xrayLog        `json:"log"`
	Inbounds  []xrayInbound  `json:"inbounds"`
	Outbounds []xrayOutbound `json:"outbounds"`
}

type xrayLog struct {
	LogLevel string `json:"loglevel"`
}

type xrayInbound struct {
	Listen   string             `json:"listen"`
	Port     int                `json:"port"`
	Protocol string             `json:"protocol"`
	Settings xraySocksInSetting `json:"settings"`
}

type xraySocksInSetting struct {
	UDP bool `json:"udp"`
}

type xrayOutbound struct {
	Protocol       string              `json:"protocol"`
	Settings       *xrayVlessSettings  `json:"settings,omitempty"`
	StreamSettings *xrayStreamSettings `json:"streamSettings,omitempty"`
	Tag            string              `json:"tag,omitempty"`
}

type xrayVlessSettings struct {
	Vnext []xrayVnext `json:"vnext"`
}

type xrayVnext struct {
	Address string     `json:"address"`
	Port    int        `json:"port"`
	Users   []xrayUser `json:"users"`
}

type xrayUser struct {
	ID         string `json:"id"`
	Flow       string `json:"flow,omitempty"`
	Encryption string `json:"encryption"`
}

type xrayStreamSettings struct {
	Network             string                `json:"network"`
	Security            string                `json:"security"`
	RealitySettings     *xrayRealitySettings  `json:"realitySettings,omitempty"`
	TLSSettings         *xrayTLSSettings      `json:"tlsSettings,omitempty"`
	WSSettings          *xrayHostPathSettings `json:"wsSettings,omitempty"`
	HTTPUpgradeSettings *xrayHostPathSettings `json:"httpupgradeSettings,omitempty"`
	XHTTPSettings       *xrayXHTTPSettings    `json:"xhttpSettings,omitempty"`
	GRPCSettings        *xrayGRPCSettings     `json:"grpcSettings,omitempty"`
}

type xrayRealitySettings struct {
	ServerName  string `json:"serverName"`
	Fingerprint string `json:"fingerprint"`
	PublicKey   string `json:"publicKey"`
	ShortID     string `json:"shortId"`
}

type xrayTLSSettings struct {
	ServerName    string   `json:"serverName,omitempty"`
	Fingerprint   string   `json:"fingerprint,omitempty"`
	ALPN          []string `json:"alpn,omitempty"`
	AllowInsecure bool     `json:"allowInsecure,omitempty"`
}

type xrayHostPathSettings struct {
	Host string `json:"host,omitempty"`
	Path string `json:"path,omitempty"`
}

type xrayXHTTPSettings struct {
	Host string `json:"host,omitempty"`
	Path string `json:"path,omitempty"`
	Mode string `json:"mode,omitempty"`
}

type xrayGRPCSettings struct {
	ServiceName string `json:"serviceName"`
	MultiMode   bool   `json:"multiMode,omitempty"`
}

// defaultFingerprint is the fallback when a link omits "fp": a real
// browser TLS ClientHello fingerprint is required for Reality to look like
// ordinary traffic, and is harmless for plain TLS too.
const defaultFingerprint = "chrome"

// buildXrayClientConfig renders the Xray sidecar's full config.json from
// an already-validated ParsedVless.
func buildXrayClientConfig(v ParsedVless) xrayClientConfig {
	return xrayClientConfig{
		Log: xrayLog{LogLevel: "warning"},
		Inbounds: []xrayInbound{
			{
				Listen:   "0.0.0.0",
				Port:     socksInboundPort,
				Protocol: "socks",
				Settings: xraySocksInSetting{UDP: true},
			},
		},
		Outbounds: []xrayOutbound{
			{
				Protocol: "vless",
				Tag:      "proxy",
				Settings: &xrayVlessSettings{
					Vnext: []xrayVnext{
						{
							Address: v.Address,
							Port:    v.Port,
							Users: []xrayUser{
								{ID: v.UUID, Flow: v.Flow, Encryption: "none"},
							},
						},
					},
				},
				StreamSettings: buildStreamSettings(v),
			},
		},
	}
}

func buildStreamSettings(v ParsedVless) *xrayStreamSettings {
	fingerprint := v.Fingerprint
	if fingerprint == "" {
		fingerprint = defaultFingerprint
	}

	s := &xrayStreamSettings{Network: v.Network, Security: v.Security}

	switch v.Security {
	case "reality":
		s.RealitySettings = &xrayRealitySettings{
			ServerName:  v.ServerName,
			Fingerprint: fingerprint,
			PublicKey:   v.PublicKey,
			ShortID:     v.ShortID,
		}
	case "tls":
		s.TLSSettings = &xrayTLSSettings{
			ServerName:    v.ServerName,
			Fingerprint:   fingerprint,
			ALPN:          splitALPN(v.ALPN),
			AllowInsecure: v.AllowInsecure,
		}
	}

	switch v.Network {
	case "ws":
		s.WSSettings = &xrayHostPathSettings{Host: v.Host, Path: v.Path}
	case "httpupgrade":
		s.HTTPUpgradeSettings = &xrayHostPathSettings{Host: v.Host, Path: v.Path}
	case "xhttp":
		s.XHTTPSettings = &xrayXHTTPSettings{Host: v.Host, Path: v.Path, Mode: v.Mode}
	case "grpc":
		s.GRPCSettings = &xrayGRPCSettings{ServiceName: v.ServiceName, MultiMode: v.Mode == "multi"}
	}

	return s
}

func splitALPN(alpn string) []string {
	if alpn == "" {
		return nil
	}
	var out []string
	for _, p := range strings.Split(alpn, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
