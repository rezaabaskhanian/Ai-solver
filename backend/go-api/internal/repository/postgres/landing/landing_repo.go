// Package postgreslanding implements [landingservice.Repository] on the
// landing_* tables (migration 009).
package postgreslanding

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	landing "mathmotion/go-api/internal/service/landing"
)

type DB struct {
	conn *pgxpool.Pool
}

func New(conn *pgxpool.Pool) DB {
	return DB{conn: conn}
}

// validID keeps a malformed id from reaching postgres as a 500 ("invalid
// input syntax for type uuid") — it's simply not found.
func validID(ids ...string) error {
	for _, id := range ids {
		if _, err := uuid.Parse(id); err != nil {
			return landing.ErrNotFound
		}
	}
	return nil
}

// exec runs a statement that must touch a row; none means not found.
func (r DB) exec(ctx context.Context, query string, args ...any) error {
	tag, err := r.conn.Exec(ctx, query, args...)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return landing.ErrNotFound
	}
	return nil
}

// ---------- settings ----------

func (r DB) GetSettings(ctx context.Context) (landing.Settings, error) {
	var s landing.Settings
	err := r.conn.QueryRow(ctx, `
		SELECT hero_title, hero_subtitle, hero_image_url, google_play_url, bazaar_url, cta_title, cta_subtitle
		  FROM landing_settings WHERE id = 1
	`).Scan(&s.HeroTitle, &s.HeroSubtitle, &s.HeroImageURL, &s.GooglePlayURL, &s.BazaarURL, &s.CTATitle, &s.CTASubtitle)
	if err != nil {
		return s, fmt.Errorf("reading landing settings: %w", err)
	}
	return s, nil
}

func (r DB) UpdateSettings(ctx context.Context, s landing.Settings) error {
	_, err := r.conn.Exec(ctx, `
		INSERT INTO landing_settings (id, hero_title, hero_subtitle, hero_image_url, google_play_url, bazaar_url, cta_title, cta_subtitle)
		VALUES (1, $1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO UPDATE SET
			hero_title = EXCLUDED.hero_title, hero_subtitle = EXCLUDED.hero_subtitle,
			hero_image_url = EXCLUDED.hero_image_url, google_play_url = EXCLUDED.google_play_url,
			bazaar_url = EXCLUDED.bazaar_url, cta_title = EXCLUDED.cta_title,
			cta_subtitle = EXCLUDED.cta_subtitle, updated_at = now()
	`, s.HeroTitle, s.HeroSubtitle, s.HeroImageURL, s.GooglePlayURL, s.BazaarURL, s.CTATitle, s.CTASubtitle)
	if err != nil {
		return fmt.Errorf("saving landing settings: %w", err)
	}
	return nil
}

// ---------- highlights ----------

func (r DB) ListHighlights(ctx context.Context, kind string) ([]landing.Highlight, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT id::text, icon, title, description, position
		  FROM landing_highlights WHERE kind = $1
		 ORDER BY position, created_at
	`, kind)
	if err != nil {
		return nil, fmt.Errorf("listing highlights: %w", err)
	}
	defer rows.Close()

	out := []landing.Highlight{}
	for rows.Next() {
		var h landing.Highlight
		if err := rows.Scan(&h.ID, &h.Icon, &h.Title, &h.Description, &h.Position); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (r DB) CreateHighlight(ctx context.Context, kind string, h landing.Highlight) (landing.Highlight, error) {
	err := r.conn.QueryRow(ctx, `
		INSERT INTO landing_highlights (kind, icon, title, description, position)
		VALUES ($1, $2, $3, $4, $5) RETURNING id::text
	`, kind, h.Icon, h.Title, h.Description, h.Position).Scan(&h.ID)
	if err != nil {
		return h, fmt.Errorf("creating highlight: %w", err)
	}
	return h, nil
}

func (r DB) UpdateHighlight(ctx context.Context, kind string, h landing.Highlight) error {
	if err := validID(h.ID); err != nil {
		return err
	}
	return r.exec(ctx, `
		UPDATE landing_highlights SET icon = $3, title = $4, description = $5, position = $6, updated_at = now()
		 WHERE id = $1 AND kind = $2
	`, h.ID, kind, h.Icon, h.Title, h.Description, h.Position)
}

func (r DB) DeleteHighlight(ctx context.Context, kind, id string) error {
	if err := validID(id); err != nil {
		return err
	}
	return r.exec(ctx, `DELETE FROM landing_highlights WHERE id = $1 AND kind = $2`, id, kind)
}

// ---------- sections ----------

func (r DB) ListSections(ctx context.Context) ([]landing.Section, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT id::text, tab_label, title, description, position
		  FROM landing_sections ORDER BY position, created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("listing sections: %w", err)
	}
	sections := []landing.Section{}
	index := map[string]int{}
	for rows.Next() {
		s := landing.Section{Images: []landing.Image{}}
		if err := rows.Scan(&s.ID, &s.TabLabel, &s.Title, &s.Description, &s.Position); err != nil {
			rows.Close()
			return nil, err
		}
		index[s.ID] = len(sections)
		sections = append(sections, s)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	imgs, err := r.conn.Query(ctx, `
		SELECT id::text, section_id::text, image_url
		  FROM landing_section_images ORDER BY position, created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("listing section images: %w", err)
	}
	defer imgs.Close()
	for imgs.Next() {
		var img landing.Image
		var sectionID string
		if err := imgs.Scan(&img.ID, &sectionID, &img.URL); err != nil {
			return nil, err
		}
		if i, ok := index[sectionID]; ok {
			sections[i].Images = append(sections[i].Images, img)
		}
	}
	return sections, imgs.Err()
}

