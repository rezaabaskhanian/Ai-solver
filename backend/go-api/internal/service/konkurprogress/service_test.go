package konkurprogress

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"mathmotion/go-api/internal/pkg/richerror"
)

type fakeRepo struct {
	docs    map[string]Doc
	results map[string]map[string]ExamResult // paper -> user -> result
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{docs: map[string]Doc{}, results: map[string]map[string]ExamResult{}}
}

func (f *fakeRepo) GetProgress(ctx context.Context, userID string) (Doc, error) {
	d, ok := f.docs[userID]
	if !ok {
		return Doc{}, ErrNotFound
	}
	return d, nil
}

func (f *fakeRepo) SaveProgress(ctx context.Context, userID string, base int64, data json.RawMessage) (Doc, error) {
	cur, ok := f.docs[userID]
	if (!ok && base != 0) || (ok && cur.Revision != base) {
		return Doc{}, ErrConflict
	}
	d := Doc{Revision: base + 1, UpdatedAt: time.Now(), Data: data}
	f.docs[userID] = d
	return d, nil
}

func (f *fakeRepo) UpsertExamResult(ctx context.Context, userID string, r ExamResult) error {
	m := f.results[r.PaperKey]
	if m == nil {
		m = map[string]ExamResult{}
		f.results[r.PaperKey] = m
	}
	if old, ok := m[userID]; !ok || r.Percent > old.Percent {
		m[userID] = r
	}
	return nil
}

func (f *fakeRepo) PaperStats(ctx context.Context, paperKey, userID string) (PaperStats, error) {
	m := f.results[paperKey]
	st := PaperStats{Count: len(m)}
	if mine, ok := m[userID]; ok {
		others, lower := 0, 0
		for u, r := range m {
			if u == userID {
				continue
			}
			others++
			if r.Percent < mine.Percent {
				lower++
			}
		}
		p := 0.0
		if others > 0 {
			p = float64(lower) * 100 / float64(others)
		}
		st.Percentile = &p
	}
	return st, nil
}

func (f *fakeRepo) AdminStats(ctx context.Context) ([]PaperSummary, error) {
	return nil, nil
}

func kindOf(err error) richerror.Kind {
	var re richerror.RichError
	if errors.As(err, &re) {
		return re.Kind()
	}
	return 0
}

func TestGetProgressEmpty(t *testing.T) {
	s := New(newFakeRepo())
	d, err := s.GetProgress(context.Background(), "u1")
	if err != nil {
		t.Fatal(err)
	}
	if d.Revision != 0 || string(d.Data) != `{}` {
		t.Fatalf("unexpected empty doc: %+v", d)
	}
}

func TestPutProgressRevisions(t *testing.T) {
	ctx := context.Background()
	s := New(newFakeRepo())

	d, err := s.PutProgress(ctx, "u1", 0, json.RawMessage(`{"a":1}`))
	if err != nil || d.Revision != 1 {
		t.Fatalf("first save: %+v %v", d, err)
	}
	d, err = s.PutProgress(ctx, "u1", 1, json.RawMessage(`{"a":2}`))
	if err != nil || d.Revision != 2 {
		t.Fatalf("second save: %+v %v", d, err)
	}

	// Stale revision -> conflict carrying the current doc.
	_, err = s.PutProgress(ctx, "u1", 1, json.RawMessage(`{"a":3}`))
	var ce *ConflictError
	if !errors.As(err, &ce) {
		t.Fatalf("want ConflictError, got %v", err)
	}
	if ce.Current.Revision != 2 || string(ce.Current.Data) != `{"a":2}` {
		t.Fatalf("conflict doc wrong: %+v", ce.Current)
	}

	// Another user is independent.
	if _, err := s.PutProgress(ctx, "u2", 0, json.RawMessage(`{}`)); err != nil {
		t.Fatal(err)
	}
}

func TestPutProgressValidation(t *testing.T) {
	ctx := context.Background()
	s := New(newFakeRepo())

	if _, err := s.PutProgress(ctx, "u1", -1, json.RawMessage(`{}`)); kindOf(err) != richerror.KindInvalid {
		t.Fatalf("negative revision: %v", err)
	}
	if _, err := s.PutProgress(ctx, "u1", 0, json.RawMessage(`[1,2]`)); kindOf(err) != richerror.KindInvalid {
		t.Fatalf("array data: %v", err)
	}
	if _, err := s.PutProgress(ctx, "u1", 0, json.RawMessage(`null`)); kindOf(err) != richerror.KindInvalid {
		t.Fatalf("null data: %v", err)
	}
	big := json.RawMessage(`{"x":"` + strings.Repeat("a", MaxProgressBytes) + `"}`)
	if _, err := s.PutProgress(ctx, "u1", 0, big); kindOf(err) != richerror.KindInvalid {
		t.Fatalf("oversize data: %v", err)
	}
}

func TestSubmitResultValidation(t *testing.T) {
	ctx := context.Background()
	s := New(newFakeRepo())
	ok := ExamResult{PaperKey: "riazi-1403-r1", Percent: 42.5, Correct: 30, Wrong: 10, Blank: 5, Seconds: 3600}
	if err := s.SubmitResult(ctx, "u1", ok); err != nil {
		t.Fatal(err)
	}
	bad := []ExamResult{
		{PaperKey: "BAD KEY", Percent: 10},
		{PaperKey: "riazi-1403-r1", Percent: 101},
		{PaperKey: "riazi-1403-r1", Percent: 10, Correct: -1},
		{PaperKey: "riazi-1403-r1", Percent: 10, Seconds: 999999},
	}
	for i, r := range bad {
		if err := s.SubmitResult(ctx, "u1", r); kindOf(err) != richerror.KindInvalid {
			t.Fatalf("case %d: want invalid, got %v", i, err)
		}
	}
}

func TestStatsPercentileAndBestOnly(t *testing.T) {
	ctx := context.Background()
	s := New(newFakeRepo())
	key := "tajrobi-1404-r2-abroad"
	for i, p := range []float64{10, 20, 30, 40} {
		u := string(rune('a' + i))
		if err := s.SubmitResult(ctx, u, ExamResult{PaperKey: key, Percent: p}); err != nil {
			t.Fatal(err)
		}
	}
	// A worse retry must not lower the best.
	_ = s.SubmitResult(ctx, "d", ExamResult{PaperKey: key, Percent: 5})

	st, err := s.Stats(ctx, "d", key)
	if err != nil {
		t.Fatal(err)
	}
	if st.Count != 4 || st.Percentile == nil || *st.Percentile != 100 {
		t.Fatalf("unexpected stats: %+v", st)
	}
	// A user with no result gets no percentile.
	st, _ = s.Stats(ctx, "zzz", key)
	if st.Percentile != nil {
		t.Fatalf("want nil percentile, got %v", *st.Percentile)
	}
	if _, err := s.Stats(ctx, "d", "NOPE!"); kindOf(err) != richerror.KindInvalid {
		t.Fatalf("bad paper key: %v", err)
	}
}
