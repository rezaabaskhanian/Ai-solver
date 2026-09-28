package postgres

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	UserName string
	Password string
	Port     int
	Host     string
	DBName   string
}

func (c Config) ConnString() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=disable",
		c.UserName, c.Password, c.Host, c.Port, c.DBName,
	)
}

type DB struct {
	Pool   *pgxpool.Pool
	config Config
}

func New(cfg Config) *DB {
	pool, err := pgxpool.New(context.Background(), cfg.ConnString())
	if err != nil {
		log.Fatal("unable to connect to database:", err)
	}
	return &DB{Pool: pool, config: cfg}
}
