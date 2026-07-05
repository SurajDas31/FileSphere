package controllers

import (
	"compress/gzip"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"filesphere-api/database"
	"filesphere-api/middleware"
	"filesphere-api/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const StoragePath = "../storage/"
const TempStoragePath = "../storage/temp/"

func init() {
	// Ensure storage directory exists
	if err := os.MkdirAll(StoragePath, os.ModePerm); err != nil {
		fmt.Printf("Failed to create storage directory: %v\n", err)
	}
	if err := os.MkdirAll(TempStoragePath, os.ModePerm); err != nil {
		fmt.Printf("Failed to create temp storage directory: %v\n", err)
	}
}

func getEncryptionKey() []byte {
	key := os.Getenv("ENCRYPTION_KEY")
	if key == "" {
		key = "default_secret_key_32_bytes_long!"
	}
	hash := sha256.Sum256([]byte(key))
	return hash[:]
}

// UploadChunk handles POST /api/files/chunk (Resumable upload part)
func UploadChunk(c *gin.Context) {
	uploadID := c.PostForm("uploadId")
	chunkIndex := c.PostForm("chunkIndex")
	
	if uploadID == "" || chunkIndex == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing uploadId or chunkIndex"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Chunk data is required"})
		return
	}

	// Create directory for this specific upload
	uploadDir := filepath.Join(TempStoragePath, uploadID)
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp directory"})
		return
	}

	// Save chunk
	dst := filepath.Join(uploadDir, chunkIndex)
	if err := c.SaveUploadedFile(fileHeader, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save chunk"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chunk uploaded"})
}

