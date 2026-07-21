package domain

import "context"

// ChatMessage representa un mensaje individual en la conversación
type ChatMessage struct {
	Role    string `json:"role"`    // "user" o "model"
	Content string `json:"content"` // Contenido del mensaje
}

// ChatRequest representa la solicitud entrante al endpoint de chat
type ChatRequest struct {
	Messages      []ChatMessage `json:"messages"`                 // Historial del chat, el último mensaje es la nueva pregunta
	PersonalityID *int          `json:"personality_id,omitempty"` // ID de la personalidad a usar para este chat
}

// ChatResponse representa la respuesta que devolvemos al frontend
type ChatResponse struct {
	Response string `json:"response"`
	Error    string `json:"error,omitempty"`
}

// AIService define los métodos de negocio para interactuar con la IA
type AIService interface {
	GenerateResponse(ctx context.Context, req ChatRequest) (string, error)
}
