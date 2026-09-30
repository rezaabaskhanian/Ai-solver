// Package postgresotp implements [otpservice.Repository] on otp_codes
// (migration 008).
package postgresotp

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	otpservice "mathmotion/go-api/internal/service/otp"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

func (r DB) Create(ctx context.Context, phone, purpose, code string, expiresAt time.Time) error {
	_, err := r.conn.Exec(ctx,
		`INSERT INTO otp_codes (phone, purpose, code, expires_at) VALUES ($1, $2, $3, $4)`,
		phone, purpose, code, expiresAt)
	if err != nil {
		return fmt.Errorf("inserting otp code: %w", err)
	}
	return nil
}

func (r DB) LatestPending(ctx context.Context, phone, purpose string) (otpservice.Code, error) {
	var c otpservice.Code
	err := r.conn.QueryRow(ctx, `
		SELECT id::text, code, attempts, expires_at, created_at
		  FROM otp_codes
		 WHERE phone = $1 AND purpose = $2 AND verified_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT 1
	`, phone, purpose).Scan(&c.ID, &c.Code, &c.Attempts, &c.ExpiresAt, &c.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return otpservice.Code{}, otpservice.ErrNotFound
	}
	if err != nil {
		return otpservice.Code{}, fmt.Errorf("reading otp code: %w", err)
	}
	return c, nil
}

func (r DB) IncrementAttempts(ctx context.Context, id string) error {
	_, err := r.conn.Exec(ctx, `UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("counting otp attempt: %w", err)
	}
	return nil
}

func (r DB) MarkVerified(ctx context.Context, id, token string, tokenExpiresAt time.Time) error {
	_, err := r.conn.Exec(ctx,
		`UPDATE otp_codes SET verified_at = now(), token = $2, token_expires_at = $3 WHERE id = $1`,
		id, token, tokenExpiresAt)
	if err != nil {
		return fmt.Errorf("marking otp verified: %w", err)
	}
	return nil
}

// ConsumeToken is a single UPDATE, so two concurrent register calls with
// the same token can't both succeed.
func (r DB) ConsumeToken(ctx context.Context, phone, purpose, token string) error {
	tag, err := r.conn.Exec(ctx, `
		UPDATE otp_codes SET consumed_at = now()
		 WHERE token = $1 AND phone = $2 AND purpose = $3
		   AND consumed_at IS NULL AND token_expires_at > now()
	`, token, phone, purpose)
	if err != nil {
		return fmt.Errorf("consuming otp token: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return otpservice.ErrNotFound
	}
	return nil
}
