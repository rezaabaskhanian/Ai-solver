package telemetry

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

type fakeRepo struct {
	inserted []Event
	errors   []Stored
	counts   map[string]int
	daily    map[string]int
	purgedAt time.Time
}

func (f *fakeRepo) Insert(_ context.Context, ev []Event) error {
	f.inserted = append(f.inserted, ev...)
	return nil
}
func (f *fakeRepo) CountByKind(context.Context, time.Time) (map[string]int, error) {
	return f.counts, nil
}
func (f *fakeRepo) ErrorEvents(context.Context, time.Time, int) ([]Stored, error) {
	return f.errors, nil
}
func (f *fakeRepo) TopScreens(context.Context, time.Time, int) ([]ScreenCount, error) {
	return nil, nil
}
func (f *fakeRepo) DailyActiveDevices(context.Context, time.Time) (map[string]int, error) {
	return f.daily, nil
}
func (f *fakeRepo) Recent(context.Context, string, string, int) ([]Stored, error) { return nil, nil }
func (f *fakeRepo) Purge(_ context.Context, t time.Time) (int64, error) {
	f.purgedAt = t
	return 3, nil
}

var fixedNow = time.Date(2026, 5, 10, 12, 0, 0, 0, time.UTC)

func newSvc(r *fakeRepo) Service {
	return New(r).WithClock(func() time.Time { return fixedNow })
}

func TestSanitizeStripsPII(t *testing.T) {
	extra := map[string]any{
		"phone":     "09120000000",
		"authToken": "abc",
		"nested":    map[string]any{"Password": "x", "ok": 1},
		"keep":      "yes",
	}
	got := SanitizeExtra(extra)
	if _, ok := got["phone"]; ok {
		t.Fatal("phone not stripped")
	}
	if _, ok := got["authToken"]; ok {
		t.Fatal("token not stripped")
	}
	nested := got["nested"].(map[string]any)
	if _, ok := nested["Password"]; ok || nested["ok"] != 1 {
		t.Fatalf("nested not handled: %v", nested)
	}
	if got["keep"] != "yes" {
		t.Fatal("keep lost")
	}
}

func TestSanitizeExtraTooBig(t *testing.T) {
	got := SanitizeExtra(map[string]any{"a": strings.Repeat("x", 250), "b": strings.Repeat("y", 250),
		"c": strings.Repeat("z", 250), "d": strings.Repeat("z", 250), "e": strings.Repeat("z", 250),
		"f": strings.Repeat("z", 250), "g": strings.Repeat("z", 250), "h": strings.Repeat("z", 250),
		"i": strings.Repeat("z", 250)})
	if got["_truncated"] != true {
		t.Fatalf("expected truncation marker, got %v", got)
	}
}

func TestSanitizeTruncatesAndValidates(t *testing.T) {
	ev, ok := Sanitize(Incoming{Kind: "CRASH", Name: "TypeError", Stack: strings.Repeat("é", 10000)}, fixedNow)
	if !ok || ev.Kind != KindCrash {
		t.Fatalf("crash rejected: %v %v", ok, ev.Kind)
	}
	if len(ev.Stack) > maxStack || !strings.HasSuffix(ev.Stack, "é") {
		t.Fatalf("stack not truncated on rune boundary: %d", len(ev.Stack))
	}
	if _, ok := Sanitize(Incoming{Kind: "weird", Name: "x"}, fixedNow); ok {
		t.Fatal("unknown kind accepted")
	}
	if _, ok := Sanitize(Incoming{Kind: "event"}, fixedNow); ok {
		t.Fatal("nameless event accepted")
	}
	ev, ok = Sanitize(Incoming{Kind: "screen", Name: "Home", Message: "a\x00b"}, fixedNow)
	if !ok || ev.Screen != "Home" || ev.Message != "ab" {
		t.Fatalf("screen event wrong: %+v", ev)
	}
}

