FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM alpine:3.20
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
