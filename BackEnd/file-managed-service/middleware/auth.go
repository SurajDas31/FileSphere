package middleware

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		email := c.GetHeader("X-User-Email")
		if email == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "X-User-Email header is required"})
			c.Abort()
			return
		}

		c.Set("userEmail", email)
		if role := c.GetHeader("X-User-Role"); role != "" {
			c.Set("userRole", role)
		}
		if tenant := c.GetHeader("X-Tenant-Id"); tenant != "" {
			c.Set("tenantId", tenant)
		}
		if fName := c.GetHeader("X-User-First-Name"); fName != "" {
			c.Set("firstName", fName)
		}
		if lName := c.GetHeader("X-User-Last-Name"); lName != "" {
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
