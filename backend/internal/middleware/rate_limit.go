package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

// RateLimiterMiddleware crea un middleware de Gin para limitar las peticiones
func RateLimiterMiddleware() gin.HandlerFunc {
	// Definimos el límite: 10 peticiones por minuto por IP (esto baneará temporalmente)
	rate, err := limiter.NewRateFromFormatted("10-M")
	if err != nil {
		log.Fatalf("Error configurando rate limit: %v", err)
	}

	// Almacén en memoria
	store := memory.NewStore()

	// Creamos la instancia del limitador
	instance := limiter.New(store, rate)

	return func(c *gin.Context) {
		// Usar la IP del cliente como clave
		ip := c.ClientIP()
		
		context, err := instance.Get(c, ip)
		if err != nil {
			log.Printf("Error obteniendo el contexto del rate limiter: %v", err)
			c.Next()
			return
		}

		// Configurar cabeceras de Rate Limit
		c.Header("X-RateLimit-Limit", "10")
		c.Header("X-RateLimit-Remaining", "0")
		c.Header("X-RateLimit-Reset", "0")

		if context.Reached {
			// Baneado temporalmente (hasta que pase el minuto)
			log.Printf("Bloqueando IP %s por peticiones masivas (Rate Limit excedido)", ip)
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Has excedido el límite de peticiones. Por favor, intenta más tarde.",
			})
			return
		}

		c.Next()
	}
}
