// Package telemetry is the self-hosted crash / error / usage reporting the
// mobile app sends to POST /api/v1/telemetry, and the admin panel's
// «خطاها و آمار» report on it. No third-party SDK: events land in the
// app_events table (migration 013).
//
// Privacy: only technical data is stored (error text, screen names, app and
// OS version, a few event names). Anything in `extra` whose key looks like a
// token / password / phone / secret is dropped before storing.
package telemetry

import (
	"context"
	"encoding/json"
	"log"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	KindCrash  = "crash"
	KindError  = "error"
	KindScreen = "screen"
	KindEvent  = "event"

	// MaxBatch is how many events one request may carry; extras are ignored.
	MaxBatch = 20

	maxName     = 120
	maxMessage  = 1000
	maxStack    = 8 * 1024
	maxScreen   = 120
	maxVersion  = 32
	maxPlatform = 16
	maxOS       = 32
	maxExtra    = 2 * 1024 // bytes of JSON

	// errorScanLimit bounds how many recent crash/error rows the summary groups.
	errorScanLimit = 5000
)

var validKinds = map[string]bool{KindCrash: true, KindError: true, KindScreen: true, KindEvent: true}

// Incoming is one event as the app sends it.
type Incoming struct {
	Kind       string         `json:"kind"`
	Name       string         `json:"name"`
	Message    string         `json:"message"`
	Stack      string         `json:"stack"`
	Screen     string         `json:"screen"`
	AppVersion string         `json:"app_version"`
	Platform   string         `json:"platform"`
	OSVersion  string         `json:"os_version"`
	Extra      map[string]any `json:"extra"`
	// TS is when it happened on the device (unix ms); optional.
	TS int64 `json:"ts"`
}

// Event is a validated event, ready to store.
type Event struct {
	CreatedAt  time.Time
	UserID     string
	DeviceID   string
	Kind       string
	Name       string
	Message    string
	Stack      string
	Screen     string
	AppVersion string
	Platform   string
	OSVersion  string
	Extra      map[string]any
}

// Stored is a row read back from app_events.
type Stored struct {
	ID         int64          `json:"id"`
	CreatedAt  time.Time      `json:"created_at"`
	UserID     string         `json:"user_id"`
	DeviceID   string         `json:"device_id"`
	Kind       string         `json:"kind"`
	Name       string         `json:"name"`
	Message    string         `json:"message"`
	Stack      string         `json:"stack"`
	Screen     string         `json:"screen"`
	AppVersion string         `json:"app_version"`
	Platform   string         `json:"platform"`
	OSVersion  string         `json:"os_version"`
	Extra      map[string]any `json:"extra"`
}

type ScreenCount struct {
	Screen string `json:"screen"`
	Views  int    `json:"views"`
}

type DayActive struct {
	Date    string `json:"date"`
	Devices int    `json:"devices"`
}

// ErrorGroup is every crash/error with the same name + message.
type ErrorGroup struct {
	Kind        string    `json:"kind"` // "crash" if any occurrence was a crash
	Name        string    `json:"name"`
	Message     string    `json:"message"`
	Count       int       `json:"count"`
	LastSeen    time.Time `json:"last_seen"`
	AppVersions []string  `json:"app_versions"`
	LatestStack string    `json:"latest_stack"`
	LatestID    int64     `json:"latest_id"`
}

type KindCounts struct {
	Crash  int `json:"crash"`
	Error  int `json:"error"`
	Screen int `json:"screen"`
	Event  int `json:"event"`
}

type Summary struct {
	Last24h     KindCounts    `json:"last_24h"`
	Last7d      KindCounts    `json:"last_7d"`
	TopErrors   []ErrorGroup  `json:"top_errors"`
	TopScreens  []ScreenCount `json:"top_screens"`
	DailyActive []DayActive   `json:"daily_active"`
}

type Repository interface {
	Insert(ctx context.Context, events []Event) error
	// CountByKind counts events per kind since the given time.
	CountByKind(ctx context.Context, since time.Time) (map[string]int, error)
	// ErrorEvents returns the newest crash/error rows since the time, newest first.
	ErrorEvents(ctx context.Context, since time.Time, limit int) ([]Stored, error)
	TopScreens(ctx context.Context, since time.Time, limit int) ([]ScreenCount, error)
	// DailyActiveDevices maps "YYYY-MM-DD" (UTC) to distinct devices since the time.
	DailyActiveDevices(ctx context.Context, since time.Time) (map[string]int, error)
	Recent(ctx context.Context, kind, q string, limit int) ([]Stored, error)
	Purge(ctx context.Context, olderThan time.Time) (int64, error)
}

type Service struct {
	repo Repository
	now  func() time.Time
}

