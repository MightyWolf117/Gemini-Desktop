package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"gemini-desktop-backend/internal/config"
	"gemini-desktop-backend/internal/handler"
	"gemini-desktop-backend/internal/middleware"
	"gemini-desktop-backend/internal/repository"
	"gemini-desktop-backend/internal/service"
)

func main() {
	// 1. Cargar Configuración (variables de entorno)
	cfg := config.LoadConfig()

	// 2. Inicializar Repositorio (Supabase)
	repo := repository.NewSupabaseRepo(cfg.SupabaseURL, cfg.SupabasePassword)

	// 3. Inicializar Servicio (Gemini) - Inyectamos repositorio
	aiService := service.NewAIService(cfg.GoogleAPIKey, repo)

	// 4. Inicializar Handlers
	chatHandler := handler.NewChatHandler(aiService)
	personalityHandler := handler.NewPersonalityHandler(repo)
	systemHandler := handler.NewSystemHandler(cfg.GoogleAPIKey)

	// 5. Configurar el Servidor y Enrutador Gin
	gin.SetMode(gin.ReleaseMode) // Cambiar a gin.DebugMode si necesitas ver los logs detallados
	router := gin.Default()

	// Middleware global (CORS) - Básico para permitir que el frontend de Tauri se conecte
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, PATCH, SELECT")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Agrupamos las rutas bajo /api y aplicamos el Rate Limiter (banning masivo por IP)
	api := router.Group("/api")
	api.Use(middleware.RateLimiterMiddleware())
	{
		// Health Check
		api.GET("/health", systemHandler.Health)

		// Modelos
		api.GET("/models", systemHandler.Models)

		// Chat IA
		api.POST("/chat", chatHandler.HandleChat)

		// CRUD Personalidades
		api.GET("/personalities", personalityHandler.GetAll)
		api.POST("/personalities", personalityHandler.Create)
		api.PUT("/personalities/:id", personalityHandler.Update)
	}

	// 6. Iniciar Servidor
	log.Printf("Iniciando servidor del Asistente de IA en el puerto %s...", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Error al arrancar el servidor: %v", err)
	}
}
