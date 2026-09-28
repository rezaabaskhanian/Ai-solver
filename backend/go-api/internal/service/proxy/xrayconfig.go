package proxy

// This is the client-side mirror of the ops runbook's server config
// (step 4): a local SOCKS5 inbound -- what internal/pkg/outboundhttp's
// AI_OUTBOUND_PROXY dials into -- forwarding everything through a single
// VLESS+Reality outbound to the operator's own Xray server. Modeled as
// typed structs (not a generic map[string]any) so a typo in a field name
// fails to compile instead of silently producing JSON Xray ignores.

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
	Network         string              `json:"network"`
	Security        string              `json:"security"`
	RealitySettings xrayRealitySettings `json:"realitySettings"`
}

type xrayRealitySettings struct {
	ServerName  string `json:"serverName"`
	Fingerprint string `json:"fingerprint"`
	PublicKey   string `json:"publicKey"`
	ShortID     string `json:"shortId"`
}

// defaultFingerprint matches the ops runbook's own suggested value
// (step 5's example link uses "fp=chrome") -- a real TLS ClientHello
// fingerprint is required for Reality to look like ordinary browser
// traffic, so this is the fallback when a link omits "fp" rather than
// leaving the field empty.
const defaultFingerprint = "chrome"

// buildXrayClientConfig renders the Xray sidecar's full config.json from
// an already-validated ParsedVless.
func buildXrayClientConfig(v ParsedVless) xrayClientConfig {
	fingerprint := v.Fingerprint
	if fingerprint == "" {
		fingerprint = defaultFingerprint
	}

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
				StreamSettings: &xrayStreamSettings{
					Network:  "tcp",
					Security: "reality",
					RealitySettings: xrayRealitySettings{
						ServerName:  v.ServerName,
						Fingerprint: fingerprint,
						PublicKey:   v.PublicKey,
						ShortID:     v.ShortID,
					},
				},
			},
		},
	}
}
