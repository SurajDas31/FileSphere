package main

import (
	"log"

	"filesphere-api/controllers"
	"filesphere-api/database"
	"filesphere-api/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize Database
	database.Connect()

	// Initialize Gin router
	r := gin.Default()

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
	}

	log.Println("Server running on port 7001")
	if err := r.Run(":7001"); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
