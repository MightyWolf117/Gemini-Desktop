package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"orbit-backend/internal/domain"
)

type ChatHandler struct {
	aiService      domain.AIService
	fallbackApiKey string
}

func NewChatHandler(aiService domain.AIService, fallbackApiKey string) *ChatHandler {
	return &ChatHandler{
		aiService:      aiService,
		fallbackApiKey: fallbackApiKey,
	}
}

func (h *ChatHandler) HandleChat(c *gin.Context) {
	var req domain.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ChatResponse{
			Error: "Cuerpo de la petición inválido: " + err.Error(),
		})
		return
	}

	if len(req.Messages) == 0 {
		c.JSON(http.StatusBadRequest, domain.ChatResponse{
			Error: "Se requiere al menos un mensaje en el historial",
		})
		return
	}

	apiKey := c.GetHeader("X-Google-API-Key")
	if apiKey == "" {
		apiKey = h.fallbackApiKey
	}
	if apiKey == "" {
		c.JSON(http.StatusUnauthorized, domain.ChatResponse{
			Error: "API Key de Google no configurada. Por favor, añádela en Ajustes.",
		})
		return
	}

	response, err := h.aiService.GenerateResponse(c.Request.Context(), req, apiKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, domain.ChatResponse{
			Error: "Error procesando la solicitud de IA: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}
