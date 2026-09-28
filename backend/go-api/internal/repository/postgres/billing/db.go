// Package postgresbilling implements [billing.Repository]. Kept
// independent of postgresproblem/postgresuser (even though all three
// share the same pool) so internal/service/billing never depends on
// another service's repository package.
package postgresbilling

import "github.com/jackc/pgx/v5/pgxpool"

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}