func New(repo Repository) Service {
	return Service{repo: repo, now: time.Now}
}

// WithClock replaces the clock (tests).
func (s Service) WithClock(now func() time.Time) Service {
	s.now = now
	return s
}

// ParseBatch decodes raw events one by one; items that aren't valid JSON
// objects are ignored, and only the first MaxBatch are looked at.
func ParseBatch(raw []json.RawMessage) []Incoming {
	out := make([]Incoming, 0, len(raw))
	for i, r := range raw {
		if i >= MaxBatch {
			break
		}
		var in Incoming
		if err := json.Unmarshal(r, &in); err != nil {
			continue
		}
		out = append(out, in)
	}
	return out
}

// Ingest validates the batch and stores the good events. It returns how many
// were stored; a bad item never fails the rest.
func (s Service) Ingest(ctx context.Context, userID, deviceID string, batch []Incoming) (int, error) {
	if len(batch) > MaxBatch {
		batch = batch[:MaxBatch]
	}
	now := s.now()
	events := make([]Event, 0, len(batch))
	for _, in := range batch {
		if ev, ok := Sanitize(in, now); ok {
			ev.UserID = clean(userID, 64)
			ev.DeviceID = clean(deviceID, 64)
			events = append(events, ev)
		}
	}
	if len(events) == 0 {
		return 0, nil
	}
	if err := s.repo.Insert(ctx, events); err != nil {
		return 0, err
	}
	return len(events), nil
}

// Sanitize validates and truncates one incoming event. ok is false when it
// should be ignored (unknown kind, or nothing identifying it).
func Sanitize(in Incoming, now time.Time) (Event, bool) {
	kind := strings.ToLower(strings.TrimSpace(in.Kind))
	if !validKinds[kind] {
		return Event{}, false
	}
	ev := Event{
		CreatedAt:  now,
		Kind:       kind,
		Name:       clean(in.Name, maxName),
		Message:    clean(in.Message, maxMessage),
		Stack:      clean(in.Stack, maxStack),
		Screen:     clean(in.Screen, maxScreen),
		AppVersion: clean(in.AppVersion, maxVersion),
		Platform:   clean(in.Platform, maxPlatform),
		OSVersion:  clean(in.OSVersion, maxOS),
		Extra:      SanitizeExtra(in.Extra),
	}
	switch kind {
	case KindScreen:
		if ev.Screen == "" {
			ev.Screen = ev.Name
		}
		if ev.Screen == "" {
			return Event{}, false
		}
	case KindEvent:
		if ev.Name == "" {
			return Event{}, false
		}
	default: // crash, error
		if ev.Name == "" && ev.Message == "" {
			return Event{}, false
		}
	}
	// Queued events keep their device time, as long as it's plausible.
	if in.TS > 0 {
		t := time.UnixMilli(in.TS)
		if t.After(now.Add(-7*24*time.Hour)) && t.Before(now.Add(5*time.Minute)) {
			ev.CreatedAt = t
		}
	}
	return ev, true
}

// clean makes s safe for Postgres text (valid UTF-8, no NUL) and cuts it to
// at most max bytes on a rune boundary.
func clean(s string, max int) string {
	s = strings.TrimSpace(s)
	if !utf8.ValidString(s) {
		s = strings.ToValidUTF8(s, "")
	}
	if strings.ContainsRune(s, 0) {
		s = strings.ReplaceAll(s, "\x00", "")
	}
	if len(s) <= max {
		return s
	}
	cut := max
	for cut > 0 && !utf8.RuneStart(s[cut]) {
		cut--
	}
	return s[:cut]
}

var sensitiveKeys = []string{"token", "password", "passwd", "phone", "mobile", "secret", "authorization", "otp", "cookie"}

func isSensitiveKey(k string) bool {
	k = strings.ToLower(k)
	for _, s := range sensitiveKeys {
		if strings.Contains(k, s) {
			return true
		}
	}
	return false
}

// SanitizeExtra drops sensitive keys (at any depth) and keeps the result
// under maxExtra bytes of JSON (otherwise it's replaced by a marker).
func SanitizeExtra(extra map[string]any) map[string]any {
	if len(extra) == 0 {
		return map[string]any{}
	}
	out := stripMap(extra, 0)
	b, err := json.Marshal(out)
	if err != nil || len(b) > maxExtra {
		return map[string]any{"_truncated": true}
	}
	return out
}

func stripMap(m map[string]any, depth int) map[string]any {
	out := make(map[string]any, len(m))
	for k, v := range m {
		if isSensitiveKey(k) {
			continue
		}
		out[clean(k, 60)] = stripValue(v, depth+1)
	}
	return out
}

