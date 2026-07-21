package service

import (
	"context"
	"fmt"
	"log"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"

	"gemini-desktop-backend/internal/domain"
)

type aiService struct {
	apiKey string
	repo   domain.PersonalityRepository
}

func NewAIService(apiKey string, repo domain.PersonalityRepository) domain.AIService {
	return &aiService{
		apiKey: apiKey,
		repo:   repo,
	}
}

func (s *aiService) GenerateResponse(ctx context.Context, req domain.ChatRequest) (string, error) {
	var personality *domain.Personality
	var err error

	if req.PersonalityID != nil {
		personality, err = s.repo.GetPersonalityByID(*req.PersonalityID)
		if err != nil {
			log.Printf("Error obteniendo personalidad por ID %d: %v", *req.PersonalityID, err)
		}
	}

	// Fallback si no hay ID, o si falló la búsqueda por ID
	if personality == nil {
		personality, err = s.repo.GetPersonality()
		if err != nil {
			log.Printf("Error obteniendo personalidad por defecto: %v", err)
			personality = &domain.Personality{
				Prompt: "Eres un asistente virtual útil e inteligente.",
			}
		}
	}

	// Inicializar el cliente de Google Gemini
	client, err := genai.NewClient(ctx, option.WithAPIKey(s.apiKey))
	if err != nil {
		return "", fmt.Errorf("error inicializando cliente gemini: %w", err)
	}
	defer client.Close()

	// Usamos gemini-flash-latest que es compatible con esta versión de la API
	model := client.GenerativeModel("gemini-flash-latest")
	
	// Configuramos las instrucciones del sistema (la personalidad)
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(personality.Prompt)},
	}

	// Iniciar una sesión de chat
	cs := model.StartChat()

	// Añadir el historial de mensajes a la sesión
	if len(req.Messages) == 0 {
		return "", fmt.Errorf("la solicitud de chat no contiene mensajes")
	}

	// Agregar el historial (excluyendo el último mensaje que es el prompt actual)
	for i := 0; i < len(req.Messages)-1; i++ {
		msg := req.Messages[i]
		var role string
		if msg.Role == "model" || msg.Role == "assistant" {
			role = "model"
		} else {
			role = "user"
		}
		cs.History = append(cs.History, &genai.Content{
			Parts: []genai.Part{genai.Text(msg.Content)},
			Role:  role,
		})
	}

	// El último mensaje del usuario
	lastMsg := req.Messages[len(req.Messages)-1]
	
	// Enviar mensaje a Gemini
	resp, err := cs.SendMessage(ctx, genai.Text(lastMsg.Content))
	if err != nil {
		return "", fmt.Errorf("error generando respuesta de gemini: %w", err)
	}

	// Extraer el texto de la respuesta
	var responseText string
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			responseText = string(text)
		}
	}

	return responseText, nil
}
