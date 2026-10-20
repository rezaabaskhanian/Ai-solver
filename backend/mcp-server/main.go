// mathmotion-mcp is an MCP server (stdio) that gives Claude the MathMotion
// admin API as tools, so missing content — konkur tips and questions,
// textbook exercises, chapter-exam bank questions — can be found and
// written. Everything it writes lands in the panel's review queue
// («پیش‌نویس‌ها») as a pending draft; approving, deleting and settings stay
// in the admin panel.
//
// Configured with environment variables:
//
//	MATHMOTION_API_URL      e.g. https://api.mathmotion.ir
//	MATHMOTION_ADMIN_TOKEN  the server's ADMIN_TOKEN (what the panel logs in with)
//	MATHMOTION_REPO_DIR     optional; the Ai-solver checkout, for the chapter
//	                        list (default: two folders above this binary)
package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func main() {
	// stdout belongs to the MCP protocol; logs go to stderr only.
	log.SetOutput(os.Stderr)

	baseURL := os.Getenv("MATHMOTION_API_URL")
	token := os.Getenv("MATHMOTION_ADMIN_TOKEN")
	if baseURL == "" || token == "" {
		log.Fatal("MATHMOTION_API_URL and MATHMOTION_ADMIN_TOKEN must be set")
	}

	repoDir := os.Getenv("MATHMOTION_REPO_DIR")
	if repoDir == "" {
		if exe, err := os.Executable(); err == nil {
			repoDir = filepath.Join(filepath.Dir(exe), "..", "..")
		}
	}

	server := mcp.NewServer(&mcp.Implementation{Name: "mathmotion", Version: "0.1.0"}, &mcp.ServerOptions{
		Instructions: "MathMotion admin tools. Everything you write becomes a pending draft in the admin panel's review queue; " +
			"the admin approves it there. There are no approve/delete tools. Typical flow: content_health → list_curriculum → " +
			"list_tips / list_questions / list_exercises for the chapter → create_drafts → list_drafts to check warnings → update_draft. " +
			"Never name companies, teachers, books' publishers or websites in content; write solutions yourself.",
	})
	registerTools(server, newClient(baseURL, token), repoDir)

	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		log.Fatal(err)
	}
}
