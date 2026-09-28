package migrator

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/jackc/pgx/v5/stdlib"
	migrate "github.com/rubenv/sql-migrate"

	"mathmotion/go-api/internal/repository/postgres"
)

type Migrator struct {
	dbConfig   postgres.Config
	migrations *migrate.FileMigrationSource
}

func New(dbConfig postgres.Config) Migrator {
	return Migrator{
		dbConfig:   dbConfig,
		migrations: &migrate.FileMigrationSource{Dir: "internal/repository/postgres/migrations"},
	}
}

func (m Migrator) Up() {
	db, err := sql.Open("pgx", m.dbConfig.ConnString())
	if err != nil {
		log.Fatal("cannot open pgx connection: ", err)
	}
	defer db.Close()

	n, err := migrate.Exec(db, "postgres", m.migrations, migrate.Up)
	if err != nil {
		log.Fatal("cannot apply migrations: ", err)
	}
	fmt.Printf("applied %d migrations\n", n)
}

func (m Migrator) Down() {
	db, err := sql.Open("pgx", m.dbConfig.ConnString())
	if err != nil {
		log.Fatal("cannot open pgx connection: ", err)
	}
	defer db.Close()

	n, err := migrate.Exec(db, "postgres", m.migrations, migrate.Down)
	if err != nil {
		log.Fatal("cannot rollback migrations: ", err)
	}
	fmt.Printf("rolled back %d migrations\n", n)
}
