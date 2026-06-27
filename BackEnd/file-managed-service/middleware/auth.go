package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Fallback for development matching Spring Boot default
		secret = "supersecretjwtkeywithatleast256bitscharacterslengthrequired1234567890!"
	}
	jwtSecret = []byte(secret)
}

func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header must be Bearer token"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("Invalid or expired token: %v", err)})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to parse claims"})
			c.Abort()
			return
		}

		// Extract subject (email)
		sub, err := claims.GetSubject()
		if err != nil || sub == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Subject claim is missing"})
			c.Abort()
			return
		}

		// Store email and role in Context for routing controllers if needed
		c.Set("userEmail", sub)
		if role, ok := claims["role"].(string); ok {
			c.Set("userRole", role)
		}
		if tenant, ok := claims["tenantId"].(string); ok {
			c.Set("tenantId", tenant)
		}
		if fName, ok := claims["firstName"].(string); ok {
			c.Set("firstName", fName)
		}
		if lName, ok := claims["lastName"].(string); ok {
			c.Set("lastName", lName)
		}

		c.Next()
	}
}

func GetUserEmail(c *gin.Context) (string, error) {
	email, exists := c.Get("userEmail")
	if !exists {
		return "", errors.New("user email not found in context")
	}
	emailStr, ok := email.(string)
	if !ok {
		return "", errors.New("user email is not of type string")
	}
	return emailStr, nil
}

func GetTenantID(c *gin.Context) (string, error) {
	tenant, exists := c.Get("tenantId")
	if !exists {
		return "", errors.New("tenantId not found in context")
	}
	tenantStr, ok := tenant.(string)
	if !ok {
		return "", errors.New("tenantId is not of type string")
	}
	return tenantStr, nil
}

func GetUserFirstName(c *gin.Context) (string, error) {
	val, exists := c.Get("firstName")
	if !exists {
		return "", errors.New("firstName not found in context")
	}
	str, ok := val.(string)
	if !ok {
		return "", errors.New("firstName is not of type string")
	}
	return str, nil
}

func GetUserLastName(c *gin.Context) (string, error) {
	val, exists := c.Get("lastName")
	if !exists {
		return "", errors.New("lastName not found in context")
	}
	str, ok := val.(string)
	if !ok {
		return "", errors.New("lastName is not of type string")
	}
	return str, nil
}
