package postgresuser

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	domain "mathmotion/go-api/internal/domain/user"
)

// userColumns / scanUser: every query returning a whole user uses these.
const userColumns = `id, device_id, code, name, email, phone, COALESCE(password_hash, ''),
	is_premium, premium_until, is_unlimited, created_at, updated_at`

func scanUser(row pgx.Row) (domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.DeviceID, &u.Code, &u.Name, &u.Email, &u.Phone, &u.PasswordHash,
		&u.IsPremium, &u.PremiumUntil, &u.IsUnlimited, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, domain.ErrNotFound
	}
	return u, err
}

// EnsureUser implements [userservice.Repository].
func (r DB) EnsureUser(ctx context.Context, deviceID string) (domain.User, error) {
	// code is only used for a new row — an existing user keeps theirs.
	return scanUser(r.conn.QueryRow(ctx, `
		INSERT INTO users (id, device_id, code)
		VALUES ($1, $2, $3)
		ON CONFLICT (device_id) DO UPDATE SET updated_at = now()
		RETURNING `+userColumns, uuid.NewString(), deviceID, newUserCode()))
}

// GetByID implements [userservice.Repository].
func (r DB) GetByID(ctx context.Context, id string) (domain.User, error) {
	return scanUser(r.conn.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id))
}

// GetByPhone implements [accountservice.Repository].
func (r DB) GetByPhone(ctx context.Context, phone string) (domain.User, error) {
	return scanUser(r.conn.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE phone = $1`, phone))
}

// AttachAccount implements [accountservice.Repository]: turns an
// anonymous (device) user into an account, keeping its history and plan.
func (r DB) AttachAccount(ctx context.Context, userID, phone, nickname, passwordHash string) (domain.User, error) {
	u, err := scanUser(r.conn.QueryRow(ctx, `
		UPDATE users SET phone = $2, name = $3, password_hash = $4, updated_at = now()
		 WHERE id = $1 AND phone IS NULL
		RETURNING `+userColumns, userID, phone, nickname, passwordHash))
	return u, phoneTaken(err)
}

// CreateAccount implements [accountservice.Repository]: a new account not
// tied to any device's anonymous user (device_id just has to be unique).
func (r DB) CreateAccount(ctx context.Context, phone, nickname, passwordHash string) (domain.User, error) {
	u, err := scanUser(r.conn.QueryRow(ctx, `
		INSERT INTO users (id, device_id, code, phone, name, password_hash)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+userColumns,
		uuid.NewString(), "account:"+uuid.NewString(), newUserCode(), phone, nickname, passwordHash))
	return u, phoneTaken(err)
}

// SetPassword implements [accountservice.Repository].
func (r DB) SetPassword(ctx context.Context, userID, passwordHash string) error {
	tag, err := r.conn.Exec(ctx,
		`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, userID, passwordHash)
	if err != nil {
		return fmt.Errorf("setting password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// phoneTaken maps the idx_users_phone unique violation to ErrPhoneTaken.
func phoneTaken(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return domain.ErrPhoneTaken
	}
	return err
}

// codeAlphabet leaves out 0/O and 1/I/L so a code read out over the phone
// can't be misheard.
const codeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

// newUserCode is 8 random characters (31^8 ≈ 850 billion codes).
func newUserCode() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = codeAlphabet[int(b[i])%len(codeAlphabet)]
	}
	return string(b)
}