func (r DB) CreateSection(ctx context.Context, s landing.Section) (landing.Section, error) {
	err := r.conn.QueryRow(ctx, `
		INSERT INTO landing_sections (tab_label, title, description, position)
		VALUES ($1, $2, $3, $4) RETURNING id::text
	`, s.TabLabel, s.Title, s.Description, s.Position).Scan(&s.ID)
	if err != nil {
		return s, fmt.Errorf("creating section: %w", err)
	}
	s.Images = []landing.Image{}
	return s, nil
}

func (r DB) UpdateSection(ctx context.Context, s landing.Section) error {
	if err := validID(s.ID); err != nil {
		return err
	}
	return r.exec(ctx, `
		UPDATE landing_sections SET tab_label = $2, title = $3, description = $4, position = $5, updated_at = now()
		 WHERE id = $1
	`, s.ID, s.TabLabel, s.Title, s.Description, s.Position)
}

func (r DB) DeleteSection(ctx context.Context, id string) error {
	if err := validID(id); err != nil {
		return err
	}
	return r.exec(ctx, `DELETE FROM landing_sections WHERE id = $1`, id)
}

func (r DB) AddSectionImage(ctx context.Context, sectionID, url string, position int) (landing.Image, error) {
	if err := validID(sectionID); err != nil {
		return landing.Image{}, err
	}
	img := landing.Image{URL: url}
	err := r.conn.QueryRow(ctx, `
		INSERT INTO landing_section_images (section_id, image_url, position)
		SELECT id, $2, $3 FROM landing_sections WHERE id = $1
		RETURNING id::text
	`, sectionID, url, position).Scan(&img.ID)
	if err != nil {
		return img, landing.ErrNotFound
	}
	return img, nil
}

func (r DB) DeleteSectionImage(ctx context.Context, sectionID, imageID string) error {
	if err := validID(sectionID, imageID); err != nil {
		return err
	}
	return r.exec(ctx, `DELETE FROM landing_section_images WHERE id = $1 AND section_id = $2`, imageID, sectionID)
}

// ---------- FAQs ----------

func (r DB) ListFAQs(ctx context.Context) ([]landing.FAQ, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT id::text, question, answer, position FROM landing_faqs ORDER BY position, created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("listing faqs: %w", err)
	}
	defer rows.Close()

	out := []landing.FAQ{}
	for rows.Next() {
		var f landing.FAQ
		if err := rows.Scan(&f.ID, &f.Question, &f.Answer, &f.Position); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r DB) CreateFAQ(ctx context.Context, f landing.FAQ) (landing.FAQ, error) {
	err := r.conn.QueryRow(ctx, `
		INSERT INTO landing_faqs (question, answer, position) VALUES ($1, $2, $3) RETURNING id::text
	`, f.Question, f.Answer, f.Position).Scan(&f.ID)
	if err != nil {
		return f, fmt.Errorf("creating faq: %w", err)
	}
	return f, nil
}

func (r DB) UpdateFAQ(ctx context.Context, f landing.FAQ) error {
	if err := validID(f.ID); err != nil {
		return err
	}
	return r.exec(ctx, `
		UPDATE landing_faqs SET question = $2, answer = $3, position = $4, updated_at = now() WHERE id = $1
	`, f.ID, f.Question, f.Answer, f.Position)
}

func (r DB) DeleteFAQ(ctx context.Context, id string) error {
	if err := validID(id); err != nil {
		return err
	}
	return r.exec(ctx, `DELETE FROM landing_faqs WHERE id = $1`, id)
}
