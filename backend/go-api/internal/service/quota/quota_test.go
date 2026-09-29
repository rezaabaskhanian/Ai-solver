package quota

import (
	"context"
	"testing"
	"time"

	"mathmotion/go-api/internal/pkg/richerror"
	settingskeys "mathmotion/go-api/internal/service/settings"
)

type event struct {
	kind Kind
	at   time.Time
}

type fakeRepo struct{ events []event }

func (f *fakeRepo) CountUsage(_ context.Context, _ string, kinds []Kind, since time.Time) (int, error) {
	n := 0
	for _, e := range f.events {
		for _, k := range kinds {
			if e.kind == k && !e.at.Before(since) {
				n++
			}
		}
	}
	return n, nil
}

func (f *fakeRepo) RecordUsage(_ context.Context, _ string, kind Kind) error {
	f.events = append(f.events, event{kind: kind, at: time.Now()})
	return nil
}

type fakeSettings map[string]string

func (f fakeSettings) Get(key string) string { return f[key] }

// 2026-09-29 10:00 Tehran time.
var tehranNoon = time.Date(2026, 9, 29, 6, 30, 0, 0, time.UTC)

func newService(repo *fakeRepo, settings fakeSettings) Service {
	s := New(repo, settings)
	s.now = func() time.Time { return tehranNoon }
	return s
}

func kindOf(err error) richerror.Kind {
	if re, ok := err.(richerror.RichError); ok {
		return re.Kind()
	}
	return 0
}

func TestDailyFreeQuotaCountsOnlyTodayInTehran(t *testing.T) {
	repo := &fakeRepo{events: []event{
		// 23:50 Tehran yesterday — before today's midnight, not counted.
		{KindSolve, time.Date(2026, 9, 28, 20, 20, 0, 0, time.UTC)},
		// 00:10 Tehran today (still the 28th in UTC) — counted.
		{KindScan, time.Date(2026, 9, 28, 20, 40, 0, 0, time.UTC)},
		{KindCheck, tehranNoon.Add(-time.Hour)},
	}}
	s := newService(repo, fakeSettings{settingskeys.KeyFreeDailyLimit: "3"})

	status, err := s.Status(context.Background(), "u", false)
	if err != nil {
		t.Fatal(err)
	}
	if status.Period != PeriodDaily || status.Used != 2 || status.Limit != 3 {
		t.Fatalf("status = %+v, want daily 2/3", status)
	}
	if status.ResetsAt == nil || !status.ResetsAt.Equal(time.Date(2026, 9, 29, 20, 30, 0, 0, time.UTC)) {
		t.Fatalf("ResetsAt = %v, want next Tehran midnight", status.ResetsAt)
	}
	if err := s.Allow(context.Background(), "u", false, KindScan); err != nil {
		t.Fatalf("Allow with 2/3 used = %v, want nil", err)
	}

	repo.events = append(repo.events, event{KindSolve, tehranNoon})
	if k := kindOf(s.Allow(context.Background(), "u", false, KindSolve)); k != richerror.KindPaymentRequired {
		t.Fatalf("Allow with 3/3 used: kind = %v, want PaymentRequired", k)
	}
}

func TestLifetimeModeCountsEverythingAndFallsBackToFreeSolveLimit(t *testing.T) {
	repo := &fakeRepo{events: []event{
		{KindSolve, tehranNoon.AddDate(-1, 0, 0)},
		{KindScan, tehranNoon},
	}}
	s := newService(repo, fakeSettings{
		settingskeys.KeyFreeQuotaPeriod: "lifetime",
		"FREE_SOLVE_LIMIT":              "2", // the old .env name
	})

	status, _ := s.Status(context.Background(), "u", false)
	if status.Period != PeriodLifetime || status.Used != 2 || status.Limit != 2 || status.ResetsAt != nil {
		t.Fatalf("status = %+v, want lifetime 2/2 with no reset", status)
	}
	if k := kindOf(s.Allow(context.Background(), "u", false, KindCheck)); k != richerror.KindPaymentRequired {
		t.Fatalf("kind = %v, want PaymentRequired", k)
	}
}

func TestPremiumOnlyScansAreCappedDaily(t *testing.T) {
	repo := &fakeRepo{}
	for i := 0; i < 2; i++ {
		repo.events = append(repo.events, event{KindScan, tehranNoon})
		repo.events = append(repo.events, event{KindSolve, tehranNoon})
	}
	s := newService(repo, fakeSettings{settingskeys.KeyPremiumDailyScanLimit: "2"})

	if err := s.Allow(context.Background(), "u", true, KindSolve); err != nil {
		t.Fatalf("premium solve: %v, want nil (unlimited)", err)
	}
	if k := kindOf(s.Allow(context.Background(), "u", true, KindScan)); k != richerror.KindTooManyRequests {
		t.Fatalf("premium 3rd scan: kind = %v, want TooManyRequests", k)
	}
}

func TestPremiumScanCapZeroMeansUnlimited(t *testing.T) {
	repo := &fakeRepo{events: []event{{KindScan, tehranNoon}, {KindScan, tehranNoon}}}
	s := newService(repo, fakeSettings{settingskeys.KeyPremiumDailyScanLimit: "0"})

	if err := s.Allow(context.Background(), "u", true, KindScan); err != nil {
		t.Fatalf("cap 0: %v, want nil", err)
	}
}

func TestInvalidSettingsFallBackToDefaults(t *testing.T) {
	s := newService(&fakeRepo{}, fakeSettings{
		settingskeys.KeyFreeQuotaPeriod:       "weekly",
		settingskeys.KeyFreeDailyLimit:        "-4",
		settingskeys.KeyPremiumDailyScanLimit: "lots",
	})

	cfg := s.Config()
	want := Config{
		FreePeriod:            PeriodDaily,
		FreeDailyLimit:        defaultFreeDailyLimit,
		FreeLifetimeLimit:     defaultFreeLifetimeLimit,
		PremiumDailyScanLimit: defaultPremiumDailyScanLimit,
	}
	if cfg != want {
		t.Fatalf("Config() = %+v, want %+v", cfg, want)
	}
}
