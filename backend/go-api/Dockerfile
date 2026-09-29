# Base images match LingoFlow's (already cached on the shared aramina
# server, where Docker Hub pulls are very slow).
# REGISTRY lets the aramina server pull base images through Arvan's
# Docker Hub mirror (DOCKER_REGISTRY=docker.arvancloud.ir in .env) —
# direct Docker Hub pulls from there crawl at a few KB/s.
ARG REGISTRY=docker.io
FROM ${REGISTRY}/library/golang:1.25-alpine AS build

# proxy.golang.org / sum.golang.org often return 403 to the (Iranian)
# server's IP, and the Xray sidecar only covers go-api at runtime, not
# this build step — so use the goproxy.cn mirror, same as LingoFlow.
ENV GOPROXY=https://goproxy.cn,direct
ENV GOSUMDB=sum.golang.google.cn

WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
# Persistent module + compiler caches: on the 1-vCPU server a cold build
# recompiles every dependency (~6 min); with these only changed packages
# are rebuilt. Needs BuildKit (default in `docker compose build`).
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM ${REGISTRY}/library/alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /out/api /app/api

# migrator.go points at this path as a relative string (matches
# Shadowing-backend's Dockerfile pattern) — the compiled binary
# doesn't carry the migrations directory, so it must be copied
# alongside it and the container must run from /app.
COPY --from=build /src/internal/repository/postgres/migrations ./internal/repository/postgres/migrations

EXPOSE 8080
ENTRYPOINT ["/app/api"]
