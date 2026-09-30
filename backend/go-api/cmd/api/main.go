package main

import (
	"bufio"
	"context"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"mathmotion/go-api/internal/config"
	"mathmotion/go-api/internal/delivery/httpserver"
	"mathmotion/go-api/internal/pkg/outboundhttp"
	"mathmotion/go-api/internal/repository/migrator"
	"mathmotion/go-api/internal/repository/postgres"
	postgresaiusage "mathmotion/go-api/internal/repository/postgres/aiusage"
	postgresbilling "mathmotion/go-api/internal/repository/postgres/billing"
	postgreslanding "mathmotion/go-api/internal/repository/postgres/landing"
	postgresotp "mathmotion/go-api/internal/repository/postgres/otp"
	postgresproblem "mathmotion/go-api/internal/repository/postgres/problem"
	postgressettings "mathmotion/go-api/internal/repository/postgres/settings"
	postgresusage "mathmotion/go-api/internal/repository/postgres/usage"
	postgresuser "mathmotion/go-api/internal/repository/postgres/user"
	accountservice "mathmotion/go-api/internal/service/account"
	aiusageservice "mathmotion/go-api/internal/service/aiusage"
	authservice "mathmotion/go-api/internal/service/auth"
	billingservice "mathmotion/go-api/internal/service/billing"
	landingservice "mathmotion/go-api/internal/service/landing"
	otpservice "mathmotion/go-api/internal/service/otp"
	problemservice "mathmotion/go-api/internal/service/problem"
	proxyservice "mathmotion/go-api/internal/service/proxy"
	quotaservice "mathmotion/go-api/internal/service/quota"
	settingsservice "mathmotion/go-api/internal/service/settings"
	smsservice "mathmotion/go-api/internal/service/sms"
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

// splitCSV turns "a, b,,c" into [a b c].
func splitCSV(v string) []string {
	var out []string
	for _, part := range strings.Split(v, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
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
			PackageName: getEnv("BAZAAR_PACKAGE_NAME", "com.mathmotion"),
			ProductID:   getEnv("BAZAAR_PRODUCT_ID", "mathmotion_premium_unlock"),
		},
		Outbound: config.Outbound{
			ProxyURL: getEnv("AI_OUTBOUND_PROXY", ""),
		},
		Proxy: config.Proxy{
			XrayConfigPath: getEnv("XRAY_CONFIG_PATH", "/etc/xray/config.json"),
		},
		Admin: config.Admin{
			// PROXY_ADMIN_TOKEN is the name this token had before the admin
			// panel existed (it only guarded POST /admin/proxy) — still
			// honored so existing deployments keep working.
			Token:        getEnv("ADMIN_TOKEN", getEnv("PROXY_ADMIN_TOKEN", "")),
			PanelOrigins: splitCSV(getEnv("ADMIN_PANEL_ORIGINS", "http://localhost:3000")),
		},
	}

	if cfg.Admin.Token == "" {
		log.Println("warning: ADMIN_TOKEN not set — the admin panel and every /admin/* endpoint " +
			"will return 503 until it's configured (see backend/admin-panel/README.md)")
	}

	// Production skips migrations by default (an operator may prefer to run
	// them by hand); RUN_MIGRATIONS=true opts in — docker-compose.prod.yaml
	// sets it, since sql-migrate only applies what hasn't run yet.
	dbMigrator := migrator.New(cfg.Postgres)
	if os.Getenv("ENV") != "production" || os.Getenv("RUN_MIGRATIONS") == "true" {
		dbMigrator.Up()
	}

	db := postgres.New(cfg.Postgres)

	userRepo := postgresuser.New(db.Pool)
	problemRepo := postgresproblem.New(db.Pool)
	billingRepo := postgresbilling.New(db.Pool)
	settingsRepo := postgressettings.New(db.Pool)
	usageRepo := postgresusage.New(db.Pool)

	// AI provider/keys/models and the last Xray link are editable from the
	// admin panel at runtime; anything not saved there falls back to .env.
	settingsSvc := settingsservice.New(settingsRepo)
	if err := settingsSvc.LoadAll(context.Background()); err != nil {
		log.Printf("warning: loading app_settings failed, using .env values only until the next refresh: %v", err)
	}
	go settingsSvc.StartAutoRefresh(context.Background(), 0)

	userSvc := userservice.New(userRepo)
	mathEngine := problemservice.NewMathEngineClient(cfg.MathEngineURL)
	// Usage limits (free daily/lifetime, Premium daily scans) are read
	// from settingsSvc on every request — editable in the admin panel.
	quotaSvc := quotaservice.New(usageRepo, settingsSvc)
	problemSvc := problemservice.New(problemRepo, mathEngine, quotaSvc)
	// The Pishkhan API token is read from settingsSvc on every purchase, so
	// saving it in the admin panel works without a restart.
	bazaarClient := billingservice.NewBazaarClient(settingsSvc, nil)
	if !bazaarClient.Enabled() {
		log.Println("warning: BAZAAR_API_SECRET not set — purchases can't be verified until it's " +
			"saved in the admin panel («اشتراک‌ها») or .env (see mobile/MathMotion/APP.md)")
	}
	billingSvc := billingservice.New(billingRepo, bazaarClient, cfg.Billing.PackageName, cfg.Billing.ProductID)

	// Accounts (sign-up / login), as in LingoFlow: JWT access + refresh
	// tokens, and sms.ir codes for sign-up and password reset.
	jwtSignKey := getEnv("JWT_SIGN_KEY", "")
	if jwtSignKey == "" {
		if os.Getenv("ENV") == "production" {
			log.Fatal("JWT_SIGN_KEY must be set in production (a long random string: openssl rand -hex 32)")
		}
		jwtSignKey = "dev-only-insecure-jwt-key"
	}
	authSvc := authservice.New(authservice.Config{
		SignKey:    jwtSignKey,
		AccessTTL:  24 * time.Hour,
		RefreshTTL: 30 * 24 * time.Hour,
	})
	smsClient := smsservice.NewClient(settingsSvc, nil)
	if !smsClient.Enabled() {
		log.Println("warning: SMS_IR_API_KEY/SMS_IR_OTP_TEMPLATE_ID not set — sign-up and password " +
			"reset SMS codes can't be sent until they're saved in the admin panel or .env")
	}
	otpSvc := otpservice.New(postgresotp.New(db.Pool), smsClient)
	accountSvc := accountservice.New(userRepo, otpSvc, authSvc)

	// Vision calls (whichever provider AI_PROVIDER picks) go through
	// internal/pkg/outboundhttp so a server whose IP the provider blocks
	// can route through the Xray sidecar (see docs/xray-proxy-setup.md)
	// just by setting AI_OUTBOUND_PROXY — nothing else about
	// visionservice changes.
	outboundClient, err := outboundhttp.New(cfg.Outbound.ProxyURL)
	if err != nil {
		log.Fatalf("building outbound http client: %v", err)
	}
	visionClient := visionservice.NewClient(settingsSvc, outboundClient)
	// Every scan's cost → the admin panel's «هزینه‌ی هوش مصنوعی» report.
	aiUsageSvc := aiusageservice.New(postgresaiusage.New(db.Pool), settingsSvc)
	visionSvc := visionservice.New(visionClient, quotaSvc).WithUsageRecorder(aiUsageSvc)
	if !visionClient.Enabled() {
		log.Printf("warning: no API key for AI provider %q — POST /api/v1/problems/recognize "+
			"(camera-based Scan Problem) will fail until one is set from the admin panel or .env",
			visionClient.ActiveProvider())
	}

	proxySvc := proxyservice.New(cfg.Proxy.XrayConfigPath, cfg.Outbound.ProxyURL)

	// The mathmotion.ir landing content, and where admin-uploaded images
	// are stored (a volume in production so they survive redeploys).
	landingSvc := landingservice.New(postgreslanding.New(db.Pool))
	uploadDir := getEnv("UPLOAD_DIR", "uploads")

	httpserver.New(cfg, userSvc, problemSvc, billingSvc, visionSvc, visionClient, proxySvc, settingsSvc, quotaSvc,
		accountSvc, authSvc, landingSvc, aiUsageSvc, uploadDir).Server()
}