func TestSanitizeTimestamp(t *testing.T) {
	past := fixedNow.Add(-time.Hour)
	ev, _ := Sanitize(Incoming{Kind: "event", Name: "x", TS: past.UnixMilli()}, fixedNow)
	if !ev.CreatedAt.Equal(past) {
		t.Fatal("plausible ts should be kept")
	}
	ev, _ = Sanitize(Incoming{Kind: "event", Name: "x", TS: fixedNow.Add(-30 * 24 * time.Hour).UnixMilli()}, fixedNow)
	if !ev.CreatedAt.Equal(fixedNow) {
		t.Fatal("old ts should fall back to now")
	}
}

func TestParseBatchIgnoresBadItemsAndCaps(t *testing.T) {
	raw := []json.RawMessage{json.RawMessage(`{"kind":"event","name":"a"}`), json.RawMessage(`"oops"`),
		json.RawMessage(`123`)}
	if got := ParseBatch(raw); len(got) != 1 {
		t.Fatalf("want 1 parsed, got %d", len(got))
	}
	many := make([]json.RawMessage, 50)
	for i := range many {
		many[i] = json.RawMessage(`{"kind":"event","name":"a"}`)
	}
	if got := ParseBatch(many); len(got) != MaxBatch {
		t.Fatalf("want %d, got %d", MaxBatch, len(got))
	}
}

func TestIngestSkipsInvalid(t *testing.T) {
	repo := &fakeRepo{}
	n, err := newSvc(repo).Ingest(context.Background(), "u1", "dev1", []Incoming{
		{Kind: "event", Name: "ok"}, {Kind: "nope", Name: "bad"},
	})
	if err != nil || n != 1 || len(repo.inserted) != 1 {
		t.Fatalf("n=%d err=%v", n, err)
	}
	if repo.inserted[0].DeviceID != "dev1" || repo.inserted[0].UserID != "u1" {
		t.Fatalf("ids not set: %+v", repo.inserted[0])
	}
}

func TestGroupErrors(t *testing.T) {
	t0 := fixedNow
	rows := []Stored{
		{ID: 1, Kind: "error", Name: "A", Message: "boom", AppVersion: "1.0", CreatedAt: t0.Add(-3 * time.Hour), Stack: "old"},
		{ID: 2, Kind: "crash", Name: "A", Message: "boom", AppVersion: "1.1", CreatedAt: t0.Add(-1 * time.Hour), Stack: "new"},
		{ID: 3, Kind: "error", Name: "A", Message: "boom", AppVersion: "1.1", CreatedAt: t0.Add(-2 * time.Hour)},
		{ID: 4, Kind: "error", Name: "B", Message: "other", CreatedAt: t0},
	}
	g := GroupErrors(rows, 10)
	if len(g) != 2 {
		t.Fatalf("want 2 groups, got %d", len(g))
	}
	if g[0].Name != "A" || g[0].Count != 3 || g[0].Kind != KindCrash || g[0].LatestStack != "new" || g[0].LatestID != 2 {
		t.Fatalf("group A wrong: %+v", g[0])
	}
	if len(g[0].AppVersions) != 2 || g[0].AppVersions[0] != "1.0" {
		t.Fatalf("versions wrong: %v", g[0].AppVersions)
	}
	if got := GroupErrors(rows, 1); len(got) != 1 {
		t.Fatal("limit not applied")
	}
}

func TestSummaryFillsDailyActive(t *testing.T) {
	repo := &fakeRepo{counts: map[string]int{"crash": 2}, daily: map[string]int{"2026-05-10": 7}}
	sum, err := newSvc(repo).Summary(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(sum.DailyActive) != 14 || sum.DailyActive[13].Date != "2026-05-10" || sum.DailyActive[13].Devices != 7 ||
		sum.DailyActive[0].Date != "2026-04-27" || sum.DailyActive[0].Devices != 0 {
		t.Fatalf("daily wrong: %+v", sum.DailyActive)
	}
	if sum.Last24h.Crash != 2 {
		t.Fatal("counts wrong")
	}
}

func TestPurge(t *testing.T) {
	repo := &fakeRepo{}
	n, _ := newSvc(repo).Purge(context.Background(), 30)
	if n != 3 || !repo.purgedAt.Equal(fixedNow.Add(-30*24*time.Hour)) {
		t.Fatalf("purge wrong: %v", repo.purgedAt)
	}
}
