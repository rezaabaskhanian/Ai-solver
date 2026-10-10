package konkurservice

import (
	"fmt"
	"strings"
)

func validGrade(g int) bool { return g >= 7 && g <= 12 }

func validTrack(t string) bool { return t == TrackRiazi || t == TrackTajrobi }

// normalizeTip trims ids and makes every list non-nil so the JSON the app
// receives has [] rather than null.
func normalizeTip(t Tip) Tip {
	t.ID = strings.TrimSpace(t.ID)
	t.Title = strings.TrimSpace(t.Title)
	t.ChapterID = strings.TrimSpace(t.ChapterID)
	if t.Body == nil {
		t.Body = []Line{}
	}
	if t.Example != nil {
		if t.Example.Question == nil {
			t.Example.Question = []Line{}
		}
		if t.Example.Solution == nil {
			t.Example.Solution = []Line{}
		}
	}
	return t
}

func normalizeQuestion(q Question) Question {
	q.ID = strings.TrimSpace(q.ID)
	if q.TipIDs == nil {
		q.TipIDs = []string{}
	}
	if q.Choices == nil {
		q.Choices = []string{}
	}
	if q.Solution == nil {
		q.Solution = []Line{}
	}
	if q.Guide != nil {
		hints := make([][]Line, 0, len(q.Guide.Hints))
		for _, h := range q.Guide.Hints {
			if len(h) > 0 {
				hints = append(hints, h)
			}
		}
		q.Guide.Hints = hints
		if q.Guide.Empty() {
			q.Guide = nil
		}
	}
	return q
}

// tipProblems lists everything wrong with a tip (empty = valid).
func tipProblems(t Tip) []string {
	var p []string
	if strings.TrimSpace(t.ID) == "" {
		p = append(p, "شناسه (id) خالی است")
	}
	if strings.TrimSpace(t.Title) == "" {
		p = append(p, "عنوان (title) خالی است")
	}
	if t.Grade != nil && !validGrade(*t.Grade) {
		p = append(p, "پایه (grade) باید null یا یکی از ۷ تا ۱۲ باشد")
	}
	return p
}

// questionProblems lists everything wrong with a question. tipIds may be
// empty only while it is still a draft (requireTips=false).
func questionProblems(q Question, requireTips bool) []string {
	var p []string
	if strings.TrimSpace(q.ID) == "" {
		p = append(p, "شناسه (id) خالی است")
	}
	if strings.TrimSpace(q.Text) == "" {
		p = append(p, "متن سؤال (text) خالی است")
	}
	if len(q.Choices) != 4 {
		p = append(p, fmt.Sprintf("تعداد گزینه‌ها باید دقیقاً ۴ باشد (الان %d)", len(q.Choices)))
	} else {
		for i, c := range q.Choices {
			if strings.TrimSpace(c) == "" {
				p = append(p, fmt.Sprintf("گزینه‌ی %d خالی است", i+1))
			}
		}
	}
	if q.Answer == nil {
		p = append(p, "پاسخ (answer) مشخص نشده است")
	} else if *q.Answer < 0 || *q.Answer > 3 {
		p = append(p, "پاسخ (answer) باید بین ۰ تا ۳ باشد")
	}
	if requireTips {
		if len(q.TipIDs) == 0 {
			p = append(p, "حداقل یک نکته (tipIds) باید انتخاب شود")
		}
		for _, id := range q.TipIDs {
			if strings.TrimSpace(id) == "" {
				p = append(p, "tipIds شامل شناسه‌ی خالی است")
				break
			}
		}
	}
	switch q.Source.Kind {
	case SourceAuthored:
	case SourceKonkur:
		if q.Source.Year <= 0 {
			p = append(p, "سال منبع (source.year) مشخص نشده است")
		}
		if !validTrack(q.Source.Track) {
			p = append(p, "رشته‌ی منبع (source.track) باید riazi یا tajrobi باشد")
		}
		if q.Source.Round < 0 || q.Source.Round > 2 {
			p = append(p, "نوبت (source.round) باید ۱ یا ۲ باشد")
		}
	default:
		p = append(p, "نوع منبع (source.kind) باید authored یا konkur باشد")
	}
	return p
}
