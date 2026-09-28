package main

import (
	"bufio"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/anthropics/anthropic-sdk-go/option"

	"mathmotion/go-api/internal/config"
	"mathmotion/go-api/internal/delivery/httpserver"
	"mathmotion/go-api/internal/pkg/outboundhttp"
	"mathmotion/go-api/internal/repository/migrator"
	"mathmotion/go-api/internal/repository/postgres"
	postgresbilling "mathmotion/go-api/internal/repository/postgres/billing"
	postgresproblem "mathmotion/go-api/internal/repository/postgres/problem"
	postgresuser "mathmotion/go-api/internal/repository/postgres/user"
	billingservice "mathmotion/go-api/internal/service/billing"
	problemservice "mathmotion/go-api/internal/service/problem"
	proxyservice "mathmotion/go-api/internal/service/proxy"
	userservice "mathmotion/go-api/internal/service/user"
	visionservice "mathmotion/go-api/internal/service/vision"
)

// loadEnv reads KEY=VALUE lines from a .env file into the process
// environment. Mirrors Shadowing-backend's cmd/main.go loader exactly
// (no external dotenv dependency) — missing the file is fine, since
// docker-compose / a real shell env cover that case.
func loadEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
			os.Setenv(key, val)
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func main() {
	loadEnv(".env")

	cfg := config.Config{
		Postgres: postgres.Config{
			UserName: getEnv("DB_USERNAME", "mathmotion"),
			Password: getEnv("DB_PASSWORD", "mathmotion"),
			Port:     getEnvInt("DB_PORT", 5432),
			Host:     getEnv("DB_HOST", "localhost"),
			DBName:   getEnv("DB_NAME", "mathmotion"),
		},
		MathEngineURL: getEnv("MATH_ENGINE_URL", "http://localhost:8000"),
		HttpServer:    config.HttpServer{Port: getEnv("PORT", "8080")},
		RateLimit:     config.RateLimit{RPS: 5, Burst: 10},
		Billing: config.Billing{
			PackageName:    getEnv("BAZAAR_PACKAGE_NAME", "com.mathmotion"),
			ProductID:      getEnv("BAZAAR_PRODUCT_ID", "mathmotion_premium_unlock"),
			ClientID:       getEnv("BAZAAR_CLIENT_ID", ""),
			ClientSecret:   getEnv("BAZAAR_CLIENT_SECRET", ""),
			RefreshToken:   getEnv("BAZAAR_REFRESH_TOKEN", ""),
			FreeSolveLimit: getEnvInt("FREE_SOLVE_LIMIT", 5),
		},
		Vision: config.Vision{
			AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),
		},
		Outbound: config.Outbound{
			ProxyURL: getEnv("AI_OUTBOUND_PROXY", ""),
		},
		Proxy: config.Proxy{
			AdminToken:     getEnv("PROXY_ADMIN_TOKEN", ""),
			XrayConfigPath: getEnv("XRAY_CONFIG_PATH", "/etc/xray/config.json"),
		},
	}

	if cfg.Billing.ClientID == "" || cfg.Billing.ClientSecret == "" || cfg.Billing.RefreshToken == "" {
		log.Println("warning: BAZAAR_CLIENT_ID/BAZAAR_CLIENT_SECRET/BAZAAR_REFRESH_TOKEN not set — " +
			"the free-tier quota still applies, but POST /api/v1/billing/verify will fail until " +
			"these are configured from Cafe Bazaar's developer panel (see mobile/MathMotion/APP.md)")
	}

	if cfg.Vision.AnthropicAPIKey == "" {
		log.Println("warning: ANTHROPIC_API_KEY not set — POST /api/v1/problems/recognize " +
			"(camera-based Scan Problem) will fail until this is configured")
	}

	if cfg.Proxy.AdminToken == "" {
		log.Println("warning: PROXY_ADMIN_TOKEN not set — POST /admin/proxy will always return 503 " +
			"until it's configured (see docs/xray-proxy-setup.md)")
	}

	dbMigrator := migrator.New(cfg.Postgres)
	if os.Getenv("ENV") != "production" {
		dbMigrator.Up()
	}

	db := postgres.New(cfg.Postgres)

	userRepo := postgresuser.New(db.Pool)
	problemRepo := postgresproblem.New(db.Pool)
	billingRepo := postgresbilling.New(db.Pool)

	userSvc := userservice.New(userRepo)
	mathEngine := problemservice.NewMathEngineClient(cfg.MathEngineURL)
	problemSvc := problemservice.New(problemRepo, mathEngine, cfg.Billing.FreeSolveLimit)
	bazaarClient := billingservice.NewBazaarClient(cfg.Billing.ClientID, cfg.Billing.ClientSecret, cfg.Billing.RefreshToken)
	billingSvc := billingservice.New(billingRepo, bazaarClient, cfg.Billing.PackageName, cfg.Billing.ProductID)

	// Claude Vision calls go through internal/pkg/outboundhttp so a
	// server whose IP the provider blocks can route through the Xray
	// sidecar (see docs/xray-proxy-setup.md) just by setting
	// AI_OUTBOUND_PROXY — nothing else about visionservice changes.
	outboundClient, err := outboundhttp.New(cfg.Outbound.ProxyURL)
	if err != nil {
		log.Fatalf("building outbound http client: %v", err)
	}
	visionClient := visionservice.NewClient(cfg.Vision.AnthropicAPIKey, option.WithHTTPClient(outboundClient))
	visionSvc := visionservice.New(problemRepo, visionClient, cfg.Billing.FreeSolveLimit)

	proxySvc := proxyservice.New(cfg.Proxy.XrayConfigPath, cfg.Outbound.ProxyURL)

	httpserver.New(cfg, userSvc, problemSvc, billingSvc, visionSvc, proxySvc).Server()
}
