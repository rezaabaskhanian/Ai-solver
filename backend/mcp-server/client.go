package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// client talks to the same /admin API as the panel, with the static
// ADMIN_TOKEN as its bearer token (backend/go-api middleware.Admin).
type client struct {
	baseURL string
	token   string
	http    *http.Client
}

func newClient(baseURL, token string) *client {
	return &client{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		// Page extraction and guide generation call the AI and can be slow.
		http: &http.Client{Timeout: 5 * time.Minute},
	}
}

// do sends one request and returns the raw JSON body.
func (c *client) do(ctx context.Context, method, path, contentType string, body io.Reader) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("%s %s → %d: %s", method, path, res.StatusCode, apiMessage(raw))
	}
	return raw, nil
}

func (c *client) get(ctx context.Context, path string) ([]byte, error) {
	return c.do(ctx, http.MethodGet, path, "", nil)
}

func (c *client) getInto(ctx context.Context, path string, out any) error {
	raw, err := c.get(ctx, path)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, out)
}

func (c *client) sendJSON(ctx context.Context, method, path string, payload any) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return c.do(ctx, method, path, "application/json", bytes.NewReader(body))
}

// multipartPost sends an image (field "image") plus form fields.
func (c *client) multipartPost(ctx context.Context, path, source string, fields map[string]string) ([]byte, error) {
	data, name, err := readSource(ctx, c.http, source)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for k, v := range fields {
		if v == "" {
			continue
		}
		if err := w.WriteField(k, v); err != nil {
			return nil, err
		}
	}
	part, err := w.CreateFormFile("image", name)
	if err != nil {
		return nil, err
	}
	if _, err := part.Write(data); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	return c.do(ctx, http.MethodPost, path, w.FormDataContentType(), &buf)
}

// The server takes images up to 8MB (extract) — keep a little headroom.
const maxUploadBytes = 10 << 20

// readSource reads a local file or downloads an http(s) URL.
func readSource(ctx context.Context, hc *http.Client, source string) ([]byte, string, error) {
	if strings.HasPrefix(source, "http://") || strings.HasPrefix(source, "https://") {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, source, nil)
		if err != nil {
			return nil, "", err
		}
		res, err := hc.Do(req)
		if err != nil {
			return nil, "", err
		}
		defer res.Body.Close()
		if res.StatusCode != http.StatusOK {
			return nil, "", fmt.Errorf("download %s: status %d", source, res.StatusCode)
		}
		data, err := io.ReadAll(io.LimitReader(res.Body, maxUploadBytes+1))
		if err != nil {
			return nil, "", err
		}
		if len(data) > maxUploadBytes {
			return nil, "", errors.New("file is larger than 10MB")
		}
		name := filepath.Base(res.Request.URL.Path)
		if name == "" || name == "/" || name == "." {
			name = "image.png"
		}
		return data, name, nil
	}
	info, err := os.Stat(source)
	if err != nil {
		return nil, "", err
	}
	if info.Size() > maxUploadBytes {
		return nil, "", errors.New("file is larger than 10MB")
	}
	data, err := os.ReadFile(source)
	return data, filepath.Base(source), err
}

func apiMessage(raw []byte) string {
	var m map[string]any
	if json.Unmarshal(raw, &m) == nil {
		for _, k := range []string{"message", "error"} {
			if s, ok := m[k].(string); ok && s != "" {
				return s
			}
		}
	}
	s := string(raw)
	if len(s) > 500 {
		s = s[:500] + "…"
	}
	return s
}
