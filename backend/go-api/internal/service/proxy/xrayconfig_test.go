package proxy

import "testing"

func TestBuildXrayClientConfig(t *testing.T) {
	v := ParsedVless{
		UUID:        "11111111-2222-3333-4444-555555555555",
		Address:     "203.0.113.10",
		Port:        443,
		Flow:        "xtls-rprx-vision",
		Security:    "reality",
		Network:     "tcp",
		ServerName:  "www.microsoft.com",
		Fingerprint: "chrome",
		PublicKey:   "examplepublickey",
		ShortID:     "",
	}

	cfg := buildXrayClientConfig(v)

	if len(cfg.Inbounds) != 1 {
		t.Fatalf("expected exactly one inbound, got %d", len(cfg.Inbounds))
	}
	in := cfg.Inbounds[0]
	if in.Protocol != "socks" || in.Port != socksInboundPort || !in.Settings.UDP {
		t.Fatalf("unexpected inbound: %+v", in)
	}

	if len(cfg.Outbounds) != 1 {
		t.Fatalf("expected exactly one outbound, got %d", len(cfg.Outbounds))
	}
	out := cfg.Outbounds[0]
	if out.Protocol != "vless" {
		t.Fatalf("expected vless outbound, got %q", out.Protocol)
	}
	if out.StreamSettings == nil || out.StreamSettings.Security != "reality" {
		t.Fatalf("expected reality stream settings, got %+v", out.StreamSettings)
	}
	if out.StreamSettings.RealitySettings.PublicKey != v.PublicKey {
		t.Fatalf("public key not passed through: %+v", out.StreamSettings.RealitySettings)
	}
	if out.Settings == nil || len(out.Settings.Vnext) != 1 {
		t.Fatalf("expected exactly one vnext entry: %+v", out.Settings)
	}
	vnext := out.Settings.Vnext[0]
	if vnext.Address != v.Address || vnext.Port != v.Port {
		t.Fatalf("vnext address/port not passed through: %+v", vnext)
	}
	if len(vnext.Users) != 1 || vnext.Users[0].ID != v.UUID || vnext.Users[0].Flow != v.Flow {
		t.Fatalf("user id/flow not passed through: %+v", vnext.Users)
	}
}

func TestBuildXrayClientConfig_TLSOverWebSocket(t *testing.T) {
	v := ParsedVless{
		UUID:       "uuid",
		Address:    "cdn.example.com",
		Port:       8443,
		Security:   "tls",
		Network:    "ws",
		ServerName: "cdn.example.com",
		ALPN:       "h2, http/1.1",
		Host:       "cdn.example.com",
		Path:       "/ws",
	}

	s := buildXrayClientConfig(v).Outbounds[0].StreamSettings

	if s.Network != "ws" || s.Security != "tls" {
		t.Fatalf("unexpected network/security: %+v", s)
	}
	if s.RealitySettings != nil {
		t.Fatalf("tls config must not carry reality settings: %+v", s.RealitySettings)
	}
	if s.TLSSettings == nil || s.TLSSettings.ServerName != "cdn.example.com" ||
		s.TLSSettings.Fingerprint != defaultFingerprint ||
		len(s.TLSSettings.ALPN) != 2 || s.TLSSettings.ALPN[1] != "http/1.1" {
		t.Fatalf("unexpected tls settings: %+v", s.TLSSettings)
	}
	if s.WSSettings == nil || s.WSSettings.Host != v.Host || s.WSSettings.Path != v.Path {
		t.Fatalf("unexpected ws settings: %+v", s.WSSettings)
	}
}

func TestBuildXrayClientConfig_DefaultsFingerprintWhenMissing(t *testing.T) {
	v := ParsedVless{
		UUID:       "uuid",
		Address:    "host",
		Port:       443,
		Security:   "reality",
		Network:    "tcp",
		ServerName: "example.com",
		PublicKey:  "pbk",
		// Fingerprint intentionally left empty.
	}

	cfg := buildXrayClientConfig(v)

	got := cfg.Outbounds[0].StreamSettings.RealitySettings.Fingerprint
	if got != defaultFingerprint {
		t.Fatalf("expected default fingerprint %q, got %q", defaultFingerprint, got)
	}
}
