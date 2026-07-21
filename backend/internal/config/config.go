package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	GoogleAPIKey     string
	SupabaseURL      string
	SupabasePassword string
	Port             string
}

func LoadConfig() *Config {
	// Intentamos cargar el .env desde la raíz del backend (o donde se ejecute main)
	err := godotenv.Load("env/.env")
	if err != nil {
		log.Println("No se pudo cargar el archivo env/.env, intentando leer variables del sistema.")
	}

	cfg := &Config{
		GoogleAPIKey:     os.Getenv("API_KEY_GOOGLE"),
		SupabaseURL:      os.Getenv("supabase_url"),
		SupabasePassword: os.Getenv("supabase_password"),
		Port:             os.Getenv("PORT"),
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	if cfg.GoogleAPIKey == "" {
		log.Fatal("API_KEY_GOOGLE es obligatoria")
	}

	return cfg
}
