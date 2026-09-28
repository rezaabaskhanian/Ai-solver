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

import "time"

type User struct {
	ID        string
	DeviceID  string
	Name      *string
	Email     *string
	IsPremium bool
	CreatedAt time.Time
	UpdatedAt time.Time
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
