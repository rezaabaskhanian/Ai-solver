package proxy

import "testing"

const validLink = "vless://11111111-2222-3333-4444-555555555555@203.0.113.10:443" +
	"?security=reality&sni=www.microsoft.com&fp=chrome&pbk=examplepublickey" +
	"&sid=&type=tcp&flow=xtls-rprx-vision#shadowing-outbound"

func TestParseVlessLink_Valid(t *testing.T) {
	parsed, err := ParseVlessLink(validLink)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := ParsedVless{
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
	if parsed != want {
		t.Fatalf("got %+v, want %+v", parsed, want)
	}
}

func TestParseVlessLink_TLSOverWebSocket(t *testing.T) {
	link := "vless://11111111-2222-3333-4444-555555555555@cdn.example.com:8443" +
		"?encryption=none&security=tls&sni=cdn.example.com&fp=chrome&alpn=h2%2Chttp%2F1.1" +
		"&type=ws&host=cdn.example.com&path=%2Fws%3Fed%3D2048#cdn"

	parsed, err := ParseVlessLink(link)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := ParsedVless{
		UUID:        "11111111-2222-3333-4444-555555555555",
		Address:     "cdn.example.com",
		Port:        8443,
		Security:    "tls",
		Network:     "ws",
		ServerName:  "cdn.example.com",
		Fingerprint: "chrome",
		ALPN:        "h2,http/1.1",
		Host:        "cdn.example.com",
		Path:        "/ws?ed=2048",
	}
	if parsed != want {
		t.Fatalf("got %+v, want %+v", parsed, want)
	}
}

func TestParseVlessLink_TLSDefaultsSNIToHost(t *testing.T) {
	parsed, err := ParseVlessLink("vless://uuid@1.2.3.4:443?security=tls&type=ws&host=front.example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if parsed.ServerName != "front.example.com" {
		t.Fatalf("expected sni to fall back to host, got %q", parsed.ServerName)
	}
}

func TestParseVlessLink_Errors(t *testing.T) {
	cases := map[string]string{
		"wrong scheme":        "vmess://uuid@host:443?security=reality&sni=a&pbk=b",
		"missing uuid":        "vless://@host:443?security=reality&sni=a&pbk=b",
		"missing host":        "vless://uuid@:443?security=reality&sni=a&pbk=b",
		"missing port":        "vless://uuid@host?security=reality&sni=a&pbk=b",
		"invalid port":        "vless://uuid@host:notaport?security=reality&sni=a&pbk=b",
		"unknown security":    "vless://uuid@host:443?security=xtls&sni=a&pbk=b",
		"unsupported network": "vless://uuid@host:443?security=tls&type=kcp",
		"tcp http header":     "vless://uuid@host:443?security=none&type=tcp&headerType=http",
		"missing sni":         "vless://uuid@host:443?security=reality&pbk=b",
		"missing pbk":         "vless://uuid@host:443?security=reality&sni=a",
	}

	for name, link := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := ParseVlessLink(link); err == nil {
				t.Fatalf("expected an error for %q", link)
			}
		})
	}
}

func TestParseVlessLink_UnparseableURL(t *testing.T) {
	if _, err := ParseVlessLink("://not-a-url"); err == nil {
		t.Fatalf("expected an error for an unparseable url")
	}
}
