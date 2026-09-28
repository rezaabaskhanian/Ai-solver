// Package outboundhttp builds the *http.Client every outbound call to a
// third-party AI provider (Claude Vision today, via
// internal/service/vision) goes through. Most deployments dial the
// provider directly; a server whose IP a provider blocks (see
// docs/xray-proxy-setup.md) instead routes through a local SOCKS5 proxy
// -- the Xray sidecar internal/service/proxy configures.
package outboundhttp

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/net/proxy"
)

const defaultTimeout = 30 * time.Second

// New returns http.DefaultClient when proxyURL is empty (the common
// case: dial the provider directly), or a client that tunnels every
// connection through the given SOCKS5 proxy (e.g. "socks5://xray:1080",
// the Xray sidecar's local inbound) otherwise.
func New(proxyURL string) (*http.Client, error) {
	if proxyURL == "" {
		return http.DefaultClient, nil
	}

	parsed, err := url.Parse(proxyURL)
	if err != nil {
		return nil, fmt.Errorf("parsing outbound proxy url: %w", err)
	}
	if parsed.Scheme != "socks5" {
		return nil, fmt.Errorf("unsupported outbound proxy scheme %q (only socks5 is supported)", parsed.Scheme)
	}
	if parsed.Host == "" {
		return nil, fmt.Errorf("outbound proxy url %q is missing a host:port", proxyURL)
	}

	dialer, err := proxy.SOCKS5("tcp", parsed.Host, nil, proxy.Direct)
	if err != nil {
		return nil, fmt.Errorf("creating socks5 dialer for %s: %w", parsed.Host, err)
	}
	// proxy.SOCKS5 always returns a proxy.ContextDialer in practice (the
	// underlying type supports it) -- this check exists so a future
	// golang.org/x/net change that stopped satisfying it would fail
	// loudly here instead of silently dialing without ctx cancellation.
	contextDialer, ok := dialer.(proxy.ContextDialer)
	if !ok {
		return nil, fmt.Errorf("socks5 dialer for %s does not support context-aware dialing", parsed.Host)
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return contextDialer.DialContext(ctx, network, addr)
		},
	}

	return &http.Client{Transport: transport, Timeout: defaultTimeout}, nil
}
