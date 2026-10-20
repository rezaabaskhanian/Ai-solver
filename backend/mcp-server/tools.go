package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// The safety rule of this server: nothing goes live and nothing is deleted.
//   - Every write is a pending draft in the panel's review queue
//     (POST /admin/konkur/drafts or /admin/konkur/extract); the admin
//     approves it in the panel. An edit of a published item is a draft
//     with the same id, approved there with «جایگزینی».
//   - update_draft only touches pending drafts.
//   - There are no approve, reject, delete, seed, user, billing or
//     settings tools.

type obj = map[string]any

func textResult(raw []byte) *mcp.CallToolResult {
	return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: string(raw)}}}
}

func jsonResult(v any) (*mcp.CallToolResult, any, error) {
	raw, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return nil, nil, err
	}
	return textResult(raw), nil, nil
}

func rawResult(raw []byte, err error) (*mcp.CallToolResult, any, error) {
	if err != nil {
		return nil, nil, err
	}
	return textResult(raw), nil, nil
}

func str(m obj, key string) string {
	s, _ := m[key].(string)
	return s
}

func list(m obj, key string) []any {
	l, _ := m[key].([]any)
	return l
}

// shorten cuts long Persian text for the compact listings.
func shorten(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}

// lineText flattens a KonkurLine list (strings or {"math": "..."}).
func lineText(lines []any) string {
	parts := make([]string, 0, len(lines))
	for _, l := range lines {
		switch v := l.(type) {
		case string:
			parts = append(parts, v)
		case map[string]any:
			if m, ok := v["math"].(string); ok {
				parts = append(parts, m)
			}
		}
	}
	return strings.Join(parts, " ")
}

func query(params map[string]string) string {
	v := url.Values{}
	for k, val := range params {
		if val = strings.TrimSpace(val); val != "" {
			v.Set(k, val)
		}
	}
	if len(v) == 0 {
		return ""
	}
	return "?" + v.Encode()
}

// ---------- server data ----------

func (c *client) tips(ctx context.Context) ([]obj, error) {
	var out struct {
		Tips []obj `json:"tips"`
	}
	err := c.getInto(ctx, "/admin/konkur/tips", &out)
	return out.Tips, err
}

func (c *client) questions(ctx context.Context, q string) ([]obj, error) {
	var out struct {
		Questions []obj `json:"questions"`
	}
	err := c.getInto(ctx, "/admin/konkur/questions"+q, &out)
	return out.Questions, err
}

func (c *client) exercises(ctx context.Context, q string) ([]obj, error) {
	var out struct {
		Exercises []obj `json:"exercises"`
	}
	err := c.getInto(ctx, "/admin/textbook/exercises"+q, &out)
	return out.Exercises, err
}

func (c *client) drafts(ctx context.Context, status string) ([]obj, error) {
	var out struct {
		Drafts []obj `json:"drafts"`
	}
	err := c.getInto(ctx, "/admin/konkur/drafts"+query(map[string]string{"status": status}), &out)
	return out.Drafts, err
}

// tipChapters maps tip id → chapterId.
func tipChapters(tips []obj) map[string]string {
	m := make(map[string]string, len(tips))
	for _, t := range tips {
		m[str(t, "id")] = str(t, "chapterId")
	}
	return m
}

// questionChapter is the app's chapterBank rule: a question belongs to
// the chapter of its first (main) tip.
func questionChapter(q obj, tipChapter map[string]string) string {
	ids := list(q, "tipIds")
	if len(ids) == 0 {
		return ""
	}
	id, _ := ids[0].(string)
	return tipChapter[id]
}

func sourceLabel(q obj) string {
	src, _ := q["source"].(map[string]any)
	if src == nil || src["kind"] != "konkur" {
		return "authored"
	}
	label := fmt.Sprintf("konkur %v %v", src["track"], src["year"])
	if r, ok := src["round"].(float64); ok && r > 0 {
		label += fmt.Sprintf(" r%d", int(r))
	}
	if src["abroad"] == true {
		label += " abroad"
	}
	if n, ok := src["number"].(float64); ok && n > 0 {
		label += fmt.Sprintf(" #%d", int(n))
	}
	return label
}

