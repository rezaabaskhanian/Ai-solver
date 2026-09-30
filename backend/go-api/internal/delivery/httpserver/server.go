package httpserver

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"

	"mathmotion/go-api/internal/config"
	accounthandler "mathmotion/go-api/internal/delivery/httpserver/account"
	billinghandler "mathmotion/go-api/internal/delivery/httpserver/billing"
	problemhandler "mathmotion/go-api/internal/delivery/httpserver/problem"
	proxyhandler "mathmotion/go-api/internal/delivery/httpserver/proxy"
	settingshandler "mathmotion/go-api/internal/delivery/httpserver/settings"
	visionhandler "mathmotion/go-api/internal/delivery/httpserver/vision"
	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/locale"
	accountservice "mathmotion/go-api/internal/service/account"
	authservice "mathmotion/go-api/internal/service/auth"
	billingservice "mathmotion/go-api/internal/service/billing"
	problemservice "mathmotion/go-api/internal/service/problem"
	proxyservice "mathmotion/go-api/internal/service/proxy"
	quotaservice "mathmotion/go-api/internal/service/quota"
	settingsservice "mathmotion/go-api/internal/service/settings"
	userservice "mathmotion/go-api/internal/service/user"
	visionservice "mathmotion/go-api/internal/service/vision"
)

type Service struct {
	cfg             config.Config
	problemHandler  problemhandler.Handler
	billingHandler  billinghandler.Handler
	visionHandler   visionhandler.Handler
	proxyHandler    proxyhandler.Handler
	settingsHandler settingshandler.Handler
	accountHandler  accounthandler.Handler
	userSvc         userservice.Service
	authSvc         authservice.Service
	rateLimiter     *middleware.RateLimiter
}

func New(
	cfg config.Config,
	userSvc userservice.Service,
	problemSvc problemservice.Service,
	billingSvc billingservice.Service,
	visionSvc visionservice.Service,
	visionClient *visionservice.Client,
	proxySvc proxyservice.Service,
	settingsSvc *settingsservice.Service,
	quotaSvc quotaservice.Service,
	accountSvc accountservice.Service,
	authSvc authservice.Service,
) Service {
	return Service{
		cfg:             cfg,
		problemHandler:  problemhandler.New(problemSvc),
		billingHandler:  billinghandler.New(billingSvc),
		visionHandler:   visionhandler.New(visionSvc),
		proxyHandler:    proxyhandler.New(proxySvc, settingsSvc),
		settingsHandler: settingshandler.New(settingsSvc, visionClient, quotaSvc),
		accountHandler:  accounthandler.New(accountSvc),
		userSvc:         userSvc,
		authSvc:         authSvc,
		rateLimiter:     middleware.NewRateLimiter(cfg.RateLimit.RPS, cfg.RateLimit.Burst),
	}
}

func (s Service) Server() {
	e := echo.New()

	e.Use(echomw.Logger())
	e.Use(echomw.Recover())
	// The mobile client's UI language (Accept-Language) → request context,
	// read by the math engine client to word step explanations.
	e.Use(locale.Middleware)
	// Only the admin panel (a browser app on another origin) needs CORS;
	// the mobile client sends no Origin header, so this doesn't affect it.
	if len(s.cfg.Admin.PanelOrigins) > 0 {
		e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
			AllowOrigins: s.cfg.Admin.PanelOrigins,
			AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
			AllowHeaders: []string{echo.HeaderAuthorization, echo.HeaderContentType},
		}))
	}

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// /api/v1/* resolves a device-scoped user (no login flow in MVP —
	// see internal/delivery/middleware/device.go) and is rate limited;
	// /health stays outside both so liveness checks are cheap.
	// A login token, when sent, identifies the account instead of the device.
	device := middleware.Device(s.userSvc, s.authSvc)
	s.problemHandler.SetProblemRoutes(e, s.rateLimiter.Middleware, device)
	s.billingHandler.SetBillingRoutes(e, s.rateLimiter.Middleware, device)
	s.visionHandler.SetVisionRoutes(e, s.rateLimiter.Middleware, device)
	s.accountHandler.SetRoutes(e, s.rateLimiter.Middleware, device)

	// Operator-only (the admin panel), no device resolution or rate
	// limiting — gated by a static bearer token instead (see middleware.Admin).
	admin := e.Group("/admin", middleware.Admin(s.cfg.Admin.Token))
	s.proxyHandler.SetProxyRoutes(admin)
	s.settingsHandler.SetSettingsRoutes(admin)
	s.billingHandler.SetAdminRoutes(admin)

	e.Logger.Fatal(e.Start(fmt.Sprintf(":%s", s.cfg.HttpServer.Port)))
}
