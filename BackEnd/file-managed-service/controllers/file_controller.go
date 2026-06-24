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

	folderUUID, err := uuid.Parse(input.FolderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folderId"})
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
		os.Remove(finalDst)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize compression"})
		return
	}

	// Clean up temp directory
	os.RemoveAll(uploadDir)

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
	}

	// Save to DB
	fileRecord := models.File{
		ID:          fileID,
		FolderID:    folderUUID,
		Title:       input.Filename,
		Type:        docType,
		Size:        input.Size, // Store original unencrypted size
		StoragePath: finalDst,
	}

	if err := database.DB.Create(&fileRecord).Error; err != nil {
		os.Remove(finalDst)
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
	folderIDStr := c.PostForm("folderId")
	folderID, err := uuid.Parse(folderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or missing folderId"})
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
	}

	fileRecord := models.File{
		ID:          fileID,
		FolderID:    folderID,
		Title:       fileHeader.Filename,
		Type:        docType,
		Size:        fileHeader.Size,
		StoragePath: dst,
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
	id := c.Param("id")
	var file models.File

	if err := database.DB.First(&file, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	fileObj, err := os.Open(file.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not access file on disk"})
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

	contentType := mime.TypeByExtension(filepath.Ext(file.Title))
	if contentType == "" {
		contentType = "application/octet-stream"
	}

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
	id := c.Param("id")
	var file models.File

	if err := database.DB.First(&file, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Define temporary decrypted/decompressed file path
	tempDecryptedPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s", file.ID.String()))

	// Check if we need to create the decrypted temp file
	if _, err := os.Stat(tempDecryptedPath); os.IsNotExist(err) {
		fileObj, err := os.Open(file.StoragePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not access file on disk"})
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

	contentType := mime.TypeByExtension(filepath.Ext(file.Title))
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Set headers
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, file.Title))
	c.Header("Content-Type", contentType)

	// Use http.ServeContent to handle partial range requests (206)
	http.ServeContent(c.Writer, c.Request, file.Title, stat.ModTime(), streamFile)
}

// CleanupPreviewFile handles DELETE /api/files/:id/preview
func CleanupPreviewFile(c *gin.Context) {
	id := c.Param("id")
	var file models.File

	if err := database.DB.First(&file, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Clean up temporary decrypted buffer if it exists
	tempDecryptedPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s", file.ID.String()))
	
	var err error
	for i := 0; i < 5; i++ {
		err = os.Remove(tempDecryptedPath)
		if err == nil || os.IsNotExist(err) {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}

	if err != nil && !os.IsNotExist(err) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to delete stream buffer: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stream buffer cleaned up successfully"})
}

// DeleteFile handles DELETE /api/files/:id
func DeleteFile(c *gin.Context) {
	id := c.Param("id")
	var file models.File

	if err := database.DB.First(&file, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	if err := os.Remove(file.StoragePath); err != nil && !os.IsNotExist(err) {
		fmt.Printf("Warning: Failed to delete physical file %s: %v\n", file.StoragePath, err)
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
	id := c.Param("id")
	var file models.File

	if err := database.DB.First(&file, "id = ?", id).Error; err != nil {
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
	id := c.Param("id")
	var file models.File

	if err := database.DB.First(&file, "id = ?", id).Error; err != nil {
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

	// Generate new ID and storage path for copied file
	newFileID := uuid.New()
	extension := filepath.Ext(file.Title)
	newInternalName := fmt.Sprintf("%s%s", newFileID.String(), extension)
	newStoragePath := filepath.Join(StoragePath, newInternalName)

	// Copy physical file
	srcFile, err := os.Open(file.StoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open source file"})
		return
	}
	defer srcFile.Close()

	destFile, err := os.Create(newStoragePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create destination file"})
		return
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, srcFile); err != nil {
		os.Remove(newStoragePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy physical file data"})
		return
	}

	// Create new File database record
	copiedFile := models.File{
		ID:          newFileID,
		FolderID:    input.FolderID,
		Title:       file.Title,
		Type:        file.Type,
		Size:        file.Size,
		StoragePath: newStoragePath,
		Owner:       file.Owner,
		Tags:        file.Tags,
	}

	if err := database.DB.Create(&copiedFile).Error; err != nil {
		os.Remove(newStoragePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create copied file metadata"})
		return
	}

	c.JSON(http.StatusCreated, copiedFile)
}