func hasGuide(q obj) bool {
	g, _ := q["guide"].(map[string]any)
	return len(g) > 0
}

// ---------- inputs ----------

type noArgs struct{}

type idArg struct {
	ID string `json:"id" jsonschema:"the item id"`
}

type daysArg struct {
	Days int `json:"days,omitempty" jsonschema:"number of past days (default 30)"`
}

type curriculumArgs struct {
	Grade int `json:"grade,omitempty" jsonschema:"only this grade (7–12); 0 = all"`
}

type listTipsArgs struct {
	Grade     int    `json:"grade,omitempty" jsonschema:"only this grade; 0 = all"`
	ChapterID string `json:"chapter_id,omitempty" jsonschema:"only this chapter (curriculum id, e.g. g9_reals)"`
	Query     string `json:"q,omitempty" jsonschema:"substring of the title"`
}

type listQuestionsArgs struct {
	Year      string `json:"year,omitempty" jsonschema:"konkur year, e.g. 1402"`
	Track     string `json:"track,omitempty" jsonschema:"riazi | tajrobi"`
	TipID     string `json:"tip_id,omitempty" jsonschema:"questions tagged with this tip"`
	ChapterID string `json:"chapter_id,omitempty" jsonschema:"questions whose main (first) tip is in this chapter — the chapter-exam bank"`
	Query     string `json:"q,omitempty" jsonschema:"text search"`
}

type listExercisesArgs struct {
	BookID    string `json:"book_id,omitempty" jsonschema:"e.g. math9"`
	ChapterID string `json:"chapter_id,omitempty" jsonschema:"e.g. g9_reals"`
	Query     string `json:"q,omitempty" jsonschema:"text search"`
}

type listDraftsArgs struct {
	Status string `json:"status,omitempty" jsonschema:"pending (default) | approved | rejected | all"`
}

type draftItem struct {
	Kind string `json:"kind" jsonschema:"tip | question | exercise"`
	Data obj    `json:"data" jsonschema:"the document; see create_drafts' description for each kind's shape"`
}

type createDraftsArgs struct {
	SourceName string      `json:"source_name,omitempty" jsonschema:"shown in the panel's review list (default: claude)"`
	Drafts     []draftItem `json:"drafts" jsonschema:"1–100 items"`
}

type updateDraftArgs struct {
	ID   string `json:"id" jsonschema:"draft id (from list_drafts or create_drafts)"`
	Data obj    `json:"data" jsonschema:"the full replacement document (same shape as when created)"`
}

type guideArgs struct {
	Question obj `json:"question" jsonschema:"a question document (saved or not): text, choices, answer, solution, tipIds..."`
}

type extractArgs struct {
	Source     string `json:"source" jsonschema:"absolute local path or http(s) URL of a page image (png/jpeg/webp, ≤8MB). Render PDF pages to images first."`
	Kind       string `json:"kind" jsonschema:"questions | tips | exercises | notes"`
	SourceName string `json:"source_name,omitempty" jsonschema:"label in the review list, e.g. the file name"`
	PageLabel  string `json:"page_label,omitempty" jsonschema:"page label shown with the drafts"`
	Year       int    `json:"year,omitempty" jsonschema:"questions from an official konkur booklet: its year"`
	Track      string `json:"track,omitempty" jsonschema:"questions: riazi | tajrobi"`
	Round      int    `json:"round,omitempty" jsonschema:"questions since 1402: 1 or 2"`
	Abroad     bool   `json:"abroad,omitempty" jsonschema:"questions: the abroad (خارج از کشور) booklet"`
	Rewrite    bool   `json:"rewrite,omitempty" jsonschema:"questions from a commercial test book: AI rewrites and re-solves them as 'authored'"`
	BookID     string `json:"book_id,omitempty" jsonschema:"exercises: textbook id, e.g. math9"`
	ChapterID  string `json:"chapter_id,omitempty" jsonschema:"exercises / notes (and optionally questions): chapter id"`
	Page       int    `json:"page,omitempty" jsonschema:"exercises: the book page number"`
	Lesson     int    `json:"lesson,omitempty" jsonschema:"exercises: 1-based lesson in the chapter"`
	Grade      int    `json:"grade,omitempty" jsonschema:"notes: the grade"`
}

