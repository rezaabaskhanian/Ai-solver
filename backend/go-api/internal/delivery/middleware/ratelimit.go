package middleware

import (
	"net/http"
	"sync"

	"github.com/labstack/echo/v4"
	"golang.org/x/time/rate"
)

// RateLimiter is a simple in-memory per-IP token bucket (PRD section
// 23 "API rate limiting"). Good enough for a single-instance MVP;
// swap for a shared store (Redis) once the API runs on more than one
// node, since this state doesn't survive a restart or scale-out.
type RateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	rps      rate.Limit
	burst    int
}

func NewRateLimiter(rps float64, burst int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rps:      rate.Limit(rps),
		burst:    burst,
	}
}

func (rl *RateLimiter) limiterFor(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	l, ok := rl.limiters[key]
	if !ok {
		l = rate.NewLimiter(rl.rps, rl.burst)
		rl.limiters[key] = l
	}
	return l
}

func (rl *RateLimiter) Middleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		if !rl.limiterFor(c.RealIP()).Allow() {
			return c.JSON(http.StatusTooManyRequests, map[string]string{
				"error":   "rate_limited",
				"message": "Too many requests, please slow down.",
			})
		}
		return next(c)
	}
}
