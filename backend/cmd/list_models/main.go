package main

import (
	"context"
	"log"

	"orbit-backend/internal/config"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

func main() {
	cfg := config.LoadConfig()
	ctx := context.Background()

	client, err := genai.NewClient(ctx, option.WithAPIKey(cfg.GoogleAPIKey))
	if err != nil {
		log.Fatalf("Error creando cliente: %v", err)
	}
	defer client.Close()

	log.Println("Obteniendo lista de modelos desde la API de Gemini...")

	iter := client.ListModels(ctx)
	for {
		m, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Fatalf("Error listando modelos: %v", err)
		}
		// Imprime los modelos que sí soportan generateContent
		for _, method := range m.SupportedGenerationMethods {
			if method == "generateContent" {
				log.Printf("Modelo disponible para generateContent: %s", m.Name)
			}
		}
	}
}
