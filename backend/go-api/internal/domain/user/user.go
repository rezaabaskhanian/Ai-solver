// Package user is the domain layer for MathMotion's account concept.
//
// Unlike Shadowing-backend's user domain (phone+password, JWT
// login), MathMotion's PRD section 39 explicitly says to avoid
// complex auth in the MVP, so a User here is identified by a
// device ID instead of credentials — see
// internal/delivery/middleware/device.go for how that's resolved
// per request. The layering (domain/service/repository/delivery)
// otherwise mirrors Shadowing-backend on purpose.
package user

import (
	"errors"
	"time"
)

var (
	ErrNotFound   = errors.New("user not found")
	ErrPhoneTaken = errors.New("phone number already registered")
)

type User struct {
	ID       string
	DeviceID string
	// Code is the short id the app shows in Settings — what a user reads
	// out to the operator so the admin panel can find them.
	Code string
	// Name is the nickname chosen at sign-up; Phone is set once the
	// device's user signed up (migration 008). PasswordHash (bcrypt) never
	// leaves the server.
	Name         *string
	Email        *string
	Phone        *string
	PasswordHash string
	// IsPremium is the old one-time lifetime unlock; PremiumUntil is a
	// time-limited plan (Cafe Bazaar monthly etc., or days granted from the
	// admin panel); IsUnlimited lifts every limit. See HasPremium.
	IsPremium    bool
	PremiumUntil *time.Time
	IsUnlimited  bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// HasPremium reports whether any kind of Premium is active at now.
func (u User) HasPremium(now time.Time) bool {
	return u.IsPremium || u.IsUnlimited || (u.PremiumUntil != nil && u.PremiumUntil.After(now))
}

func NewUser(id, deviceID string) User {
	now := time.Now()
	return User{
		ID:        id,
		DeviceID:  deviceID,
		CreatedAt: now,
		UpdatedAt: now,
	}
}
