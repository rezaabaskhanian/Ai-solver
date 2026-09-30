// Package accounthandler is /api/v1/auth/* and /api/v1/users/profile —
// the sign-up / login endpoints LingoFlow has under /v1/users/*.
package accounthandler

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"mathmotion/go-api/internal/delivery/middleware"
	"mathmotion/go-api/internal/pkg/errorhandling"
	accountservice "mathmotion/go-api/internal/service/account"
)

type Handler struct {
	accountSvc accountservice.Service
}

func New(accountSvc accountservice.Service) Handler {
	return Handler{accountSvc: accountSvc}
}

// SetRoutes registers the auth endpoints. They're public (you log in to
// get a token) but still rate limited; profile goes through the Device
// middleware like every other /api/v1 route, so it reads the token.
func (h Handler) SetRoutes(e *echo.Echo, rateLimit echo.MiddlewareFunc, device echo.MiddlewareFunc) {
	auth := e.Group("/api/v1/auth", rateLimit)
	auth.POST("/otp/send", h.SendOTP)
	auth.POST("/otp/verify", h.VerifyOTP)
	auth.POST("/register", h.Register)
	auth.POST("/login", h.Login)
	auth.POST("/refresh", h.Refresh)
	auth.POST("/reset-pass", h.ResetPassword)

	e.GET("/api/v1/users/profile", h.Profile, rateLimit, device)
}

type otpRequest struct {
	Phone   string `json:"phone"`
	Purpose string `json:"purpose"`
	Code    string `json:"code"`
}

func invalidBody(c echo.Context) error {
	return c.JSON(http.StatusBadRequest, map[string]string{
		"error": "invalid_body", "message": "درخواست نامعتبر است",
	})
}

// SendOTP handles POST /api/v1/auth/otp/send {phone, purpose: register|reset}.
func (h Handler) SendOTP(c echo.Context) error {
	var req otpRequest
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	if err := h.accountSvc.SendOTP(c.Request().Context(), req.Phone, req.Purpose); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "کد تایید ارسال شد"})
}

// VerifyOTP handles POST /api/v1/auth/otp/verify {phone, purpose, code} →
// {token}, the one-time proof register / reset-pass need.
func (h Handler) VerifyOTP(c echo.Context) error {
	var req otpRequest
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	token, err := h.accountSvc.VerifyOTP(c.Request().Context(), req.Phone, req.Purpose, req.Code)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]string{"token": token})
}

// Register handles POST /api/v1/auth/register {nickname, phone, password,
// otp_token}. X-Device-Id picks the anonymous user that becomes the account.
func (h Handler) Register(c echo.Context) error {
	var req accountservice.RegisterRequest
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	res, err := h.accountSvc.Register(c.Request().Context(), c.Request().Header.Get("X-Device-Id"), req)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusCreated, res)
}

type loginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

// Login handles POST /api/v1/auth/login {phone, password}.
func (h Handler) Login(c echo.Context) error {
	var req loginRequest
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	res, err := h.accountSvc.Login(c.Request().Context(), req.Phone, req.Password)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, res)
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// Refresh handles POST /api/v1/auth/refresh {refresh_token}. Not behind
// the Device middleware: when it's called the access token has usually
// just expired.
func (h Handler) Refresh(c echo.Context) error {
	var req refreshRequest
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	res, err := h.accountSvc.Refresh(c.Request().Context(), req.RefreshToken)
	if err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, res)
}

// ResetPassword handles POST /api/v1/auth/reset-pass {phone, otp_token, password}.
func (h Handler) ResetPassword(c echo.Context) error {
	var req accountservice.ResetPasswordRequest
	if err := c.Bind(&req); err != nil {
		return invalidBody(c)
	}
	if err := h.accountSvc.ResetPassword(c.Request().Context(), req); err != nil {
		return errorhandling.ErrorHandling(err, c)
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "رمز عبور تغییر کرد"})
}

// Profile handles GET /api/v1/users/profile. Only a logged-in request (a
// valid access token) has an account; an anonymous device gets 401 so the
// app shows the login screen.
func (h Handler) Profile(c echo.Context) error {
	u := middleware.UserFromContext(c)
	if !middleware.IsLoggedInFromContext(c) || u.Phone == nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "unauthorized", "message": "لطفاً وارد حساب کاربری شو",
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"user": accountservice.ProfileOf(u)})
}