type sourceArg struct {
	Source string `json:"source" jsonschema:"absolute local path or http(s) URL of an image"`
}

const draftShapes = `Shapes (camelCase; a "line" is a Persian string or {"math": "..."} — math always on its own line, never inline in Persian text):
- tip: {id, grade (7–12 or null for general), chapterId, tracks?: ["riazi"|"tajrobi"], title, body: [line], details?: [line], example?: {question: [line], solution: [line]}}
- question: {id, tipIds: [main tip first — it decides the chapter-exam bank], text, expression?, figureUrl?, choices: [4 strings], choicesMath?: bool, answer: 0..3, solution: [line], guide?: {given, asked, hints: [[line]], trap}, source: {kind:"authored"} | {kind:"konkur", year, track, number?, round?, abroad?}}
- exercise: {id?, bookId, chapterId, lesson?, section: exercise|classwork|activity, page, number, text: [line], figureUrl?, parts?: [{label, text, answer?, solution}], answer?, solution: [line], guide?, tipIds?, free?}
Reuse an existing id to propose an edit (the admin approves it with overwrite).`

// ---------- tools ----------

func registerTools(s *mcp.Server, c *client, repoDir string) {
	ro := &mcp.ToolAnnotations{ReadOnlyHint: true}

	// ---- curriculum and health ----
	mcp.AddTool(s, &mcp.Tool{Name: "list_curriculum", Annotations: ro,
		Description: "The app's textbook chapters (grades 7–12): id, book, title, lessons, tracks, engine topics, and the chapter exam's generator skills. Ids are what tips/exercises use as chapterId."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in curriculumArgs) (*mcp.CallToolResult, any, error) {
			syl, err := loadSyllabus(repoDir)
			if err != nil {
				return nil, nil, err
			}
			out := []obj{}
			for _, ch := range syl.Chapters {
				if in.Grade != 0 && ch.Grade != in.Grade {
					continue
				}
				out = append(out, obj{
					"id": ch.ID, "grade": ch.Grade, "book_id": ch.BookID, "book": ch.Book, "title": ch.Title,
					"lessons": ch.Lessons, "tracks": ch.Tracks, "topics": ch.Topics,
					"exam_skills": syl.Exam[ch.ID].Skills,
				})
			}
			return jsonResult(out)
		})

	mcp.AddTool(s, &mcp.Tool{Name: "content_health", Annotations: ro,
		Description: "What content is missing, chapter by chapter: tips, chapter-exam bank questions, textbook exercises, whether the chapter exam can run at all, plus questions without a solving guide or main tip, pending drafts and the bundled seed not yet imported."},
		func(ctx context.Context, _ *mcp.CallToolRequest, _ noArgs) (*mcp.CallToolResult, any, error) {
			return contentHealth(ctx, c, repoDir)
		})

	// ---- tips ----
	mcp.AddTool(s, &mcp.Tool{Name: "list_tips", Annotations: ro,
		Description: "List konkur tips / booklet notes (compact: id, grade, chapterId, tracks, title, question count). Use get_tip for the full text."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in listTipsArgs) (*mcp.CallToolResult, any, error) {
			tips, err := c.tips(ctx)
			if err != nil {
				return nil, nil, err
			}
			qs, err := c.questions(ctx, "")
			if err != nil {
				return nil, nil, err
			}
			used := map[string]int{}
			for _, q := range qs {
				for _, id := range list(q, "tipIds") {
					if s, ok := id.(string); ok {
						used[s]++
					}
				}
			}
			out := []obj{}
			for _, t := range tips {
				grade, _ := t["grade"].(float64)
				if in.Grade != 0 && int(grade) != in.Grade {
					continue
				}
				if in.ChapterID != "" && str(t, "chapterId") != in.ChapterID {
					continue
				}
				if in.Query != "" && !strings.Contains(str(t, "title"), in.Query) {
					continue
				}
				out = append(out, obj{
					"id": t["id"], "grade": t["grade"], "chapterId": t["chapterId"], "tracks": t["tracks"],
					"title": t["title"], "questions": used[str(t, "id")],
					"has_details": len(list(t, "details")) > 0, "has_example": t["example"] != nil,
				})
			}
			return jsonResult(out)
		})

	mcp.AddTool(s, &mcp.Tool{Name: "get_tip", Annotations: ro, Description: "One tip, full document."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in idArg) (*mcp.CallToolResult, any, error) {
			tips, err := c.tips(ctx)
			if err != nil {
				return nil, nil, err
			}
			for _, t := range tips {
				if str(t, "id") == strings.TrimSpace(in.ID) {
					return jsonResult(t)
				}
			}
			return nil, nil, fmt.Errorf("tip %q not found", in.ID)
		})

	// ---- questions ----
	mcp.AddTool(s, &mcp.Tool{Name: "list_questions", Annotations: ro,
		Description: "List multiple-choice questions (compact: id, chapter of the main tip, source, answer, has guide/figure, start of the text). Use get_question for the full document."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in listQuestionsArgs) (*mcp.CallToolResult, any, error) {
			qs, err := c.questions(ctx, query(map[string]string{"year": in.Year, "track": in.Track, "tipId": in.TipID, "q": in.Query}))
			if err != nil {
				return nil, nil, err
			}
			tips, err := c.tips(ctx)
			if err != nil {
				return nil, nil, err
			}
			chapters := tipChapters(tips)
			out := []obj{}
			for _, q := range qs {
				ch := questionChapter(q, chapters)
				if in.ChapterID != "" && ch != in.ChapterID {
					continue
				}
				out = append(out, obj{
					"id": q["id"], "chapter": ch, "tipIds": q["tipIds"], "source": sourceLabel(q),
					"answer": q["answer"], "has_guide": hasGuide(q), "has_figure": str(q, "figureUrl") != "",
					"text": shorten(str(q, "text"), 90),
				})
			}
			return jsonResult(out)
		})

	mcp.AddTool(s, &mcp.Tool{Name: "get_question", Annotations: ro, Description: "One question, full document."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in idArg) (*mcp.CallToolResult, any, error) {
			qs, err := c.questions(ctx, "")
			if err != nil {
				return nil, nil, err
			}
			for _, q := range qs {
				if str(q, "id") == strings.TrimSpace(in.ID) {
					return jsonResult(q)
				}
			}
			return nil, nil, fmt.Errorf("question %q not found", in.ID)
		})

	// ---- textbook exercises ----
	mcp.AddTool(s, &mcp.Tool{Name: "list_exercises", Annotations: ro,
		Description: "List textbook exercises (compact: id, book, chapter, lesson, section, page, number, parts, has solution, free, start of the text)."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in listExercisesArgs) (*mcp.CallToolResult, any, error) {
			ex, err := c.exercises(ctx, query(map[string]string{"bookId": in.BookID, "chapterId": in.ChapterID, "q": in.Query}))
			if err != nil {
				return nil, nil, err
			}
			out := make([]obj, 0, len(ex))
			for _, e := range ex {
				out = append(out, obj{
					"id": e["id"], "bookId": e["bookId"], "chapterId": e["chapterId"], "lesson": e["lesson"],
					"section": e["section"], "page": e["page"], "number": e["number"], "parts": len(list(e, "parts")),
					"has_solution": len(list(e, "solution")) > 0 || len(list(e, "parts")) > 0, "free": e["free"],
					"text": shorten(lineText(list(e, "text")), 90),
				})
			}
			return jsonResult(out)
		})

	mcp.AddTool(s, &mcp.Tool{Name: "get_exercise", Annotations: ro, Description: "One textbook exercise, full document."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in idArg) (*mcp.CallToolResult, any, error) {
			ex, err := c.exercises(ctx, "")
			if err != nil {
				return nil, nil, err
			}
			for _, e := range ex {
				if str(e, "id") == strings.TrimSpace(in.ID) {
					return jsonResult(e)
				}
			}
			return nil, nil, fmt.Errorf("exercise %q not found", in.ID)
		})

	// ---- drafts (the only way to write) ----
	mcp.AddTool(s, &mcp.Tool{Name: "create_drafts",
		Description: "Add tips, questions and/or textbook exercises to the admin panel's review queue as pending drafts (nothing reaches the app until the admin approves). " +
			"The reply lists each draft's warnings — fix them with update_draft. " + draftShapes},
		func(ctx context.Context, _ *mcp.CallToolRequest, in createDraftsArgs) (*mcp.CallToolResult, any, error) {
			if len(in.Drafts) == 0 {
				return nil, nil, errors.New("drafts is required")
			}
			source := strings.TrimSpace(in.SourceName)
			if source == "" {
				source = "claude"
			}
			items := make([]obj, 0, len(in.Drafts))
			for _, d := range in.Drafts {
				items = append(items, obj{"kind": d.Kind, "source_name": source, "data": d.Data})
			}
			raw, err := c.sendJSON(ctx, http.MethodPost, "/admin/konkur/drafts", obj{"drafts": items})
			if err != nil {
				return nil, nil, err
			}
			return draftSummary(raw)
		})

	mcp.AddTool(s, &mcp.Tool{Name: "list_drafts", Annotations: ro,
		Description: "Drafts in the review queue (compact: id, kind, source, item id, title/text, warnings). Use get_draft for the document."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in listDraftsArgs) (*mcp.CallToolResult, any, error) {
			status := in.Status
			switch status {
			case "":
				status = "pending"
			case "all":
				status = ""
			}
			drafts, err := c.drafts(ctx, status)
			if err != nil {
				return nil, nil, err
			}
			out := make([]obj, 0, len(drafts))
			for _, d := range drafts {
				out = append(out, compactDraft(d))
			}
			return jsonResult(out)
		})

	mcp.AddTool(s, &mcp.Tool{Name: "get_draft", Annotations: ro, Description: "One draft with its full document and warnings."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in idArg) (*mcp.CallToolResult, any, error) {
			drafts, err := c.drafts(ctx, "")
			if err != nil {
				return nil, nil, err
			}
			for _, d := range drafts {
				if str(d, "id") == strings.TrimSpace(in.ID) {
					return jsonResult(d)
				}
			}
			return nil, nil, fmt.Errorf("draft %q not found", in.ID)
		})

	mcp.AddTool(s, &mcp.Tool{Name: "update_draft",
		Description: "Replace a pending draft's document (it may stay incomplete; the reply has the new warnings). Approved or rejected drafts can't be changed."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in updateDraftArgs) (*mcp.CallToolResult, any, error) {
			id := strings.TrimSpace(in.ID)
			if id == "" || in.Data == nil {
				return nil, nil, errors.New("id and data are required")
			}
			raw, err := c.sendJSON(ctx, http.MethodPut, "/admin/konkur/drafts/"+url.PathEscape(id), obj{"data": in.Data})
			if err != nil {
				return nil, nil, err
			}
			var d obj
			if err := json.Unmarshal(raw, &d); err != nil {
				return textResult(raw), nil, nil
			}
			return jsonResult(compactDraft(d))
		})

	// ---- AI helpers ----
	mcp.AddTool(s, &mcp.Tool{Name: "generate_question_guide",
		Description: "The server's AI drafts a solving guide (given / asked / hints / trap) for a question. Saves nothing — put it in the question's guide and create_drafts / update_draft."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in guideArgs) (*mcp.CallToolResult, any, error) {
			if in.Question == nil {
				return nil, nil, errors.New("question is required")
			}
			return rawResult(c.sendJSON(ctx, http.MethodPost, "/admin/konkur/guide", in.Question))
		})

	mcp.AddTool(s, &mcp.Tool{Name: "extract_page",
		Description: "Send one page image to the server's vision AI, which stores every item it reads as pending drafts (same as the panel's PDF/photo upload). Costs one AI call per page. Check the drafts with list_drafts."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in extractArgs) (*mcp.CallToolResult, any, error) {
			itoa := func(n int) string {
				if n == 0 {
					return ""
				}
				return strconv.Itoa(n)
			}
			btoa := func(b bool) string {
				if b {
					return "true"
				}
				return ""
			}
			raw, err := c.multipartPost(ctx, "/admin/konkur/extract", in.Source, map[string]string{
				"kind": in.Kind, "source_name": in.SourceName, "page_label": in.PageLabel,
				"year": itoa(in.Year), "track": in.Track, "round": itoa(in.Round),
				"abroad": btoa(in.Abroad), "rewrite": btoa(in.Rewrite),
				"book_id": in.BookID, "chapter_id": in.ChapterID,
				"page": itoa(in.Page), "lesson": itoa(in.Lesson), "grade": itoa(in.Grade),
			})
			if err != nil {
				return nil, nil, err
			}
			var res struct {
				Drafts  []obj `json:"drafts"`
				Skipped []obj `json:"skipped"`
			}
			if err := json.Unmarshal(raw, &res); err != nil {
				return textResult(raw), nil, nil
			}
			drafts := make([]obj, 0, len(res.Drafts))
			for _, d := range res.Drafts {
				drafts = append(drafts, compactDraft(d))
			}
			return jsonResult(obj{"drafts": drafts, "skipped": res.Skipped})
		})

	mcp.AddTool(s, &mcp.Tool{Name: "upload_image",
		Description: "Upload a figure image; returns its url (/uploads/...) to use as a question's or exercise's figureUrl."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in sourceArg) (*mcp.CallToolResult, any, error) {
			return rawResult(c.multipartPost(ctx, "/admin/upload", in.Source, nil))
		})

	// ---- reports ----
	mcp.AddTool(s, &mcp.Tool{Name: "get_ai_usage_report", Annotations: ro, Description: "AI calls and their cost (scans, extraction, guides) over the past days."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in daysArg) (*mcp.CallToolResult, any, error) {
			return rawResult(c.get(ctx, "/admin/ai-usage"+query(map[string]string{"days": strconv.Itoa(days(in.Days))})))
		})

	mcp.AddTool(s, &mcp.Tool{Name: "get_analytics", Annotations: ro, Description: "App usage summary (telemetry): actives, screens, events."},
		func(ctx context.Context, _ *mcp.CallToolRequest, in daysArg) (*mcp.CallToolResult, any, error) {
			return rawResult(c.get(ctx, "/admin/telemetry/summary"+query(map[string]string{"days": strconv.Itoa(days(in.Days))})))
		})
}