// CompleteUpload handles POST /api/files/complete
func CompleteUpload(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	firstName, _ := middleware.GetUserFirstName(c)
	lastName, _ := middleware.GetUserLastName(c)
	uploaderName := "Admin"
	if firstName != "" || lastName != "" {
		uploaderName = strings.TrimSpace(fmt.Sprintf("%s %s", firstName, lastName))
	}

	var input struct {
		UploadID    string `json:"uploadId" binding:"required"`
		Filename    string `json:"filename" binding:"required"`
		FolderID    string `json:"folderId" binding:"required"`
		TotalChunks int    `json:"totalChunks" binding:"required"`
		Size        int64  `json:"size" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Load the limit dynamically from the database tenants table
	var maxFileSize int64 = 52428800 // Default to 50MB
	type DBTenant struct {
		TenantKey        int64  `gorm:"column:tenant_key"`
		MaxFileSizeBytes *int64 `gorm:"column:max_file_size_bytes"`
	}
	var dbTenant DBTenant
	if err := database.DB.Table("tenants").Where("tenant_key = ?", tenantID).First(&dbTenant).Error; err == nil && dbTenant.MaxFileSizeBytes != nil {
		maxFileSize = *dbTenant.MaxFileSizeBytes
	}

	if input.Size > maxFileSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": fmt.Sprintf("File size exceeds the tenant upload limitation of %d MB", maxFileSize / 1024 / 1024)})
		return
	}

	folderUUID, err := uuid.Parse(input.FolderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folderId"})
		return
	}

	// Validate folder belongs to tenant
	var folder models.Folder
	if err := database.DB.Where("id = ? AND tenant_id = ?", folderUUID, tenantID).First(&folder).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target folder does not belong to this tenant"})
		return
	}

	uploadDir := filepath.Join(TempStoragePath, input.UploadID)
	
	// Prepare final file
	fileID := uuid.New()
	extension := filepath.Ext(input.Filename)
	internalName := fmt.Sprintf("%s%s", fileID.String(), extension)
	finalDst := filepath.Join(StoragePath, internalName)

	finalFile, err := os.Create(finalDst)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create final file"})
		return
	}
	defer finalFile.Close()

	// Encryption Setup
	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate encryption IV"})
		return
	}
	finalFile.Write(iv) // Prepend IV to file

	block, err := aes.NewCipher(getEncryptionKey())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption cipher error"})
		return
	}
	stream := cipher.NewCTR(block, iv)
	cryptoWriter := &cipher.StreamWriter{S: stream, W: finalFile}

	// Compression Setup
	gzWriter := gzip.NewWriter(cryptoWriter)

	// Append, compress, and encrypt all chunks
	for i := 0; i < input.TotalChunks; i++ {
		chunkPath := filepath.Join(uploadDir, strconv.Itoa(i))
		chunkFile, err := os.Open(chunkPath)
		if err != nil {
			gzWriter.Close()
			os.Remove(finalDst) // Rollback
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Missing chunk %d", i)})
			return
		}
		
		if _, err := io.Copy(gzWriter, chunkFile); err != nil {
			chunkFile.Close()
			gzWriter.Close()
			os.Remove(finalDst) // Rollback
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to merge, compress, and encrypt chunks"})
			return
		}
		chunkFile.Close()
	}

	if err := gzWriter.Close(); err != nil {
		finalFile.Close()
		os.Remove(finalDst)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize compression"})
		return
	}
	finalFile.Close()

	// Clean up temp directory
	os.RemoveAll(uploadDir)

	// Run StorageService Put operation to transfer the file to FTP (or keep it local if LOCAL mode)
	storageSvc := GetStorageService()
	actualStoragePath, err := storageSvc.Put(c.Request.Context(), finalDst, internalName)
	if err != nil {
		os.Remove(finalDst)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to transfer file to remote storage: " + err.Error()})
		return
	}

	// Clean up local temp compiled file if stored remotely
	if actualStoragePath != finalDst {
		os.Remove(finalDst)
	}

	// Determine type
	docType := "unknown"
	extLower := strings.ToLower(extension)
	switch extLower {
	case ".pdf": docType = "pdf"
	case ".doc", ".docx": docType = "word"
	case ".xls", ".xlsx": docType = "excel"
	case ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp": docType = "image"
	case ".mp4", ".webm", ".ogg", ".mov", ".avi": docType = "video"
	case ".zip", ".rar": docType = "zip"
	case ".txt", ".md", ".csv": docType = "text"
	case ".html", ".htm": docType = "html"
	}

	// Save to DB
	fileRecord := models.File{
		ID:          fileID,
		FolderID:    folderUUID,
		Title:       input.Filename,
		Type:        docType,
		Size:        input.Size, // Store original unencrypted size
		StoragePath: actualStoragePath,
		Owner:       uploaderName,
		TenantID:    tenantID,
	}

	if err := database.DB.Create(&fileRecord).Error; err != nil {
		_ = storageSvc.Delete(c.Request.Context(), actualStoragePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file metadata"})
		return
	}

	c.JSON(http.StatusCreated, fileRecord)
}

// CancelUpload handles DELETE /api/files/cancel/:uploadId
func CancelUpload(c *gin.Context) {
	uploadID := c.Param("uploadId")
	if uploadID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing uploadId"})
		return
	}

	if strings.Contains(uploadID, "..") || strings.Contains(uploadID, "/") || strings.Contains(uploadID, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid uploadId"})
		return
	}

	uploadDir := filepath.Join(TempStoragePath, uploadID)
	os.RemoveAll(uploadDir)

	c.JSON(http.StatusOK, gin.H{"message": "Upload cancelled and temporary files removed"})
}

// UploadFile handles POST /api/files (High Throughput Upload)
func UploadFile(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	firstName, _ := middleware.GetUserFirstName(c)
	lastName, _ := middleware.GetUserLastName(c)
	uploaderName := "Admin"
	if firstName != "" || lastName != "" {
		uploaderName = strings.TrimSpace(fmt.Sprintf("%s %s", firstName, lastName))
	}

	folderIDStr := c.PostForm("folderId")
	folderID, err := uuid.Parse(folderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or missing folderId"})
		return
	}

	// Validate folder belongs to tenant
	var folder models.Folder
	if err := database.DB.Where("id = ? AND tenant_id = ?", folderID, tenantID).First(&folder).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target folder does not belong to this tenant"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}

	fileID := uuid.New()
	extension := filepath.Ext(fileHeader.Filename)
	internalName := fmt.Sprintf("%s%s", fileID.String(), extension)
	dst := filepath.Join(StoragePath, internalName)

	srcFile, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open upload stream"})
		return
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dst)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create destination file"})
		return
	}
	defer dstFile.Close()

	// Encryption Setup
	iv := make([]byte, aes.BlockSize)
	rand.Read(iv)
	dstFile.Write(iv)

	block, err := aes.NewCipher(getEncryptionKey())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption cipher error"})
		return
	}
	stream := cipher.NewCTR(block, iv)
	writer := &cipher.StreamWriter{S: stream, W: dstFile}

	// Encrypt and copy stream to disk
	if _, err := io.Copy(writer, srcFile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to securely save file"})
		return
	}

	docType := "unknown"
	extLower := strings.ToLower(extension)
	switch extLower {
	case ".pdf": docType = "pdf"
	case ".doc", ".docx": docType = "word"
	case ".xls", ".xlsx": docType = "excel"
	case ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp": docType = "image"
	case ".mp4", ".webm", ".ogg", ".mov", ".avi": docType = "video"
	case ".zip", ".rar": docType = "zip"
	case ".txt", ".md", ".csv": docType = "text"
	case ".html", ".htm": docType = "html"
	}

	fileRecord := models.File{
		ID:          fileID,
		FolderID:    folderID,
		Title:       fileHeader.Filename,
		Type:        docType,
		Size:        fileHeader.Size,
		StoragePath: dst,
		Owner:       uploaderName,
		TenantID:    tenantID,
	}

	if err := database.DB.Create(&fileRecord).Error; err != nil {
		os.Remove(dst)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file metadata"})
		return
	}

	c.JSON(http.StatusCreated, fileRecord)
}

// DownloadFile handles GET /api/files/:id/download (As Attachment)
func DownloadFile(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	var file models.File

	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Get content using active StorageService (e.g. LOCAL or FTP)
	storageSvc := GetStorageService()
	fileObj, err := storageSvc.Get(c.Request.Context(), file.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not access file in storage: " + err.Error()})
		return
	}
	defer fileObj.Close()

	// Read IV
	iv := make([]byte, aes.BlockSize)
	if _, err := fileObj.Read(iv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read encryption metadata"})
		return
	}

	// 1. Decrypt Stream
	block, err := aes.NewCipher(getEncryptionKey())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Decryption cipher error"})
		return
	}
	stream := cipher.NewCTR(block, iv)
	cryptoReader := &cipher.StreamReader{S: stream, R: fileObj}

	// 2. Decompress Stream
	gzReader, err := gzip.NewReader(cryptoReader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize decompression"})
		return
	}
	defer gzReader.Close()

	contentType := getMimeType(file.Title)

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, file.Title))
	c.Header("Content-Type", contentType)

	// Stream decompressed, decrypted data directly to response writer
	if _, err := io.Copy(c.Writer, gzReader); err != nil {
		// Log the error but headers might have already been sent
		fmt.Printf("Error streaming file %s: %v\n", id, err)
	}
}

// StreamFile handles GET /api/files/:id/content (Inline for Preview)
func StreamFile(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	var file models.File

	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Define temporary decrypted/decompressed file path
	tempDecryptedPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s", file.ID.String()))

	// Check if we need to create the decrypted temp file
	if _, err := os.Stat(tempDecryptedPath); os.IsNotExist(err) {
		// Get content using active StorageService (e.g. LOCAL or FTP)
		storageSvc := GetStorageService()
		fileObj, err := storageSvc.Get(c.Request.Context(), file.StoragePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not access file in storage: " + err.Error()})
			return
		}
		defer fileObj.Close()

		// Read IV
		iv := make([]byte, aes.BlockSize)
		if _, err := fileObj.Read(iv); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read encryption metadata"})
			return
		}

		// Decrypt
		block, err := aes.NewCipher(getEncryptionKey())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Decryption cipher error"})
			return
		}
		stream := cipher.NewCTR(block, iv)
		cryptoReader := &cipher.StreamReader{S: stream, R: fileObj}

		// Decompress
		gzReader, err := gzip.NewReader(cryptoReader)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize decompression"})
			return
		}
		defer gzReader.Close()

		// Write to temp file
		tempOut, err := os.Create(tempDecryptedPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create stream buffer file"})
			return
		}
		defer tempOut.Close()

		if _, err := io.Copy(tempOut, gzReader); err != nil {
			os.Remove(tempDecryptedPath) // Clean up partial write
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to buffer stream"})
			return
		}
	}

	// Open the decrypted/decompressed temp file
	streamFile, err := os.Open(tempDecryptedPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open buffered stream"})
		return
	}
	defer streamFile.Close()

	// Get file info for mod time and size
	stat, err := streamFile.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read buffer info"})
		return
	}

	contentType := getMimeType(file.Title)

	// Set headers
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, file.Title))
	c.Header("Content-Type", contentType)

	// Use http.ServeContent to handle partial range requests (206)
	http.ServeContent(c.Writer, c.Request, file.Title, stat.ModTime(), streamFile)
}

// CleanupPreviewFile handles DELETE /api/files/:id/preview
func CleanupPreviewFile(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	var file models.File

	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Clean up temporary decrypted buffer if it exists
	tempDecryptedPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s", file.ID.String()))
	
	var removalErr error
	for i := 0; i < 5; i++ {
		removalErr = os.Remove(tempDecryptedPath)
		if removalErr == nil || os.IsNotExist(removalErr) {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}

	if removalErr != nil && !os.IsNotExist(removalErr) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to delete stream buffer: %v", removalErr)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stream buffer cleaned up successfully"})
}

// DeleteFile handles DELETE /api/files/:id
func DeleteFile(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	var file models.File

	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	storageSvc := GetStorageService()
	if err := storageSvc.Delete(c.Request.Context(), file.StoragePath); err != nil {
		fmt.Printf("Warning: Failed to delete storage file %s: %v\n", file.StoragePath, err)
	}

	// Clean up temporary decrypted buffer if it exists
	tempDecryptedPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s", file.ID.String()))
	if err := os.Remove(tempDecryptedPath); err != nil && !os.IsNotExist(err) {
		fmt.Printf("Warning: Failed to delete stream buffer %s: %v\n", tempDecryptedPath, err)
	}

	if err := database.DB.Delete(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

// UpdateFile handles PUT /api/files/:id
func UpdateFile(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	var file models.File

	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	var input struct {
		Title    *string    `json:"title"`
		FolderID *uuid.UUID `json:"folderId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Title != nil {
		file.Title = *input.Title
	}
	if input.FolderID != nil {
		// Verify destination folder belongs to same tenant
		var destFolder models.Folder
		if err := database.DB.Where("id = ? AND tenant_id = ?", *input.FolderID, tenantID).First(&destFolder).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Target folder does not belong to this tenant"})
			return
		}
		file.FolderID = *input.FolderID
	}

	if err := database.DB.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update file"})
		return
	}

	c.JSON(http.StatusOK, file)
}

