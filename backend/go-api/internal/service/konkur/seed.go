package konkurservice

import (
	"context"
	"embed"
	"encoding/json"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// The content that ships inside the mobile app, exported by
// mobile/MathMotion/scripts/export-konkur.ts (see the konkur TODO.md for
// how to regenerate it). The admin panel's «محتوای آماده‌ی اپ» card loads
// it into the database with one click.
//
//go:embed seed/konkur-seed.json seed/figures/*
var embeddedSeed embed.FS

const (
	seedFile       = "konkur-seed.json"
	seedFiguresDir = "figures"
	// SeedFiguresSubdir is where the seed's figures live inside the
	// uploads directory; seed figureUrl values are /uploads/konkur/<file>.
	SeedFiguresSubdir = "konkur"
)

// EmbeddedSeed is the embedded seed rooted at its directory
// (konkur-seed.json + figures/*.png).
func EmbeddedSeed() fs.FS {
	sub, err := fs.Sub(embeddedSeed, "seed")
	if err != nil {
		panic(err) // the embed pattern guarantees the directory exists
	}
	return sub
}

type seedDoc struct {
	Tips      []Tip      `json:"tips"`
	Questions []Question `json:"questions"`
}

func loadSeed(fsys fs.FS) (seedDoc, error) {
	var doc seedDoc
	data, err := fs.ReadFile(fsys, seedFile)
	if err != nil {
		return doc, err
	}
	err = json.Unmarshal(data, &doc)
	return doc, err
}

func seedFigureNames(fsys fs.FS) []string {
	entries, err := fs.ReadDir(fsys, seedFiguresDir)
	if err != nil {
		return nil
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".png") {
			names = append(names, e.Name())
		}
	}
	return names
}

// SeedStatus is GET /admin/konkur/seed.
type SeedStatus struct {
	Tips             int `json:"tips"`
	Questions        int `json:"questions"`
	MissingTips      int `json:"missing_tips"`
	MissingQuestions int `json:"missing_questions"`
	Figures          int `json:"figures"`
}

// SeedResult is what POST /admin/konkur/seed reports. Invalid items are
// never imported; their descriptions are listed in Problems (capped).
type SeedResult struct {
	AddedTips        int      `json:"added_tips"`
	AddedQuestions   int      `json:"added_questions"`
	SkippedTips      int      `json:"skipped_tips"`
	SkippedQuestions int      `json:"skipped_questions"`
	InvalidTips      int      `json:"invalid_tips"`
	InvalidQuestions int      `json:"invalid_questions"`
	Problems         []string `json:"problems"`
	Version          int64    `json:"version"`
}

// existingIDs returns the ids already stored (published or not).
func (s Service) existingIDs(ctx context.Context) (tips, questions map[string]bool, err error) {
	ts, err := s.repo.ListTips(ctx)
	if err != nil {
		return nil, nil, err
	}
	qs, err := s.repo.ListQuestions(ctx, QuestionFilter{})
	if err != nil {
		return nil, nil, err
	}
	tips = make(map[string]bool, len(ts))
	for _, t := range ts {
		tips[t.ID] = true
	}
	questions = make(map[string]bool, len(qs))
	for _, q := range qs {
		questions[q.ID] = true
	}
	return tips, questions, nil
}

// SeedStatus counts the seed's items and how many are not on the server.
func (s Service) SeedStatus(ctx context.Context, fsys fs.FS) (SeedStatus, error) {
	const op = "konkurservice.SeedStatus"
	doc, err := loadSeed(fsys)
	if err != nil {
		return SeedStatus{}, wrap(op, err)
	}
	haveTips, haveQs, err := s.existingIDs(ctx)
	if err != nil {
		return SeedStatus{}, wrap(op, err)
	}
	st := SeedStatus{Tips: len(doc.Tips), Questions: len(doc.Questions), Figures: len(seedFigureNames(fsys))}
	for _, t := range doc.Tips {
		if !haveTips[strings.TrimSpace(t.ID)] {
			st.MissingTips++
		}
	}
	for _, q := range doc.Questions {
		if !haveQs[strings.TrimSpace(q.ID)] {
			st.MissingQuestions++
		}
	}
	return st, nil
}

// ApplySeed imports the seed. Without overwrite only ids that are not on
// the server yet are added (admin edits are never touched); with it every
// valid seed item replaces the stored one. Invalid items are skipped and
// reported. The version is bumped once, and only if something was written.
func (s Service) ApplySeed(ctx context.Context, fsys fs.FS, overwrite bool) (SeedResult, error) {
	const op = "konkurservice.ApplySeed"
	res := SeedResult{Problems: []string{}}
	doc, err := loadSeed(fsys)
	if err != nil {
		return res, wrap(op, err)
	}
	haveTips, haveQs := map[string]bool{}, map[string]bool{}
	if !overwrite {
		if haveTips, haveQs, err = s.existingIDs(ctx); err != nil {
			return res, wrap(op, err)
		}
	}

	addProblem := func(msg string) {
		if len(res.Problems) < maxImportProblems {
			res.Problems = append(res.Problems, msg)
		}
	}
	var tips []Tip
	for _, t := range doc.Tips {
		t = normalizeTip(t)
		if p := tipProblems(t); len(p) > 0 {
			res.InvalidTips++
			addProblem("نکته " + t.ID + ": " + strings.Join(p, "؛ "))
		} else if haveTips[t.ID] {
			res.SkippedTips++
		} else {
			tips = append(tips, t)
		}
	}
	var questions []Question
	for _, q := range doc.Questions {
		q = normalizeQuestion(q)
		if p := questionProblems(q, true); len(p) > 0 {
			res.InvalidQuestions++
			addProblem("سؤال " + q.ID + ": " + strings.Join(p, "؛ "))
		} else if haveQs[q.ID] {
			res.SkippedQuestions++
		} else {
			questions = append(questions, q)
		}
	}

	if len(tips)+len(questions) > 0 {
		if err := s.repo.Import(ctx, tips, questions); err != nil {
			return res, wrap(op, err)
		}
	}
	res.AddedTips, res.AddedQuestions = len(tips), len(questions)
	if res.Version, err = s.repo.Version(ctx); err != nil {
		return res, wrap(op, err)
	}
	return res, nil
}

// CopySeedFigures copies the seed's figure PNGs into
// <uploadDir>/konkur/ (served at /uploads/konkur/), skipping files that
// already exist. It returns how many files were written.
func CopySeedFigures(fsys fs.FS, uploadDir string) (copied int, err error) {
	names := seedFigureNames(fsys)
	if len(names) == 0 {
		return 0, nil
	}
	dest := filepath.Join(uploadDir, SeedFiguresSubdir)
	if err := os.MkdirAll(dest, 0o755); err != nil {
		return 0, err
	}
	for _, name := range names {
		target := filepath.Join(dest, name)
		if _, statErr := os.Stat(target); statErr == nil {
			continue
		}
		data, err := fs.ReadFile(fsys, path.Join(seedFiguresDir, name))
		if err != nil {
			return copied, err
		}
		if err := os.WriteFile(target, data, 0o644); err != nil {
			return copied, err
		}
		copied++
	}
	return copied, nil
}
