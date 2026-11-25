package server

import (
	_ "embed"

	"github.com/gofiber/fiber/v3"
)

//go:embed static/chat.html
var chatHTML []byte

// ChatUI serves the integrated modern web chat interface
func ChatUI(c fiber.Ctx) error {
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.Send(chatHTML)
}

