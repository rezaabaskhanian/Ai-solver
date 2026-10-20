package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
)

// The chapter list lives in the app (mobile/MathMotion/src/content/
// curriculum.ts and examSyllabus.ts), not on the server, so it's read from
// the local checkout. A rough parse of the TS source is enough: every
// entry is `id: '...', title: '...'` and chapter ids start with g<grade>.

type chapter struct {
	ID      string   `json:"id"`
	Grade   int      `json:"grade"`
	BookID  string   `json:"book_id"`
	Book    string   `json:"book"`
	Title   string   `json:"title"`
	Lessons []string `json:"lessons,omitempty"`
	Tracks  []string `json:"tracks,omitempty"`
	// Topics the math engine can solve; empty = reference only.
	Topics []string `json:"topics,omitempty"`
}

type examChapter struct {
	ID     string   `json:"id"`
	Skills []string `json:"skills"`
}

type syllabus struct {
	Chapters []chapter
	// Exam chapters by id (grades 6–12; grade 6 has no textbook chapters).
	Exam map[string]examChapter
	// Exam chapter ids in file order.
	ExamOrder []string
}

var (
	reEntry     = regexp.MustCompile(`id: '([^']+)',\s*title: '([^']+)'`)
	reChapterID = regexp.MustCompile(`^g(\d+)[a-z]?_`)
	reLessons   = regexp.MustCompile(`^,?\s*lessons: \[([^\]]*)\]`)
	reTracks    = regexp.MustCompile(`tracks: \[([^\]]*)\]`)
	reTopics    = regexp.MustCompile(`topics: \[([^\]]*)\]`)
	reNextID    = regexp.MustCompile(`id: '`)
	reString    = regexp.MustCompile(`'([^']*)'`)
	reExam      = regexp.MustCompile(`id: '([^']+)',\s*skills: \[([^\]]*)\]`)
)

func quoted(list string) []string {
	var out []string
	for _, m := range reString.FindAllStringSubmatch(list, -1) {
		out = append(out, m[1])
	}
	return out
}

func loadSyllabus(repoDir string) (*syllabus, error) {
	contentDir := filepath.Join(repoDir, "mobile", "MathMotion", "src", "content")
	src, err := os.ReadFile(filepath.Join(contentDir, "curriculum.ts"))
	if err != nil {
		return nil, fmt.Errorf("reading curriculum.ts (set MATHMOTION_REPO_DIR to the Ai-solver checkout): %w", err)
	}
	text := string(src)

	s := &syllabus{Exam: map[string]examChapter{}}
	var bookID, book string
	for _, loc := range reEntry.FindAllStringSubmatchIndex(text, -1) {
		id, title := text[loc[2]:loc[3]], text[loc[4]:loc[5]]
		m := reChapterID.FindStringSubmatch(id)
		if m == nil {
			bookID, book = id, title
			continue
		}
		grade, _ := strconv.Atoi(m[1])
		// This chapter's own fields run up to the next entry.
		rest := text[loc[1]:]
		if next := reNextID.FindStringIndex(rest); next != nil {
			rest = rest[:next[0]]
		}
		ch := chapter{ID: id, Grade: grade, BookID: bookID, Book: book, Title: title}
		if lm := reLessons.FindStringSubmatch(rest); lm != nil {
			ch.Lessons = quoted(lm[1])
		}
		if tm := reTracks.FindStringSubmatch(rest); tm != nil {
			ch.Tracks = quoted(tm[1])
		}
		if tm := reTopics.FindStringSubmatch(rest); tm != nil {
			ch.Topics = quoted(tm[1])
		}
		s.Chapters = append(s.Chapters, ch)
	}
	if len(s.Chapters) == 0 {
		return nil, fmt.Errorf("no chapters found in %s", filepath.Join(contentDir, "curriculum.ts"))
	}

	// The exam syllabus is optional for the report.
	if exam, err := os.ReadFile(filepath.Join(contentDir, "examSyllabus.ts")); err == nil {
		for _, m := range reExam.FindAllStringSubmatch(string(exam), -1) {
			if _, seen := s.Exam[m[1]]; !seen {
				s.ExamOrder = append(s.ExamOrder, m[1])
			}
			s.Exam[m[1]] = examChapter{ID: m[1], Skills: quoted(m[2])}
		}
	}
	return s, nil
}
