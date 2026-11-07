package postgresbilling

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	billing "mathmotion/go-api/internal/service/billing"
)

// PurchaseRecorded implements [billing.Repository].
func (r DB) PurchaseRecorded(ctx context.Context, purchaseToken string) (bool, error) {
	var exists bool
	err := r.conn.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM purchases WHERE purchase_token = $1)`, purchaseToken,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking purchase: %w", err)
	}
	return exists, nil
}

// RecordPurchase implements [billing.Repository]. purchase_token is
// UNIQUE (migration 003), so a replayed token is a no-op (isNew=false)
// and never extends Premium twice.
func (r DB) RecordPurchase(ctx context.Context, userID, productID, purchaseToken string, days, priceToman int) (bool, error) {
	tx, err := r.conn.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO purchases (id, user_id, product_id, purchase_token, days_granted, price_toman)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (purchase_token) DO NOTHING
		RETURNING id
	`, uuid.NewString(), userID, productID, purchaseToken, days, priceToman).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("inserting purchase: %w", err)
	}

	if days > 0 {
		if err := extendPremium(ctx, tx, userID, days); err != nil {
			return false, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("committing purchase: %w", err)
	}
	return true, nil
}

// extendPremium adds days to premium_until — counted from now, or from the
// current expiry when it's still ahead (buying again before a month runs
// out stacks rather than wasting the remaining days).
func extendPremium(ctx context.Context, q execer, userID string, days int) error {
	tag, err := q.Exec(ctx, `
		UPDATE users
		   SET premium_until = GREATEST(COALESCE(premium_until, now()), now()) + make_interval(days => $2),
		       updated_at = now()
		 WHERE id = $1
	`, userID, days)
	if err != nil {
		return fmt.Errorf("extending premium: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return billing.ErrNotFound
	}
	return nil
}

// execer is what both the pool and a transaction offer.
type execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// SetPremium implements [billing.Repository].
func (r DB) SetPremium(ctx context.Context, userID string) error {
	_, err := r.conn.Exec(ctx, `UPDATE users SET is_premium = true, updated_at = now() WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("setting premium: %w", err)
	}
	return nil
}

// ---------- plans ----------

const planColumns = `p.id, p.name, p.duration_days, p.price_toman, p.product_id, p.archived,
	(SELECT COUNT(*) FROM purchases pu WHERE pu.product_id = p.product_id)`

func scanPlan(row pgx.Row) (billing.Plan, error) {
	var p billing.Plan
	err := row.Scan(&p.ID, &p.Name, &p.DurationDays, &p.PriceToman, &p.ProductID, &p.Archived, &p.PurchaseCount)
	return p, err
}

// ListPlans implements [billing.Repository] — archived plans too, last.
func (r DB) ListPlans(ctx context.Context) ([]billing.Plan, error) {
	rows, err := r.conn.Query(ctx, `SELECT `+planColumns+` FROM subscription_plans p ORDER BY p.archived, p.duration_days`)
	if err != nil {
		return nil, fmt.Errorf("listing plans: %w", err)
	}
	defer rows.Close()

	plans := []billing.Plan{}
	for rows.Next() {
		p, err := scanPlan(rows)
		if err != nil {
			return nil, fmt.Errorf("scanning plan: %w", err)
		}
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

// PlanByProductID implements [billing.Repository].
func (r DB) PlanByProductID(ctx context.Context, productID string) (billing.Plan, error) {
	p, err := scanPlan(r.conn.QueryRow(ctx,
		`SELECT `+planColumns+` FROM subscription_plans p WHERE p.product_id = $1`, productID))
	if errors.Is(err, pgx.ErrNoRows) {
		return billing.Plan{}, billing.ErrNotFound
	}
	if err != nil {
		return billing.Plan{}, fmt.Errorf("reading plan: %w", err)
	}
	return p, nil
}

// UpsertPlan implements [billing.Repository].
func (r DB) UpsertPlan(ctx context.Context, p billing.Plan) (billing.Plan, error) {
	_, err := r.conn.Exec(ctx, `
		INSERT INTO subscription_plans (id, name, duration_days, price_toman, product_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (product_id) DO UPDATE
		   SET name = EXCLUDED.name, duration_days = EXCLUDED.duration_days,
		       price_toman = EXCLUDED.price_toman
	`, uuid.NewString(), p.Name, p.DurationDays, p.PriceToman, p.ProductID)
	if err != nil {
		return billing.Plan{}, fmt.Errorf("saving plan: %w", err)
	}
	return r.PlanByProductID(ctx, p.ProductID)
}

// DeletePlan implements [billing.Repository]. Past purchases keep their
// product_id, so deleting a plan only stops it being sold.
func (r DB) DeletePlan(ctx context.Context, id string) error {
	if _, err := r.conn.Exec(ctx, `DELETE FROM subscription_plans WHERE id = $1`, id); err != nil {
		return fmt.Errorf("deleting plan: %w", err)
	}
	return nil
}

// SetPlanArchived implements [billing.Repository].
func (r DB) SetPlanArchived(ctx context.Context, id string, archived bool) error {
	tag, err := r.conn.Exec(ctx, `UPDATE subscription_plans SET archived = $2 WHERE id = $1`, id, archived)
	if err != nil {
		return fmt.Errorf("archiving plan: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return billing.ErrNotFound
	}
	return nil
}

// SalesReport implements [billing.Repository]. Revenue is the price stored
// on each purchase (migration 015); the lifetime unlock counts with 0.
func (r DB) SalesReport(ctx context.Context) (billing.SalesReport, error) {
	rep := billing.SalesReport{ByPlan: []billing.SalesRow{}, ByMonth: []billing.SalesMonth{}}

	err := r.conn.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(SUM(price_toman), 0),
		       COUNT(*) FILTER (WHERE verified_at > now() - interval '30 days'),
		       COALESCE(SUM(price_toman) FILTER (WHERE verified_at > now() - interval '30 days'), 0),
		       (SELECT COUNT(*) FROM users WHERE is_premium OR is_unlimited OR premium_until > now())
		  FROM purchases
	`).Scan(&rep.TotalCount, &rep.TotalToman, &rep.Last30Count, &rep.Last30Toman, &rep.ActivePremium)
	if err != nil {
		return rep, fmt.Errorf("reading sales totals: %w", err)
	}

	rows, err := r.conn.Query(ctx, `
		SELECT pu.product_id, COALESCE(MAX(p.name), ''), COUNT(*), COALESCE(SUM(pu.price_toman), 0)
		  FROM purchases pu
		  LEFT JOIN subscription_plans p ON p.product_id = pu.product_id
		 GROUP BY pu.product_id
		 ORDER BY 4 DESC, 3 DESC
	`)
	if err != nil {
		return rep, fmt.Errorf("reading sales per plan: %w", err)
	}
	for rows.Next() {
		var row billing.SalesRow
		if err := rows.Scan(&row.ProductID, &row.Name, &row.Count, &row.Toman); err != nil {
			rows.Close()
			return rep, fmt.Errorf("scanning sales row: %w", err)
		}
		rep.ByPlan = append(rep.ByPlan, row)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return rep, fmt.Errorf("reading sales per plan: %w", err)
	}

	rows, err = r.conn.Query(ctx, `
		SELECT to_char(date_trunc('month', verified_at), 'YYYY-MM'), COUNT(*), COALESCE(SUM(price_toman), 0)
		  FROM purchases
		 GROUP BY 1
		 ORDER BY 1 DESC
		 LIMIT 12
	`)
	if err != nil {
		return rep, fmt.Errorf("reading sales per month: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var m billing.SalesMonth
		if err := rows.Scan(&m.Month, &m.Count, &m.Toman); err != nil {
			return rep, fmt.Errorf("scanning sales month: %w", err)
		}
		rep.ByMonth = append(rep.ByMonth, m)
	}
	return rep, rows.Err()
}

// ---------- users (admin panel) ----------

// SearchUsers implements [billing.Repository]: code or device id prefix,
// or (empty query) the most recently active users.
func (r DB) SearchUsers(ctx context.Context, query string, limit int) ([]billing.UserSummary, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT u.id, COALESCE(u.code, ''), COALESCE(u.phone, ''), COALESCE(u.name, ''), u.is_premium, u.premium_until, u.is_unlimited,
		       (SELECT COUNT(*) FROM problems p WHERE p.user_id = u.id),
		       (SELECT COUNT(*) FROM purchases pu WHERE pu.user_id = u.id),
		       u.created_at, u.updated_at
		  FROM users u
		 WHERE $1 = '' OR u.code LIKE $1 || '%' OR u.phone LIKE $1 || '%'
		    OR upper(u.device_id) LIKE $1 || '%'
		 ORDER BY u.updated_at DESC
		 LIMIT $2
	`, query, limit)
	if err != nil {
		return nil, fmt.Errorf("searching users: %w", err)
	}
	defer rows.Close()

	users := []billing.UserSummary{}
	for rows.Next() {
		var u billing.UserSummary
		if err := rows.Scan(&u.ID, &u.Code, &u.Phone, &u.Nickname, &u.PremiumLifetime, &u.PremiumUntil, &u.IsUnlimited,
			&u.SolveCount, &u.PurchaseCount, &u.CreatedAt, &u.LastSeenAt); err != nil {
			return nil, fmt.Errorf("scanning user: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// AddPremiumDays implements [billing.Repository].
func (r DB) AddPremiumDays(ctx context.Context, userID string, days int) error {
	return extendPremium(ctx, r.conn, userID, days)
}

// SetUnlimited implements [billing.Repository].
func (r DB) SetUnlimited(ctx context.Context, userID string, unlimited bool) error {
	return r.updateUser(ctx, `UPDATE users SET is_unlimited = $2, updated_at = now() WHERE id = $1`, userID, unlimited)
}

// RevokePremium implements [billing.Repository]: every kind of Premium off.
// Purchase records stay, so a restore could still bring the lifetime
// unlock back — which is right if it was really bought.
func (r DB) RevokePremium(ctx context.Context, userID string) error {
	return r.updateUser(ctx, `
		UPDATE users SET is_premium = false, premium_until = NULL, is_unlimited = false, updated_at = now()
		 WHERE id = $1`, userID)
}

func (r DB) updateUser(ctx context.Context, query string, args ...any) error {
	tag, err := r.conn.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("updating user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return billing.ErrNotFound
	}
	return nil
}