func days(d int) int {
	if d <= 0 {
		return 30
	}
	return d
}

// compactDraft keeps what's needed to recognise a draft.
func compactDraft(d obj) obj {
	data, _ := d["data"].(map[string]any)
	label := str(data, "title")
	if label == "" {
		label = str(data, "text")
	}
	if label == "" {
		label = lineText(list(data, "text"))
	}
	return obj{
		"id": d["id"], "kind": d["kind"], "status": d["status"], "source": d["source_name"],
		"item_id": data["id"], "label": shorten(label, 80), "warnings": d["warnings"],
	}
}

func draftSummary(raw []byte) (*mcp.CallToolResult, any, error) {
	var res struct {
		Drafts []obj `json:"drafts"`
	}
	if err := json.Unmarshal(raw, &res); err != nil {
		return textResult(raw), nil, nil
	}
	out := make([]obj, 0, len(res.Drafts))
	for _, d := range res.Drafts {
		out = append(out, compactDraft(d))
	}
	return jsonResult(obj{"created": len(out), "drafts": out,
		"next": "The admin reviews and approves these in the panel's «پیش‌نویس‌ها» list."})
}

// ---------- content health ----------

type chapterHealth struct {
	ID        string `json:"id"`
	Grade     int    `json:"grade"`
	Book      string `json:"book"`
	Title     string `json:"title"`
	Tips      int    `json:"tips"`
	Bank      int    `json:"bank_questions"`
	Exercises int    `json:"exercises"`
	// The chapter exam runs when it has generator skills or bank questions.
	Generator bool `json:"exam_generator"`
	ExamReady bool `json:"exam_ready"`
}

