package postgresbilling

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// RecordPurchase implements [billing.Repository]. purchase_token is
// UNIQUE (migration 003), so a replayed token — e.g. the mobile
// client's restore-on-reinstall check re-sending an old token — is a
// no-op here (isNew=false) rather than an error; the caller still
// (idempotently) ensures Premium is set.
func (r DB) RecordPurchase(ctx context.Context, userID, productID, purchaseToken string) (bool, error) {
	const query = `
		INSERT INTO purchases (id, user_id, product_id, purchase_token)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (purchase_token) DO NOTHING
		RETURNING id
	`

	var id string
	err := r.conn.QueryRow(ctx, query, uuid.NewString(), userID, productID, purchaseToken).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("inserting purchase: %w", err)
	}
	return true, nil
}

// SetPremium implements [billing.Repository].
func (r DB) SetPremium(ctx context.Context, userID string) error {
	_, err := r.conn.Exec(ctx, `UPDATE users SET is_premium = true, updated_at = now() WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("setting premium: %w", err)
	}
	return nil
}
