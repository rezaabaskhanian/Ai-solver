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
		ServerName:  "www.microsoft.com",
		Fingerprint: "chrome",
		PublicKey:   "examplepublickey",
		ShortID:     "",
	}
	if parsed != want {
		t.Fatalf("got %+v, want %+v", parsed, want)
	}
}

func TestParseVlessLink_Errors(t *testing.T) {
	cases := map[string]string{
		"wrong scheme":      "vmess://uuid@host:443?security=reality&sni=a&pbk=b",
		"missing uuid":      "vless://@host:443?security=reality&sni=a&pbk=b",
		"missing host":      "vless://uuid@:443?security=reality&sni=a&pbk=b",
		"missing port":      "vless://uuid@host?security=reality&sni=a&pbk=b",
		"invalid port":      "vless://uuid@host:notaport?security=reality&sni=a&pbk=b",
		"non-reality security": "vless://uuid@host:443?security=tls&sni=a&pbk=b",
		"missing sni":       "vless://uuid@host:443?security=reality&pbk=b",
		"missing pbk":       "vless://uuid@host:443?security=reality&sni=a",
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
