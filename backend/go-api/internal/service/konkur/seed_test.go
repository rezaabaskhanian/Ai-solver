package konkurservice

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"testing/fstest"
)

const tinySeed = `{
 "tips": [
  {"id":"t1","grade":10,"title":"نکته ۱","body":["متن"]},
  {"id":"t2","grade":null,"title":"نکته ۲","body":["متن"]},
  {"id":"tbad","grade":3,"title":"نامعتبر","body":[]}
 ],
 "questions": [
  {"id":"q1","tipIds":["t1"],"text":"سؤال","choices":["۱","۲","۳","۴"],"answer":2,"solution":["حل"],"source":{"kind":"authored"}},
  {"id":"q2","tipIds":["t2"],"text":"سؤال","choices":["۱","۲","۳","۴"],"answer":0,"solution":[],"source":{"kind":"authored"},"figureUrl":"/uploads/konkur/f.png"},
  {"id":"qbad","tipIds":[],"text":"سؤال","choices":["۱","۲"],"answer":5,"solution":[],"source":{"kind":"authored"}}
 ]
}`

func tinyFS() fstest.MapFS {
	return fstest.MapFS{
		"konkur-seed.json":  {Data: []byte(tinySeed)},
		"figures/f.png":     {Data: []byte("png-bytes")},
		"figures/notes.txt": {Data: []byte("ignored")},
	}
}

func TestSeedStatusCountsMissing(t *testing.T) {
	repo := newFakeRepo()
	repo.tips["t1"] = Tip{ID: "t1", Title: "ویرایش‌شده"}
	svc := New(repo)

	st, err := svc.SeedStatus(context.Background(), tinyFS())
	if err != nil {
		t.Fatal(err)
	}
	want := SeedStatus{Tips: 3, Questions: 3, MissingTips: 2, MissingQuestions: 3, Figures: 1}
	if st != want {
		t.Fatalf("status = %+v, want %+v", st, want)
	}
}

func TestApplySeedAddsOnlyMissingAndNeverOverwritesEdits(t *testing.T) {
	repo := newFakeRepo()
	repo.tips["t1"] = Tip{ID: "t1", Title: "ویرایش دستی"}
	svc := New(repo)
	before := repo.version

	res, err := svc.ApplySeed(context.Background(), tinyFS(), false)
	if err != nil {
		t.Fatal(err)
	}
	if res.AddedTips != 1 || res.SkippedTips != 1 || res.InvalidTips != 1 {
		t.Fatalf("tips result = %+v", res)
	}
	if res.AddedQuestions != 2 || res.SkippedQuestions != 0 || res.InvalidQuestions != 1 {
		t.Fatalf("questions result = %+v", res)
	}
	if len(res.Problems) != 2 {
		t.Fatalf("problems = %v", res.Problems)
	}
	if repo.tips["t1"].Title != "ویرایش دستی" {
		t.Fatal("an edited tip was overwritten")
	}
	if _, ok := repo.tips["tbad"]; ok {
		t.Fatal("invalid tip imported")
	}
	if repo.version != before+1 || res.Version != repo.version {
		t.Fatalf("version = %d (result %d), want one bump from %d", repo.version, res.Version, before)
	}

	// Second run: nothing left to add, so no version bump.
	res, err = svc.ApplySeed(context.Background(), tinyFS(), false)
	if err != nil {
		t.Fatal(err)
	}
	if res.AddedTips+res.AddedQuestions != 0 || res.SkippedTips != 2 || res.SkippedQuestions != 2 {
		t.Fatalf("second run = %+v", res)
	}
	if repo.version != before+1 {
		t.Fatal("version bumped although nothing was added")
	}
}

func TestApplySeedOverwriteReplacesEdits(t *testing.T) {
	repo := newFakeRepo()
	repo.tips["t1"] = Tip{ID: "t1", Title: "ویرایش دستی"}
	svc := New(repo)

	res, err := svc.ApplySeed(context.Background(), tinyFS(), true)
	if err != nil {
		t.Fatal(err)
	}
	if res.AddedTips != 2 || res.SkippedTips != 0 {
		t.Fatalf("result = %+v", res)
	}
	if repo.tips["t1"].Title != "نکته ۱" {
		t.Fatalf("t1 not replaced: %q", repo.tips["t1"].Title)
	}
}

func TestCopySeedFiguresSkipsExisting(t *testing.T) {
	dir := t.TempDir()
	n, err := CopySeedFigures(tinyFS(), dir)
	if err != nil || n != 1 {
		t.Fatalf("copied %d, err %v", n, err)
	}
	target := filepath.Join(dir, "konkur", "f.png")
	if b, _ := os.ReadFile(target); string(b) != "png-bytes" {
		t.Fatalf("content = %q", b)
	}
	if err := os.WriteFile(target, []byte("edited"), 0o644); err != nil {
		t.Fatal(err)
	}
	n, err = CopySeedFigures(tinyFS(), dir)
	if err != nil || n != 0 {
		t.Fatalf("second copy: %d, err %v", n, err)
	}
	if b, _ := os.ReadFile(target); string(b) != "edited" {
		t.Fatal("existing figure overwritten")
	}
}
