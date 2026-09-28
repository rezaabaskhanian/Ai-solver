#!/bin/sh
# Runs Xray as a client-side sidecar: exposes a local SOCKS5 inbound
# (what internal/pkg/outboundhttp's AI_OUTBOUND_PROXY dials into) that
# tunnels out through whatever VLESS+Reality server go-api's
# POST /admin/proxy (internal/service/proxy) last wrote to
# $XRAY_CONFIG_PATH, on a volume shared between the two containers.
#
# There's no config at image build time -- an operator hasn't run the
# runbook yet -- so this starts from a direct-passthrough placeholder and
# swaps in the real config the moment it appears, without a container
# restart. See docs/xray-proxy-setup.md.
set -eu

CONFIG_PATH="${XRAY_CONFIG_PATH:-/etc/xray/config.json}"
PLACEHOLDER_PATH="/etc/xray/placeholder.json"
POLL_INTERVAL_SECONDS=2

cat > "$PLACEHOLDER_PATH" <<'EOF'
{
  "log": { "loglevel": "warning" },
  "inbounds": [
    { "listen": "0.0.0.0", "port": 1080, "protocol": "socks", "settings": { "udp": true } }
  ],
  "outbounds": [
    { "protocol": "freedom", "tag": "direct" }
  ]
}
EOF

XRAY_PID=""
LAST_MTIME=""

mtime_of() {
  # BusyBox/GNU stat (Linux) vs BSD stat (only relevant for local
  # non-Docker testing on macOS) take different flags -- try both.
  stat -c %Y "$1" 2>/dev/null || stat -f %m "$1" 2>/dev/null || echo ""
}

start_xray() {
  echo "watch.sh: starting xray with $1"
  xray run -c "$1" &
  XRAY_PID=$!
}

stop_xray() {
  if [ -n "$XRAY_PID" ] && kill -0 "$XRAY_PID" 2>/dev/null; then
    echo "watch.sh: stopping xray (pid $XRAY_PID)"
    kill "$XRAY_PID" 2>/dev/null || true
    wait "$XRAY_PID" 2>/dev/null || true
  fi
}

trap 'stop_xray; exit 0' TERM INT

active_config="$PLACEHOLDER_PATH"
if [ -f "$CONFIG_PATH" ]; then
  active_config="$CONFIG_PATH"
  LAST_MTIME="$(mtime_of "$CONFIG_PATH")"
fi
start_xray "$active_config"

while true; do
  sleep "$POLL_INTERVAL_SECONDS"

  if [ -f "$CONFIG_PATH" ]; then
    mtime="$(mtime_of "$CONFIG_PATH")"
    if [ "$mtime" != "$LAST_MTIME" ]; then
      LAST_MTIME="$mtime"
      # Validate before swapping in: a config that fails to parse would
      # otherwise crash-loop the whole sidecar instead of surfacing as a
      # clean "connected: false" from POST /admin/proxy.
      if xray run -test -c "$CONFIG_PATH" >/tmp/xray-test.log 2>&1; then
        stop_xray
        active_config="$CONFIG_PATH"
        start_xray "$active_config"
      else
        echo "watch.sh: new config at $CONFIG_PATH failed validation, keeping the previous one running:"
        cat /tmp/xray-test.log
      fi
    fi
  fi

  if ! kill -0 "$XRAY_PID" 2>/dev/null; then
    echo "watch.sh: xray process died unexpectedly, restarting with $active_config"
    start_xray "$active_config"
  fi
done
