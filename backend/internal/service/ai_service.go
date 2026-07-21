package service

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"

	"orbit-backend/internal/domain"
)

type aiService struct {}

func NewAIService() domain.AIService {
	return &aiService{}
}

func (s *aiService) GenerateResponse(ctx context.Context, req domain.ChatRequest, apiKey string) (*domain.ChatResponse, error) {
	// Inicializar el cliente de Google Gemini
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("error inicializando cliente gemini: %w", err)
	}
	defer client.Close()

	modelName := "gemini-1.5-flash"
	if req.Model != "" {
		modelName = req.Model
	}
	model := client.GenerativeModel(modelName)

	if req.Temperature != nil {
		model.Temperature = req.Temperature
	}

	// Configuramos las instrucciones del sistema (la personalidad enviada por el frontend)
	prompt := req.PersonalityPrompt
	if prompt == "" {
		prompt = "Eres un asistente virtual útil e inteligente."
	}
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(prompt)},
	}

	// Iniciar una sesión de chat
	cs := model.StartChat()

	// Añadir el historial de mensajes a la sesión
	if len(req.Messages) == 0 {
		return nil, fmt.Errorf("la solicitud de chat no contiene mensajes")
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
		return nil, fmt.Errorf("error generando respuesta de gemini: %w", err)
	}

	// Extraer el texto de la respuesta
	var responseText string
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if text, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			responseText = string(text)
		}
	}

	// Generar título si fue solicitado y tenemos mensajes
	var title string
	if req.GenerateTitle && len(req.Messages) > 0 {
		firstMsg := req.Messages[0].Content
		titlePrompt := fmt.Sprintf("Actúa como un sintetizador de textos. Tienes estrictamente prohibido conversar, saludar o dar explicaciones. Resume el siguiente mensaje en un título de MÁXIMO 4 palabras. Tu única respuesta debe ser el título envuelto en etiquetas <title> y </title>.\n\nMensaje: \"%s\"", firstMsg)

		titleModel := client.GenerativeModel("gemma-4-31b-it")
		titleResp, err := titleModel.GenerateContent(ctx, genai.Text(titlePrompt))
		if err == nil && titleResp != nil && len(titleResp.Candidates) > 0 && titleResp.Candidates[0].Content != nil && len(titleResp.Candidates[0].Content.Parts) > 0 {
			if t, ok := titleResp.Candidates[0].Content.Parts[0].(genai.Text); ok {
				rawTitle := string(t)
				
				// Extraer contenido entre <title> y </title> si el modelo incluyó texto adicional
				startIndex := strings.Index(rawTitle, "<title>")
				endIndex := strings.LastIndex(rawTitle, "</title>")
				if startIndex != -1 && endIndex != -1 && endIndex > startIndex {
					rawTitle = rawTitle[startIndex+7 : endIndex]
				} else {
					// Fallback si el modelo no usó etiquetas pero respondió corto
					lines := strings.Split(rawTitle, "\n")
					for _, line := range lines {
						line = strings.TrimSpace(line)
						if len(line) > 0 && len(line) < 50 {
							rawTitle = line
							break
						}
					}
				}

				rawTitle = strings.TrimSpace(rawTitle)
				rawTitle = strings.Trim(rawTitle, "\"")
				rawTitle = strings.Trim(rawTitle, "'")
				rawTitle = strings.Trim(rawTitle, "`")
				rawTitle = strings.Trim(rawTitle, "*")
				rawTitle = strings.Trim(rawTitle, "\n")
				
				// Si el resultado es demasiado largo, asumimos que el modelo falló al dar un título corto
				if len(rawTitle) > 100 {
					rawTitle = ""
				}

				title = rawTitle
			}
		} else {
			log.Printf("Error o respuesta vacía generando título: %v", err)
		}

		// Fallback por si falló la IA
		if title == "" {
			fallbackTitle := firstMsg
			if len(fallbackTitle) > 25 {
				fallbackTitle = fallbackTitle[:22] + "..."
			}
			title = fallbackTitle
		}
	}

	return &domain.ChatResponse{
		Response: responseText,
		Title:    title,
	}, nil
}
