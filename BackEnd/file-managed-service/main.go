package main

import (
	"log"
	"net/http"

	"filesphere-api/controllers"
	"filesphere-api/database"
	"filesphere-api/middleware"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)
	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)
)

func main() {
	// Initialize Database
	database.Connect()

	// Initialize Gin router
	r := gin.Default()

	// Prometheus middleware
	r.Use(func(c *gin.Context) {
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		timer := prometheus.NewTimer(httpRequestDuration.WithLabelValues(c.Request.Method, path))
		c.Next()
		status := c.Writer.Status()
		httpRequestsTotal.WithLabelValues(c.Request.Method, path, http.StatusText(status)).Inc()
		timer.ObserveDuration()
	})

	// Health check endpoint
	r.GET("/actuator/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "UP",
			"service": "file-managed-service",
		})
	})

	// Prometheus metrics endpoint
	r.GET("/actuator/prometheus", gin.WrapH(promhttp.Handler()))

	// CORS middleware (basic setup for dev)
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	api.Use(middleware.JWTAuthMiddleware())
	{
		// Folder routes
		api.POST("/folders", controllers.CreateFolder)
		api.GET("/folders", controllers.GetFolders)
		api.GET("/folders/:id", controllers.GetFolderByID)
		api.PUT("/folders/:id", controllers.UpdateFolder)
		api.DELETE("/folders/:id", controllers.DeleteFolder)
		api.POST("/folders/:id/copy", controllers.CopyFolder)
		api.PUT("/folders/:id/move", controllers.MoveFolder)

		// File routes
		api.POST("/files", controllers.UploadFile) // Kept for simple uploads if needed
		api.POST("/files/chunk", controllers.UploadChunk)
		api.POST("/files/complete", controllers.CompleteUpload)
		api.DELETE("/files/cancel/:uploadId", controllers.CancelUpload)
		api.GET("/files/:id/download", controllers.DownloadFile)
		api.GET("/files/:id/content", controllers.StreamFile)
		api.DELETE("/files/:id/preview", controllers.CleanupPreviewFile)
		api.PUT("/files/:id", controllers.UpdateFile)
		api.PUT("/files/:id/content", controllers.UpdateFileContent)
		api.POST("/files/:id/copy", controllers.CopyFile)
		api.DELETE("/files/:id", controllers.DeleteFile)
		api.GET("/notifications/stream", controllers.StreamNotifications)
		api.GET("/files/:id/versions", controllers.GetFileVersions)
		api.POST("/files/:id/versions/:ver_id/restore", controllers.RestoreFileVersion)
		api.DELETE("/files/:id/versions/:ver_id", controllers.DeleteFileVersion)
	}

	log.Println("Server running on port 7001")
	if err := r.Run(":7001"); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
