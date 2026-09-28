# Client-side Xray sidecar for go-api's outbound AI calls (see
# docs/xray-proxy-setup.md and watch.sh). Built from the official release
# zip onto a plain Alpine base -- not a third-party prebuilt image --
# both to control provenance and to guarantee a real shell + curl exist
# for watch.sh, which a minimal "just the binary" image might not have.
FROM alpine:3.20 AS download
RUN apk add --no-cache curl unzip \
    && curl -fsSL -o /tmp/xray.zip \
       "https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip" \
    && unzip /tmp/xray.zip -d /tmp/xray

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=download /tmp/xray/xray /usr/local/bin/xray
COPY watch.sh /usr/local/bin/watch.sh
RUN chmod +x /usr/local/bin/xray /usr/local/bin/watch.sh

ENV XRAY_CONFIG_PATH=/etc/xray/config.json

EXPOSE 1080
ENTRYPOINT ["/usr/local/bin/watch.sh"]
