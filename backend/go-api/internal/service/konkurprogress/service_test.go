package konkurprogress

import (
	"context"
	"encoding/json"
	"errors"
	"math"
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
	if len(m) > 0 {
		sum := 0.0
		for _, r := range m {
			sum += r.Percent
		}
		st.Mean = sum / float64(len(m))
		if len(m) >= 2 {
			sumSq := 0.0
			for _, r := range m {
				sumSq += r.Percent * r.Percent
			}
			// Sample stddev (n-1), matching stddev_samp in the SQL repo.
			variance := (sumSq - float64(len(m))*st.Mean*st.Mean) / float64(len(m)-1)
			st.StdDev = math.Sqrt(math.Max(0, variance))
		}
	}
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
		percent := mine.Percent
		st.Mine = &percent
	}
	return st, nil
}

func (f *fakeRepo) AllPaperStats(ctx context.Context) ([]PublicPaperSummary, error) {
	var out []PublicPaperSummary
	for key, m := range f.results {
		sum := 0.0
		for _, r := range m {
			sum += r.Percent
		}
		out = append(out, PublicPaperSummary{PaperKey: key, Count: len(m), Mean: sum / float64(len(m))})
	}
	return out, nil
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

// percents 10..50: mean 30, stddev_samp √250 ≈ 15.811.
func submitPercents(t *testing.T, s Service, key string, percents []float64) {
	t.Helper()
	for i, p := range percents {
		u := string(rune('a' + i))
		if err := s.SubmitResult(context.Background(), u, ExamResult{PaperKey: key, Percent: p}); err != nil {
			t.Fatal(err)
		}
	}
}

func TestStatsTaraz(t *testing.T) {
	ctx := context.Background()
	s := New(newFakeRepo())
	key := "riazi-1402-r1"
	submitPercents(t, s, key, []float64{10, 20, 30, 40, 50})

	stddev := math.Sqrt(250)
	// "c" sits exactly on the mean: z = 0 → taraz = 5000.
	st, err := s.Stats(ctx, "c", key)
	if err != nil {
		t.Fatal(err)
	}
	if st.Mean != 30 {
		t.Fatalf("want mean 30, got %v", st.Mean)
	}
	if st.Taraz == nil || math.Abs(*st.Taraz-5000) > 0.01 {
		t.Fatalf("want taraz 5000, got %v", st.Taraz)
	}
	// "a" is one stddev below: taraz = 5000 - 1000 ≈ 4000 (−0.04 rounding).
	st, _ = s.Stats(ctx, "a", key)
	if st.Taraz == nil || math.Abs(*st.Taraz-(5000-1000*(20/stddev))) > 0.01 {
		t.Fatalf("want taraz ≈ 3735, got %v", st.Taraz)
	}
}

func TestStatsTarazHiddenCases(t *testing.T) {
	ctx := context.Background()
	s := New(newFakeRepo())
	// Fewer than MinStatsSample participants → no taraz despite spread.
	key := "riazi-1404-r1"
	submitPercents(t, s, key, []float64{10, 20, 30, 40})
	st, err := s.Stats(ctx, "a", key)
	if err != nil {
		t.Fatal(err)
	}
	if st.Taraz != nil {
		t.Fatalf("want no taraz below sample minimum, got %v", *st.Taraz)
	}
	// Enough participants but no spread (all equal) → stddev 0 → no taraz.
	key2 := "riazi-1404-r2"
	submitPercents(t, s, key2, []float64{50, 50, 50, 50, 50})
	st, _ = s.Stats(ctx, "a", key2)
	if st.Taraz != nil {
		t.Fatalf("want no taraz without spread, got %v", *st.Taraz)
	}
	// A caller without a stored result never gets a taraz.
	st, _ = s.Stats(ctx, "zzz", key2)
	if st.Taraz != nil || st.Percentile != nil {
		t.Fatalf("want no taraz/percentile without a result, got %+v", st)
	}
}

func TestAllStatsFiltersSmallPapers(t *testing.T) {
	ctx := context.Background()
	s := New(newFakeRepo())
	submitPercents(t, s, "riazi-1403-r1", []float64{10, 20, 30, 40, 50}) // 5 → kept
	submitPercents(t, s, "riazi-1403-r2", []float64{10, 20, 30})        // 3 → dropped

	rows, err := s.AllStats(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("want 1 row after filtering, got %d: %+v", len(rows), rows)
	}
	if rows[0].PaperKey != "riazi-1403-r1" || rows[0].Count != 5 || rows[0].Mean != 30 {
		t.Fatalf("unexpected row: %+v", rows[0])
	}
}