func stripValue(v any, depth int) any {
	if depth > 4 {
		return nil
	}
	switch t := v.(type) {
	case map[string]any:
		return stripMap(t, depth)
	case []any:
		res := make([]any, 0, len(t))
		for i, x := range t {
			if i >= 20 {
				break
			}
			res = append(res, stripValue(x, depth+1))
		}
		return res
	case string:
		return clean(t, 300)
	default:
		return v
	}
}

// Summary builds the admin panel's overview.
func (s Service) Summary(ctx context.Context) (Summary, error) {
	now := s.now().UTC()
	var sum Summary

	c24, err := s.repo.CountByKind(ctx, now.Add(-24*time.Hour))
	if err != nil {
		return sum, err
	}
	c7, err := s.repo.CountByKind(ctx, now.Add(-7*24*time.Hour))
	if err != nil {
		return sum, err
	}
	sum.Last24h, sum.Last7d = toKindCounts(c24), toKindCounts(c7)

	errs, err := s.repo.ErrorEvents(ctx, now.Add(-7*24*time.Hour), errorScanLimit)
	if err != nil {
		return sum, err
	}
	sum.TopErrors = GroupErrors(errs, 10)

	sum.TopScreens, err = s.repo.TopScreens(ctx, now.Add(-7*24*time.Hour), 10)
	if err != nil {
		return sum, err
	}
	if sum.TopScreens == nil {
		sum.TopScreens = []ScreenCount{}
	}

	const days = 14
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -(days - 1))
	byDay, err := s.repo.DailyActiveDevices(ctx, start)
	if err != nil {
		return sum, err
	}
	sum.DailyActive = make([]DayActive, 0, days)
	for i := 0; i < days; i++ {
		d := start.AddDate(0, 0, i).Format("2006-01-02")
		sum.DailyActive = append(sum.DailyActive, DayActive{Date: d, Devices: byDay[d]})
	}
	return sum, nil
}

func toKindCounts(m map[string]int) KindCounts {
	return KindCounts{Crash: m[KindCrash], Error: m[KindError], Screen: m[KindScreen], Event: m[KindEvent]}
}

// GroupErrors groups crash/error rows by name+message, most frequent first
// (ties: most recently seen), and keeps the top `limit`.
func GroupErrors(rows []Stored, limit int) []ErrorGroup {
	type key struct{ name, msg string }
	groups := map[key]*ErrorGroup{}
	versions := map[key]map[string]bool{}
	for _, r := range rows {
		k := key{r.Name, r.Message}
		g, ok := groups[k]
		if !ok {
			g = &ErrorGroup{Kind: r.Kind, Name: r.Name, Message: r.Message}
			groups[k] = g
			versions[k] = map[string]bool{}
		}
		g.Count++
		if r.Kind == KindCrash {
			g.Kind = KindCrash
		}
		if r.AppVersion != "" {
			versions[k][r.AppVersion] = true
		}
		if g.LatestID == 0 || r.CreatedAt.After(g.LastSeen) {
			g.LastSeen = r.CreatedAt
			g.LatestStack = r.Stack
			g.LatestID = r.ID
		}
	}
	out := make([]ErrorGroup, 0, len(groups))
	for k, g := range groups {
		vs := make([]string, 0, len(versions[k]))
		for v := range versions[k] {
			vs = append(vs, v)
		}
		sort.Strings(vs)
		g.AppVersions = vs
		out = append(out, *g)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		if !out[i].LastSeen.Equal(out[j].LastSeen) {
			return out[i].LastSeen.After(out[j].LastSeen)
		}
		return out[i].Message < out[j].Message
	})
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out
}

// Recent lists the latest events, optionally for one kind and a text search.
func (s Service) Recent(ctx context.Context, kind, q string, limit int) ([]Stored, error) {
	kind = strings.ToLower(strings.TrimSpace(kind))
	if kind != "" && !validKinds[kind] {
		kind = ""
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	rows, err := s.repo.Recent(ctx, kind, clean(q, 200), limit)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []Stored{}
	}
	return rows, nil
}

// Purge deletes events older than `days` days and returns how many.
func (s Service) Purge(ctx context.Context, days int) (int64, error) {
	if days < 1 {
		days = 1
	}
	return s.repo.Purge(ctx, s.now().Add(-time.Duration(days)*24*time.Hour))
}

// StartRetention deletes events older than `days` days now and then daily,
// until ctx ends. Run it in a goroutine.
func (s Service) StartRetention(ctx context.Context, days int) {
	run := func() {
		n, err := s.Purge(ctx, days)
		if err != nil {
			log.Printf("telemetry retention: %v", err)
		} else if n > 0 {
			log.Printf("telemetry retention: deleted %d events older than %d days", n, days)
		}
	}
	run()
	t := time.NewTicker(24 * time.Hour)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			run()
		}
	}
}
