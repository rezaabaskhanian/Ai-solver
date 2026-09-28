package postgresuser

import (
	"context"

	"github.com/google/uuid"

	domain "mathmotion/go-api/internal/domain/user"
)

// EnsureUser implements [userservice.Repository].
func (r DB) EnsureUser(ctx context.Context, deviceID string) (domain.User, error) {
	const query = `
		INSERT INTO users (id, device_id)
		VALUES ($1, $2)
		ON CONFLICT (device_id) DO UPDATE SET updated_at = now()
		RETURNING id, device_id, name, email, is_premium, created_at, updated_at
	`

	var u domain.User
	err := r.conn.QueryRow(ctx, query, uuid.NewString(), deviceID).Scan(
		&u.ID, &u.DeviceID, &u.Name, &u.Email, &u.IsPremium, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return domain.User{}, err
	}
	return u, nil
}