// CopyFile handles POST /api/files/:id/copy
func CopyFile(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	var file models.File

	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	var input struct {
		FolderID uuid.UUID `json:"folderId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify destination folder belongs to same tenant
	var destFolder models.Folder
	if err := database.DB.Where("id = ? AND tenant_id = ?", input.FolderID, tenantID).First(&destFolder).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target folder does not belong to this tenant"})
		return
	}

	// Generate new ID and storage path for copied file
	newFileID := uuid.New()
	extension := filepath.Ext(file.Title)
	newInternalName := fmt.Sprintf("%s%s", newFileID.String(), extension)

	// Get active StorageService
	storageSvc := GetStorageService()

	// Download source from storage
	srcStream, err := storageSvc.Get(c.Request.Context(), file.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve source file: " + err.Error()})
		return
	}
	defer srcStream.Close()

	// Create a temporary local file to hold duplicate stream before storage transfer
	tempLocalPath := filepath.Join(StoragePath, newInternalName)
	tempFile, err := os.Create(tempLocalPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp copy path"})
		return
	}

	if _, err := io.Copy(tempFile, srcStream); err != nil {
		tempFile.Close()
		os.Remove(tempLocalPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write copy buffer"})
		return
	}
	tempFile.Close()

	// Transfer file to active Storage engine (e.g. FTP or local)
	actualStoragePath, err := storageSvc.Put(c.Request.Context(), tempLocalPath, newInternalName)
	if err != nil {
		os.Remove(tempLocalPath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store copy in target storage: " + err.Error()})
		return
	}

	// Clean up temp file if stored remotely
	if actualStoragePath != tempLocalPath {
		os.Remove(tempLocalPath)
	}

	// Create new File database record
	copiedFile := models.File{
		ID:          newFileID,
		FolderID:    input.FolderID,
		Title:       file.Title,
		Type:        file.Type,
		Size:        file.Size,
		StoragePath: actualStoragePath,
		Owner:       file.Owner,
		Tags:        file.Tags,
		TenantID:    tenantID,
	}

	if err := database.DB.Create(&copiedFile).Error; err != nil {
		_ = storageSvc.Delete(c.Request.Context(), actualStoragePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create copied file metadata"})
		return
	}

	c.JSON(http.StatusCreated, copiedFile)
}

func getMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	contentType := mime.TypeByExtension(ext)
	if contentType != "" {
		return contentType
	}
	switch ext {
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".ogg":
		return "video/ogg"
	case ".mov":
		return "video/quicktime"
	case ".avi":
		return "video/x-msvideo"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".svg":
		return "image/svg+xml"
	case ".webp":
		return "image/webp"
	case ".pdf":
		return "application/pdf"
	case ".txt":
		return "text/plain"
	case ".md":
		return "text/markdown"
	case ".csv":
		return "text/csv"
	case ".html", ".htm":
		return "text/html"
	default:
		return "application/octet-stream"
	}
}

// UpdateFileContent handles PUT /api/files/:id/content
func UpdateFileContent(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	var file models.File

	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	type DBTenant struct {
		TenantKey        int64  `gorm:"column:tenant_key"`
		MaxFileSizeBytes *int64 `gorm:"column:max_file_size_bytes"`
	}
	var dbTenant DBTenant
	if err := database.DB.Table("tenants").Where("tenant_key = ?", tenantID).First(&dbTenant).Error; err == nil && dbTenant.MaxFileSizeBytes != nil {
		if int64(len(bodyBytes)) > *dbTenant.MaxFileSizeBytes {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": fmt.Sprintf("File size exceeds tenant limit of %d MB", *dbTenant.MaxFileSizeBytes / 1024 / 1024),
			})
			return
		}
	}

	internalName := filepath.Base(file.StoragePath)
	tempLocalPath := filepath.Join(StoragePath, internalName)

	finalFile, err := os.OpenFile(tempLocalPath, os.O_WRONLY|os.O_TRUNC|os.O_CREATE, 0666)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open temporary file for update"})
		return
	}
	defer finalFile.Close()

	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate encryption IV"})
		return
	}
	finalFile.Write(iv)

	block, err := aes.NewCipher(getEncryptionKey())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption cipher error"})
		return
	}
	stream := cipher.NewCTR(block, iv)
	cryptoWriter := &cipher.StreamWriter{S: stream, W: finalFile}

	gzWriter := gzip.NewWriter(cryptoWriter)

	if _, err := gzWriter.Write(bodyBytes); err != nil {
		gzWriter.Close()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write compressed and encrypted data"})
		return
	}

	if err := gzWriter.Close(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize compression"})
		return
	}

	finalFile.Close()

	storageSvc := GetStorageService()
	actualStoragePath, err := storageSvc.Put(c.Request.Context(), tempLocalPath, internalName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store updated file in storage provider"})
		return
	}

	if actualStoragePath != tempLocalPath {
		_ = os.Remove(tempLocalPath)
	}

	file.StoragePath = actualStoragePath
	file.Size = int64(len(bodyBytes))
	if err := database.DB.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update file metadata in database"})
		return
	}

	c.JSON(http.StatusOK, file)
}
