# Client-side Xray sidecar for go-api's outbound AI calls (see
# docs/xray-proxy-setup.md and watch.sh). Same base image LingoFlow's
# sidecar uses on the shared aramina server — already cached there, and
# Docker Hub/GitHub downloads from that (Iranian) server are very slow.
FROM teddysun/xray:latest

# The image ships a default *server* config; on a fresh named volume at
# /etc/xray Docker would copy it in, and watch.sh would run it instead of
# the SOCKS5 passthrough placeholder — so AI calls would fail until a
# vless link is set. Start from nothing instead.
RUN rm -f /etc/xray/config.json

COPY watch.sh /usr/local/bin/watch.sh
RUN chmod +x /usr/local/bin/watch.sh

ENV XRAY_CONFIG_PATH=/etc/xray/config.json

EXPOSE 1080
ENTRYPOINT ["/usr/local/bin/watch.sh"]
