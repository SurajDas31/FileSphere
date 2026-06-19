package controllers

import (
	"net/http"

	"filesphere-api/database"
	"filesphere-api/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateFolder handles POST /api/folders
func CreateFolder(c *gin.Context) {
	var input struct {
		Name     string     `json:"name" binding:"required"`
		ParentID *uuid.UUID `json:"parentId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	folder := models.Folder{
		Name:     input.Name,
		ParentID: input.ParentID,
	}

	if err := database.DB.Create(&folder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create folder"})
		return
	}

	c.JSON(http.StatusCreated, folder)
}

// GetFolders handles GET /api/folders (Lists all folders)
func GetFolders(c *gin.Context) {
	var folders []models.Folder
	// Fetch all folders to allow the frontend to build the hierarchy tree
	if err := database.DB.Find(&folders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch folders"})
		return
	}

	c.JSON(http.StatusOK, folders)
}

// GetFolderByID handles GET /api/folders/:id
func GetFolderByID(c *gin.Context) {
	id := c.Param("id")
	
	// Preload immediate children and files
	var folder models.Folder
	if err := database.DB.Preload("SubFolders").Preload("Files").First(&folder, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found"})
		return
	}

	c.JSON(http.StatusOK, folder)
}

// UpdateFolder handles PUT /api/folders/:id
func UpdateFolder(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Model(&models.Folder{}).Where("id = ?", id).Update("name", input.Name).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update folder"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder updated successfully"})
}

// DeleteFolder handles DELETE /api/folders/:id
func DeleteFolder(c *gin.Context) {
	id := c.Param("id")
	
	// Basic deletion. Note: For a robust system, you might want to cascade delete files,
	// or rely on DB foreign key constraints. Here we perform a simple delete.
	if err := database.DB.Where("id = ?", id).Delete(&models.Folder{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete folder"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder deleted successfully"})
}