func contentHealth(ctx context.Context, c *client, repoDir string) (*mcp.CallToolResult, any, error) {
	tips, err := c.tips(ctx)
	if err != nil {
		return nil, nil, err
	}
	qs, err := c.questions(ctx, "")
	if err != nil {
		return nil, nil, err
	}
	ex, err := c.exercises(ctx, "")
	if err != nil {
		return nil, nil, err
	}
	pending, err := c.drafts(ctx, "pending")
	if err != nil {
		return nil, nil, err
	}
	var seed obj
	_ = c.getInto(ctx, "/admin/konkur/seed", &seed)

	tipCount, bankCount, exCount := map[string]int{}, map[string]int{}, map[string]int{}
	for _, t := range tips {
		tipCount[str(t, "chapterId")]++
	}
	chapters := tipChapters(tips)
	var noGuide, noTip, unknownTip []string
	for _, q := range qs {
		id := str(q, "id")
		if ch := questionChapter(q, chapters); ch != "" {
			bankCount[ch]++
		}
		if !hasGuide(q) {
			noGuide = append(noGuide, id)
		}
		ids := list(q, "tipIds")
		if len(ids) == 0 {
			noTip = append(noTip, id)
		}
		for _, t := range ids {
			if s, _ := t.(string); s != "" {
				if _, ok := chapters[s]; !ok {
					unknownTip = append(unknownTip, id+" → "+s)
				}
			}
		}
	}
	var noSolution []string
	for _, e := range ex {
		exCount[str(e, "chapterId")]++
		if len(list(e, "solution")) == 0 && len(list(e, "parts")) == 0 {
			noSolution = append(noSolution, str(e, "id"))
		}
	}

	report := obj{
		"totals":                     obj{"tips": len(tips), "questions": len(qs), "exercises": len(ex), "pending_drafts": len(pending)},
		"seed":                       seed,
		"questions_without_guide":    obj{"count": len(noGuide), "ids": firstN(noGuide, 40)},
		"questions_without_tip":      noTip,
		"questions_with_unknown_tip": unknownTip,
		"exercises_without_solution": noSolution,
	}

	syl, err := loadSyllabus(repoDir)
	if err != nil {
		report["chapters_error"] = err.Error()
		return jsonResult(report)
	}
	var rows []chapterHealth
	var examBlocked, noTips, noExercises []string
	for _, ch := range syl.Chapters {
		h := chapterHealth{
			ID: ch.ID, Grade: ch.Grade, Book: ch.Book, Title: ch.Title,
			Tips: tipCount[ch.ID], Bank: bankCount[ch.ID], Exercises: exCount[ch.ID],
		}
		h.Generator = len(syl.Exam[ch.ID].Skills) > 0
		h.ExamReady = h.Generator || h.Bank > 0
		rows = append(rows, h)
		label := fmt.Sprintf("%s (%s، %s)", ch.ID, ch.Book, ch.Title)
		if !h.ExamReady {
			examBlocked = append(examBlocked, label)
		}
		if h.Tips == 0 {
			noTips = append(noTips, label)
		}
		if h.Exercises == 0 {
			noExercises = append(noExercises, label)
		}
	}
	// Ids used in content that the curriculum doesn't know (typos).
	known := map[string]bool{}
	for _, ch := range syl.Chapters {
		known[ch.ID] = true
	}
	var strayChapters []string
	for id := range tipCount {
		if id != "" && !known[id] {
			strayChapters = append(strayChapters, "tip chapterId "+id)
		}
	}
	for id := range exCount {
		if id != "" && !known[id] {
			strayChapters = append(strayChapters, "exercise chapterId "+id)
		}
	}
	sort.Strings(strayChapters)

	report["chapters"] = rows
	report["chapter_exam_not_ready"] = obj{"count": len(examBlocked), "chapters": examBlocked,
		"fix": "add bank questions: questions whose first tip has this chapterId"}
	report["chapters_without_tips"] = obj{"count": len(noTips), "chapters": noTips}
	report["chapters_without_exercises"] = obj{"count": len(noExercises), "chapters": noExercises}
	report["unknown_chapter_ids"] = strayChapters
	return jsonResult(report)
}

func firstN(s []string, n int) []string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
