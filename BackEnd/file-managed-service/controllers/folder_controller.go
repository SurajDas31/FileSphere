package controllers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"filesphere-api/database"
	"filesphere-api/middleware"
	"filesphere-api/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateFolder handles POST /api/folders
func CreateFolder(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	var input struct {
		Name     string     `json:"name" binding:"required"`
		ParentID *uuid.UUID `json:"parentId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Double check that the parent folder belongs to the same tenant if parent is specified
	if input.ParentID != nil {
		var parentFolder models.Folder
		if err := database.DB.Where("id = ? AND tenant_id = ?", input.ParentID, tenantID).First(&parentFolder).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid parent folder for this tenant"})
			return
		}
	}

	folder := models.Folder{
		Name:     input.Name,
		ParentID: input.ParentID,
		TenantID: tenantID,
	}

	if err := database.DB.Create(&folder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create folder"})
		return
	}

	c.JSON(http.StatusCreated, folder)
}

// GetFolders handles GET /api/folders (Lists all folders for the tenant)
func GetFolders(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	var folders []models.Folder
	// Fetch all folders for this tenant
	if err := database.DB.Where("tenant_id = ?", tenantID).Find(&folders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch folders"})
		return
	}

	// Auto-initialize root folder for the tenant if none exists
	if len(folders) == 0 {
		rootFolder := models.Folder{
			Name:     "Root Directory",
			ParentID: nil,
			TenantID: tenantID,
		}
		if err := database.DB.Create(&rootFolder).Error; err == nil {
			folders = append(folders, rootFolder)
		}
	}

	c.JSON(http.StatusOK, folders)
}

// GetFolderByID handles GET /api/folders/:id
func GetFolderByID(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}
	id := c.Param("id")
	
	// Preload immediate children and files filtered by tenant_id
	var folder models.Folder
	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&folder).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found"})
		return
	}

	// Preload subfolders and files belonging to the same tenant
	database.DB.Model(&folder).Where("tenant_id = ?", tenantID).Association("SubFolders").Find(&folder.SubFolders)
	database.DB.Model(&folder).Where("tenant_id = ?", tenantID).Association("Files").Find(&folder.Files)

	c.JSON(http.StatusOK, folder)
}

// UpdateFolder handles PUT /api/folders/:id
func UpdateFolder(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}
	id := c.Param("id")
	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Model(&models.Folder{}).Where("id = ? AND tenant_id = ?", id, tenantID).Update("name", input.Name).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update folder"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder updated successfully"})
}

// DeleteFolder handles DELETE /api/folders/:id
func DeleteFolder(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}
	id := c.Param("id")
	
	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.Folder{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete folder"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder deleted successfully"})
}

// CopyFolder handles POST /api/folders/:id/copy
func CopyFolder(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	srcFolderIDStr := c.Param("id")
	srcFolderID, err := uuid.Parse(srcFolderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid source folder ID"})
		return
	}

	var input struct {
		ParentID *uuid.UUID `json:"parentId"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify parent folder if target destination is provided
	if input.ParentID != nil {
		var parentFolder models.Folder
		if err := database.DB.Where("id = ? AND tenant_id = ?", input.ParentID, tenantID).First(&parentFolder).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Target parent folder does not belong to this tenant"})
			return
		}
	}

	// Retrieve source folder details
	var srcFolder models.Folder
	if err := database.DB.Where("id = ? AND tenant_id = ?", srcFolderID, tenantID).First(&srcFolder).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Source folder not found"})
		return
	}

	// Recursive function to copy directory trees
	var copyHelper func(src models.Folder, newParentID *uuid.UUID) (models.Folder, error)
	copyHelper = func(src models.Folder, newParentID *uuid.UUID) (models.Folder, error) {
		newFolderID := uuid.New()
		newFolder := models.Folder{
			ID:        newFolderID,
			Name:      src.Name,
			ParentID:  newParentID,
			TenantID:  tenantID,
		}

		if err := database.DB.Create(&newFolder).Error; err != nil {
			return models.Folder{}, err
		}

		// Read immediate subfolders
		var subfolders []models.Folder
		database.DB.Where("parent_id = ? AND tenant_id = ?", src.ID, tenantID).Find(&subfolders)
		for _, sf := range subfolders {
			if _, err := copyHelper(sf, &newFolderID); err != nil {
				return models.Folder{}, err
			}
		}

		// Read immediate files
		var files []models.File
		database.DB.Where("folder_id = ? AND tenant_id = ?", src.ID, tenantID).Find(&files)
		for _, file := range files {
			newFileID := uuid.New()

			// Try copy logic
			importSrc, err := os.Open(file.StoragePath)
			if err == nil {
				importDestPath := filepath.Join(filepath.Dir(file.StoragePath), fmt.Sprintf("%s%s", newFileID.String(), filepath.Ext(file.Title)))
				importDest, err := os.Create(importDestPath)
				if err == nil {
					_, _ = io.Copy(importDest, importSrc)
					importDest.Close()
				}
				importSrc.Close()
				
				copiedFile := models.File{
					ID:          newFileID,
					FolderID:    newFolderID,
					Title:       file.Title,
					Type:        file.Type,
					Size:        file.Size,
					StoragePath: importDestPath,
					Owner:       file.Owner,
					Tags:        file.Tags,
					TenantID:    tenantID,
				}
				database.DB.Create(&copiedFile)
			}
		}

		return newFolder, nil
	}

	copiedFolder, err := copyHelper(srcFolder, input.ParentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy folder contents: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, copiedFolder)
}

// MoveFolder handles PUT /api/folders/:id/move
func MoveFolder(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	srcFolderIDStr := c.Param("id")
	srcFolderID, err := uuid.Parse(srcFolderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid source folder ID"})
		return
	}

	var input struct {
		ParentID *uuid.UUID `json:"parentId"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify destination folder if target destination is provided
	if input.ParentID != nil {
		if *input.ParentID == srcFolderID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot move a folder into itself"})
			return
		}
		var parentFolder models.Folder
		if err := database.DB.Where("id = ? AND tenant_id = ?", input.ParentID, tenantID).First(&parentFolder).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Target parent folder does not belong to this tenant"})
			return
		}
	}

	// Verify source folder exists
	var srcFolder models.Folder
	if err := database.DB.Where("id = ? AND tenant_id = ?", srcFolderID, tenantID).First(&srcFolder).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found"})
		return
	}

	// Perform parent relocation
	if err := database.DB.Model(&srcFolder).Update("parent_id", input.ParentID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to relocate folder"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder moved successfully"})
}
