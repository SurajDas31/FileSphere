package controllers

import (
	"context"
	"sync"
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

var TempStoragePath = getTempStoragePath()

func getTempStoragePath() string {
	if path := os.Getenv("TEMP_STORAGE_PATH"); path != "" {
		return path
	}
	return filepath.Join(os.TempDir(), "filesphere")
}

type ConversionTask struct {
	FileID   uuid.UUID
	TenantID string
}

var ConversionQueue = make(chan ConversionTask, 100)

func StartConversionWorker() {
	go func() {
		for task := range ConversionQueue {
			processConversion(task)
		}
	}()
}

func processConversion(task ConversionTask) {
	time.Sleep(3 * time.Second)

	var file models.File
	if err := database.DB.First(&file, "id = ?", task.FileID).Error; err != nil {
		fmt.Printf("[Worker] File not found: %v\n", task.FileID)
		return
	}

	sampleFile, err := os.Open(filepath.Join(StoragePath, "sample.glb"))
	if err != nil {
		fmt.Printf("[Worker] Failed to open sample.glb: %v\n", err)
		return
	}
	defer sampleFile.Close()

	tempOutPath := filepath.Join(TempStoragePath, fmt.Sprintf("%s_preview.glb", file.ID.String()))
	tempOut, err := os.Create(tempOutPath)
	if err != nil {
		fmt.Printf("[Worker] Failed to create temp output: %v\n", err)
		return
	}

	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		tempOut.Close()
		os.Remove(tempOutPath)
		fmt.Printf("[Worker] Failed to generate IV: %v\n", err)
		return
	}
	tempOut.Write(iv)

	block, err := aes.NewCipher(getEncryptionKey())
	if err != nil {
		tempOut.Close()
		os.Remove(tempOutPath)
		fmt.Printf("[Worker] Failed to create cipher: %v\n", err)
		return
	}
	stream := cipher.NewCTR(block, iv)
	cryptoWriter := &cipher.StreamWriter{S: stream, W: tempOut}

	gzWriter := gzip.NewWriter(cryptoWriter)

	if _, err := io.Copy(gzWriter, sampleFile); err != nil {
		gzWriter.Close()
		tempOut.Close()
		os.Remove(tempOutPath)
		fmt.Printf("[Worker] Failed to compress glb: %v\n", err)
		return
	}
	gzWriter.Close()
	tempOut.Close()

	storageSvc := GetStorageService()
	actualPreviewPath, err := storageSvc.Put(context.Background(), tempOutPath, fmt.Sprintf("%s_preview.glb", file.ID.String()))
	if err != nil {
		os.Remove(tempOutPath)
		fmt.Printf("[Worker] Storage put failed: %v\n", err)
		return
	}

	if actualPreviewPath != tempOutPath {
		os.Remove(tempOutPath)
	}

	if err := database.DB.Model(&file).Update("status", "Ready").Error; err != nil {
		fmt.Printf("[Worker] Failed to update file status: %v\n", err)
		return
	}

	triggerNotification(task.TenantID, fmt.Sprintf("READY:%s", file.ID.String()))
	fmt.Printf("[Worker] Successfully processed 3D preview for file: %s\n", file.ID.String())
}

var (
	notificationClients = make(map[string]chan string)
	notificationMutex   = &sync.Mutex{}
)

func StreamNotifications(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")

	ch := make(chan string, 10)

	notificationMutex.Lock()
	notificationClients[tenantID] = ch
	notificationMutex.Unlock()

	defer func() {
		notificationMutex.Lock()
		delete(notificationClients, tenantID)
		notificationMutex.Unlock()
		close(ch)
	}()

	c.Stream(func(w io.Writer) bool {
		if msg, ok := <-ch; ok {
			c.SSEvent("message", msg)
			return true
		}
		return false
	})
}

func triggerNotification(tenantID string, message string) {
	notificationMutex.Lock()
	defer notificationMutex.Unlock()
	if ch, ok := notificationClients[tenantID]; ok {
		select {
		case ch <- message:
		default:
		}
	}
}

func init() {
	// Ensure storage directory exists
	if err := os.MkdirAll(StoragePath, os.ModePerm); err != nil {
		fmt.Printf("Failed to create storage directory: %v\n", err)
	}
	if err := os.MkdirAll(TempStoragePath, os.ModePerm); err != nil {
		fmt.Printf("Failed to create temp storage directory: %v\n", err)
	}
	StartConversionWorker()
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
	
	// Create a unique temporary file path for compilation
	tempCompileFile := filepath.Join(TempStoragePath, fmt.Sprintf("temp_upload_%s.enc", input.UploadID))
	finalFile, err := os.Create(tempCompileFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp final file"})
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

	// Hash calculation for content-addressable storage (checksum of unencrypted data)
	hashCalc := sha256.New()
	multiWriter := io.MultiWriter(gzWriter, hashCalc)

	// Append, compress, and encrypt all chunks
	for i := 0; i < input.TotalChunks; i++ {
		chunkPath := filepath.Join(uploadDir, strconv.Itoa(i))
		chunkFile, err := os.Open(chunkPath)
		if err != nil {
			gzWriter.Close()
			finalFile.Close()
			os.Remove(tempCompileFile)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Missing chunk %d", i)})
			return
		}
		
		if _, err := io.Copy(multiWriter, chunkFile); err != nil {
			chunkFile.Close()
			gzWriter.Close()
			finalFile.Close()
			os.Remove(tempCompileFile)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to merge, compress, and encrypt chunks"})
			return
		}
		chunkFile.Close()
	}

	if err := gzWriter.Close(); err != nil {
		finalFile.Close()
		os.Remove(tempCompileFile)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize compression"})
		return
	}
	finalFile.Close()

	// Clean up temp chunks directory
	os.RemoveAll(uploadDir)

	// Calculate final SHA-256 checksum
	checksum := fmt.Sprintf("%x", hashCalc.Sum(nil))

	// Check if a file version with this checksum already exists
	var existingVersion models.FileVersion
	dupFound := false
	var actualStoragePath string
	extension := filepath.Ext(input.Filename)
	
	if err := database.DB.Where("checksum = ?", checksum).First(&existingVersion).Error; err == nil {
		// Found duplicate in CAS storage!
		dupFound = true
		actualStoragePath = existingVersion.StoragePath
		os.Remove(tempCompileFile) // No need to store again
	} else {
		// No duplicate. Let's move the file to partitioned CAS path
		hashPrefix1 := checksum[0:2]
		hashPrefix2 := checksum[2:4]
		casFilename := fmt.Sprintf("%s%s", checksum, extension)
		casSubdir := filepath.Join("cas", hashPrefix1, hashPrefix2)
		
		localCasDir := filepath.Join(StoragePath, casSubdir)
		if err := os.MkdirAll(localCasDir, os.ModePerm); err != nil {
			os.Remove(tempCompileFile)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create CAS directory"})
			return
		}
		
		internalName := filepath.Join(casSubdir, casFilename)
		
		// Run StorageService Put operation to transfer the file to FTP (or keep it local if LOCAL mode)
		storageSvc := GetStorageService()
		var putErr error
		actualStoragePath, putErr = storageSvc.Put(c.Request.Context(), tempCompileFile, internalName)
		if putErr != nil {
			os.Remove(tempCompileFile)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to transfer file to remote storage: " + putErr.Error()})
			return
		}

		// Clean up local temp compiled file if stored remotely
		if actualStoragePath != tempCompileFile {
			os.Remove(tempCompileFile)
		}
	}

	storageSvc := GetStorageService()

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
	case ".obj", ".fbx", ".stl", ".blend", ".step", ".iges", ".glb", ".gltf": docType = "3d"
	}

	status := "Ready"
	if docType == "3d" && extLower != ".glb" && extLower != ".gltf" {
		status = "Processing"
	}

	// 1. Check if a logical File with the same Title already exists in the target folder
	var fileRecord models.File
	isNewFile := false
	
	if err := database.DB.Where("folder_id = ? AND title = ? AND tenant_id = ?", folderUUID, input.Filename, tenantID).First(&fileRecord).Error; err != nil {
		// New logical file
		isNewFile = true
		fileRecord = models.File{
			ID:          uuid.New(),
			FolderID:    folderUUID,
			Title:       input.Filename,
			Type:        docType,
			Size:        input.Size,
			StoragePath: actualStoragePath,
			Owner:       uploaderName,
			TenantID:    tenantID,
			Status:      status,
		}
		if err := database.DB.Create(&fileRecord).Error; err != nil {
			if !dupFound {
				_ = storageSvc.Delete(c.Request.Context(), actualStoragePath)
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file metadata"})
			return
		}
	} else {
		// Existing logical file, update metadata
		fileRecord.Size = input.Size
		fileRecord.StoragePath = actualStoragePath
		fileRecord.Status = status
		fileRecord.UpdatedAt = time.Now()
	}

	// 2. Determine Version Number
	var maxVersion int
	database.DB.Model(&models.FileVersion{}).Where("file_id = ?", fileRecord.ID).Select("COALESCE(max(version_number), 0)").Row().Scan(&maxVersion)
	nextVersionNum := maxVersion + 1

	// 3. Create File Version
	fileVer := models.FileVersion{
		ID:            uuid.New(),
		FileID:        fileRecord.ID,
		VersionNumber: nextVersionNum,
		Size:          input.Size,
		StoragePath:   actualStoragePath,
		Checksum:      checksum,
		CreatedBy:     uploaderName,
		CreatedAt:     time.Now(),
	}

	if err := database.DB.Create(&fileVer).Error; err != nil {
		if isNewFile && !dupFound {
			_ = storageSvc.Delete(c.Request.Context(), actualStoragePath)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file version record"})
		return
	}

	// 4. Update File.CurrentVersionID to point to the new version
	fileRecord.CurrentVersionID = &fileVer.ID
	if err := database.DB.Save(&fileRecord).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update current version reference"})
		return
	}

	if status == "Processing" {
		select {
		case ConversionQueue <- ConversionTask{FileID: fileRecord.ID, TenantID: tenantID}:
		default:
			fmt.Printf("Conversion queue full, dropping task for: %s\n", fileRecord.ID.String())
		}
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
	
	// Create a unique temporary file path for compilation
	tempCompileFile := filepath.Join(TempStoragePath, fmt.Sprintf("temp_upload_%s.enc", fileID.String()))
	dstFile, err := os.Create(tempCompileFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create destination file"})
		return
	}
	defer dstFile.Close()

	srcFile, err := fileHeader.Open()
	if err != nil {
		dstFile.Close()
		os.Remove(tempCompileFile)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open upload stream"})
		return
	}
	defer srcFile.Close()

	// Encryption Setup
	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		dstFile.Close()
		os.Remove(tempCompileFile)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate encryption IV"})
		return
	}
	dstFile.Write(iv)

	block, err := aes.NewCipher(getEncryptionKey())
	if err != nil {
		dstFile.Close()
		os.Remove(tempCompileFile)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption cipher error"})
		return
	}
	stream := cipher.NewCTR(block, iv)
	cryptoWriter := &cipher.StreamWriter{S: stream, W: dstFile}

	// Compression Setup
	gzWriter := gzip.NewWriter(cryptoWriter)

	// Hash calculation for content-addressable storage (checksum of unencrypted data)
	hashCalc := sha256.New()
	multiWriter := io.MultiWriter(gzWriter, hashCalc)

	// Encrypt and copy stream to disk while computing checksum
	if _, err := io.Copy(multiWriter, srcFile); err != nil {
		gzWriter.Close()
		dstFile.Close()
		os.Remove(tempCompileFile)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to securely save file"})
		return
	}
	gzWriter.Close()
	dstFile.Close()

	// Calculate final SHA-256 checksum
	checksum := fmt.Sprintf("%x", hashCalc.Sum(nil))

	// Check if a file version with this checksum already exists
	var existingVersion models.FileVersion
	dupFound := false
	var actualStoragePath string

	if err := database.DB.Where("checksum = ?", checksum).First(&existingVersion).Error; err == nil {
		// Found duplicate in CAS storage!
		dupFound = true
		actualStoragePath = existingVersion.StoragePath
		os.Remove(tempCompileFile) // No need to store again
	} else {
		// No duplicate. Move to partitioned CAS path
		hashPrefix1 := checksum[0:2]
		hashPrefix2 := checksum[2:4]
		casFilename := fmt.Sprintf("%s%s", checksum, extension)
		casSubdir := filepath.Join("cas", hashPrefix1, hashPrefix2)
		
		localCasDir := filepath.Join(StoragePath, casSubdir)
		if err := os.MkdirAll(localCasDir, os.ModePerm); err != nil {
			os.Remove(tempCompileFile)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create CAS directory"})
			return
		}
		
		internalName := filepath.Join(casSubdir, casFilename)
		
		// Run StorageService Put operation to transfer the file to FTP (or keep it local if LOCAL mode)
		storageSvc := GetStorageService()
		var putErr error
		actualStoragePath, putErr = storageSvc.Put(c.Request.Context(), tempCompileFile, internalName)
		if putErr != nil {
			os.Remove(tempCompileFile)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to transfer file to storage: " + putErr.Error()})
			return
		}

		// Clean up local temp compiled file if stored remotely
		if actualStoragePath != tempCompileFile {
			os.Remove(tempCompileFile)
		}
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
	case ".obj", ".fbx", ".stl", ".blend", ".step", ".iges", ".glb", ".gltf": docType = "3d"
	}

	status := "Ready"
	if docType == "3d" && extLower != ".glb" && extLower != ".gltf" {
		status = "Processing"
	}

	// 1. Check if a logical File with the same Title already exists in the target folder
	var fileRecord models.File
	isNewFile := false
	storageSvc := GetStorageService()

	if err := database.DB.Where("folder_id = ? AND title = ? AND tenant_id = ?", folderID, fileHeader.Filename, tenantID).First(&fileRecord).Error; err != nil {
		// New logical file
		isNewFile = true
		fileRecord = models.File{
			ID:          uuid.New(),
			FolderID:    folderID,
			Title:       fileHeader.Filename,
			Type:        docType,
			Size:        fileHeader.Size,
			StoragePath: actualStoragePath,
			Owner:       uploaderName,
			TenantID:    tenantID,
			Status:      status,
		}
		if err := database.DB.Create(&fileRecord).Error; err != nil {
			if !dupFound {
				_ = storageSvc.Delete(c.Request.Context(), actualStoragePath)
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file metadata"})
			return
		}
	} else {
		// Existing logical file, update metadata
		fileRecord.Size = fileHeader.Size
		fileRecord.StoragePath = actualStoragePath
		fileRecord.Status = status
		fileRecord.UpdatedAt = time.Now()
	}

	// 2. Determine Version Number
	var maxVersion int
	database.DB.Model(&models.FileVersion{}).Where("file_id = ?", fileRecord.ID).Select("COALESCE(max(version_number), 0)").Row().Scan(&maxVersion)
	nextVersionNum := maxVersion + 1

	// 3. Create File Version
	fileVer := models.FileVersion{
		ID:            uuid.New(),
		FileID:        fileRecord.ID,
		VersionNumber: nextVersionNum,
		Size:          fileHeader.Size,
		StoragePath:   actualStoragePath,
		Checksum:      checksum,
		CreatedBy:     uploaderName,
		CreatedAt:     time.Now(),
	}

	if err := database.DB.Create(&fileVer).Error; err != nil {
		if isNewFile && !dupFound {
			_ = storageSvc.Delete(c.Request.Context(), actualStoragePath)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file version record"})
		return
	}

	// 4. Update File.CurrentVersionID to point to the new version
	fileRecord.CurrentVersionID = &fileVer.ID
	if err := database.DB.Save(&fileRecord).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update current version reference"})
		return
	}

	if status == "Processing" {
		select {
		case ConversionQueue <- ConversionTask{FileID: fileRecord.ID, TenantID: tenantID}:
		default:
			fmt.Printf("Conversion queue full, dropping task for: %s\n", fileRecord.ID.String())
		}
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
	targetStoragePath := file.StoragePath
	versionIDStr := c.Query("versionId")
	if versionIDStr != "" {
		versionUUID, err := uuid.Parse(versionIDStr)
		if err == nil {
			var version models.FileVersion
			if err := database.DB.Where("id = ? AND file_id = ?", versionUUID, file.ID).First(&version).Error; err == nil {
				targetStoragePath = version.StoragePath
			}
		}
	} else {
		// Default to latest version by version_number if any versions exist
		var latestVersion models.FileVersion
		if err := database.DB.Where("file_id = ?", file.ID).Order("version_number desc").First(&latestVersion).Error; err == nil {
			targetStoragePath = latestVersion.StoragePath
		}
	}

	fileObj, err := storageSvc.Get(c.Request.Context(), targetStoragePath)
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

	// Define target storage path and preview details for streaming
	targetStoragePath := file.StoragePath
	isConverted3D := file.Type == "3d" && !strings.HasSuffix(strings.ToLower(file.Title), ".glb") && !strings.HasSuffix(strings.ToLower(file.Title), ".gltf")
	
	if isConverted3D {
		targetStoragePath = file.StoragePath + "_preview.glb"
	}

	// Define temporary decrypted/decompressed file path
	tempDecryptedPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s", file.ID.String()))
	if isConverted3D {
		tempDecryptedPath = filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_preview.glb", file.ID.String()))
	}

	versionIDStr := c.Query("versionId")
	if versionIDStr != "" {
		versionUUID, err := uuid.Parse(versionIDStr)
		if err == nil {
			var version models.FileVersion
			if err := database.DB.Where("id = ? AND file_id = ?", versionUUID, file.ID).First(&version).Error; err == nil {
				targetStoragePath = version.StoragePath
				if isConverted3D {
					targetStoragePath = version.StoragePath + "_preview.glb"
				}
				tempDecryptedPath = filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_%s", file.ID.String(), version.ID.String()))
				if isConverted3D {
					tempDecryptedPath = filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_%s_preview.glb", file.ID.String(), version.ID.String()))
				}
			}
		}
	} else {
		// Default to latest version by version_number if any versions exist
		var latestVersion models.FileVersion
		if err := database.DB.Where("file_id = ?", file.ID).Order("version_number desc").First(&latestVersion).Error; err == nil {
			targetStoragePath = latestVersion.StoragePath
			if isConverted3D {
				targetStoragePath = latestVersion.StoragePath + "_preview.glb"
			}
			tempDecryptedPath = filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_%s", file.ID.String(), latestVersion.ID.String()))
			if isConverted3D {
				tempDecryptedPath = filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_%s_preview.glb", file.ID.String(), latestVersion.ID.String()))
			}
		}
	}

	// Check if we need to create the decrypted temp file
	if _, err := os.Stat(tempDecryptedPath); os.IsNotExist(err) {
		// Get content using active StorageService (e.g. LOCAL or FTP)
		storageSvc := GetStorageService()
		fileObj, err := storageSvc.Get(c.Request.Context(), targetStoragePath)
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
	if isConverted3D {
		contentType = "model/gltf-binary"
	}

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

	// Fetch all versions of this file
	var versions []models.FileVersion
	database.DB.Where("file_id = ?", file.ID).Find(&versions)

	// Clean up standard preview caches
	pathsToDelete := []string{
		filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s", file.ID.String())),
		filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_preview.glb", file.ID.String())),
	}

	// Clean up versioned preview caches
	for _, ver := range versions {
		pathsToDelete = append(pathsToDelete, filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_%s", file.ID.String(), ver.ID.String())))
		pathsToDelete = append(pathsToDelete, filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_%s_preview.glb", file.ID.String(), ver.ID.String())))
	}

	for _, path := range pathsToDelete {
		_ = os.Remove(path)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Stream buffer and version caches cleaned up successfully"})
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

	// Fetch all versions of this file
	var versions []models.FileVersion
	database.DB.Where("file_id = ?", file.ID).Find(&versions)

	storageSvc := GetStorageService()

	// Clean up versions physical files
	for _, version := range versions {
		// Check if this storage path is shared by other files' versions
		var pathCount int64
		database.DB.Model(&models.FileVersion{}).Where("storage_path = ? AND file_id != ?", version.StoragePath, file.ID).Count(&pathCount)

		if pathCount == 0 {
			// Only delete physically if no other logical file uses it
			if err := storageSvc.Delete(c.Request.Context(), version.StoragePath); err != nil {
				fmt.Printf("Warning: Failed to delete storage file %s: %v\n", version.StoragePath, err)
			}
		}

		// Clean up temporary decrypted buffer if it exists
		tempDecryptedPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_%s", file.ID.String(), version.ID.String()))
		if err := os.Remove(tempDecryptedPath); err != nil && !os.IsNotExist(err) {
			fmt.Printf("Warning: Failed to delete stream buffer %s: %v\n", tempDecryptedPath, err)
		}
	}

	// Also clean up current version's standard cache path
	tempDecryptedPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s", file.ID.String()))
	os.Remove(tempDecryptedPath)
	tempDecryptedPreviewPath := filepath.Join(TempStoragePath, fmt.Sprintf("stream_%s_preview.glb", file.ID.String()))
	os.Remove(tempDecryptedPreviewPath)

	if err := database.DB.Delete(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File and its versions deleted successfully"})
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

	firstName, _ := middleware.GetUserFirstName(c)
	lastName, _ := middleware.GetUserLastName(c)
	uploaderName := "Admin"
	if firstName != "" || lastName != "" {
		uploaderName = strings.TrimSpace(fmt.Sprintf("%s %s", firstName, lastName))
	}

	// 1. Get the current active version of the file to copy its metadata
	var currentVersion models.FileVersion
	if err := database.DB.Where("id = ?", file.CurrentVersionID).First(&currentVersion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve source file version info"})
		return
	}

	// 2. Create the new logical file record
	copiedFileID := uuid.New()
	copiedFile := models.File{
		ID:          copiedFileID,
		FolderID:    input.FolderID,
		Title:       file.Title,
		Type:        file.Type,
		Size:        file.Size,
		StoragePath: file.StoragePath,
		Owner:       uploaderName,
		TenantID:    tenantID,
		Status:      "Ready",
	}

	if err := database.DB.Create(&copiedFile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create copied file record"})
		return
	}

	// 3. Create a new version for the copied file pointing to the same storage path and checksum!
	copiedVersionID := uuid.New()
	copiedVersion := models.FileVersion{
		ID:            copiedVersionID,
		FileID:        copiedFileID,
		VersionNumber: 1,
		Size:          currentVersion.Size,
		StoragePath:   currentVersion.StoragePath,
		Checksum:      currentVersion.Checksum,
		CreatedBy:     uploaderName,
		CreatedAt:     time.Now(),
	}

	if err := database.DB.Create(&copiedVersion).Error; err != nil {
		database.DB.Delete(&copiedFile)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create copied version record"})
		return
	}

	// 4. Link copied file to its version
	copiedFile.CurrentVersionID = &copiedVersion.ID
	database.DB.Save(&copiedFile)

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
	case ".glb":
		return "model/gltf-binary"
	case ".gltf":
		return "model/gltf+json"
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

	firstName, _ := middleware.GetUserFirstName(c)
	lastName, _ := middleware.GetUserLastName(c)
	uploaderName := "Admin"
	if firstName != "" || lastName != "" {
		uploaderName = strings.TrimSpace(fmt.Sprintf("%s %s", firstName, lastName))
	}

	// Calculate SHA-256 checksum of raw body bytes
	checksum := fmt.Sprintf("%x", sha256.Sum256(bodyBytes))
	extension := filepath.Ext(file.Title)

	// Check if a file version with this checksum already exists
	var existingVersion models.FileVersion
	dupFound := false
	var actualStoragePath string
	storageSvc := GetStorageService()

	if err := database.DB.Where("checksum = ?", checksum).First(&existingVersion).Error; err == nil {
		// Duplicate found
		dupFound = true
		actualStoragePath = existingVersion.StoragePath
	} else {
		// Not duplicate. Create temp encrypted file
		tempLocalName := fmt.Sprintf("temp_update_%s.enc", file.ID.String())
		tempLocalPath := filepath.Join(TempStoragePath, tempLocalName)
		
		finalFile, err := os.OpenFile(tempLocalPath, os.O_WRONLY|os.O_TRUNC|os.O_CREATE, 0666)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temporary file for update"})
			return
		}

		iv := make([]byte, aes.BlockSize)
		if _, err := rand.Read(iv); err != nil {
			finalFile.Close()
			os.Remove(tempLocalPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate encryption IV"})
			return
		}
		finalFile.Write(iv)

		block, err := aes.NewCipher(getEncryptionKey())
		if err != nil {
			finalFile.Close()
			os.Remove(tempLocalPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Encryption cipher error"})
			return
		}
		stream := cipher.NewCTR(block, iv)
		cryptoWriter := &cipher.StreamWriter{S: stream, W: finalFile}

		gzWriter := gzip.NewWriter(cryptoWriter)
		if _, err := gzWriter.Write(bodyBytes); err != nil {
			gzWriter.Close()
			finalFile.Close()
			os.Remove(tempLocalPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write compressed and encrypted data"})
			return
		}

		if err := gzWriter.Close(); err != nil {
			finalFile.Close()
			os.Remove(tempLocalPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize compression"})
			return
		}
		finalFile.Close()

		// Place into partitioned CAS directory structure
		hashPrefix1 := checksum[0:2]
		hashPrefix2 := checksum[2:4]
		casFilename := fmt.Sprintf("%s%s", checksum, extension)
		casSubdir := filepath.Join("cas", hashPrefix1, hashPrefix2)
		
		localCasDir := filepath.Join(StoragePath, casSubdir)
		if err := os.MkdirAll(localCasDir, os.ModePerm); err != nil {
			os.Remove(tempLocalPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create CAS directory"})
			return
		}
		
		internalName := filepath.Join(casSubdir, casFilename)
		var putErr error
		actualStoragePath, putErr = storageSvc.Put(c.Request.Context(), tempLocalPath, internalName)
		if putErr != nil {
			os.Remove(tempLocalPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store updated file: " + putErr.Error()})
			return
		}

		if actualStoragePath != tempLocalPath {
			_ = os.Remove(tempLocalPath)
		}
	}

	// Create new FileVersion
	var maxVersion int
	database.DB.Model(&models.FileVersion{}).Where("file_id = ?", file.ID).Select("COALESCE(max(version_number), 0)").Row().Scan(&maxVersion)
	nextVersionNum := maxVersion + 1

	fileVer := models.FileVersion{
		ID:            uuid.New(),
		FileID:        file.ID,
		VersionNumber: nextVersionNum,
		Size:          int64(len(bodyBytes)),
		StoragePath:   actualStoragePath,
		Checksum:      checksum,
		CreatedBy:     uploaderName,
		CreatedAt:     time.Now(),
	}

	if err := database.DB.Create(&fileVer).Error; err != nil {
		if !dupFound {
			_ = storageSvc.Delete(c.Request.Context(), actualStoragePath)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create new file version record"})
		return
	}

	// Update Logical File
	file.Size = int64(len(bodyBytes))
	file.StoragePath = actualStoragePath
	file.CurrentVersionID = &fileVer.ID
	file.UpdatedAt = time.Now()

	if err := database.DB.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update logical file metadata"})
		return
	}

	c.JSON(http.StatusOK, file)
}

// GetFileVersions handles GET /api/files/:id/versions
func GetFileVersions(c *gin.Context) {
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

	var versions []models.FileVersion
	if err := database.DB.Where("file_id = ?", file.ID).Order("version_number desc").Find(&versions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file versions"})
		return
	}

	c.JSON(http.StatusOK, versions)
}

// RestoreFileVersion handles POST /api/files/:id/versions/:ver_id/restore
func RestoreFileVersion(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	versionIDStr := c.Param("ver_id")
	versionUUID, err := uuid.Parse(versionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid version ID"})
		return
	}

	var file models.File
	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	var version models.FileVersion
	if err := database.DB.Where("id = ? AND file_id = ?", versionUUID, file.ID).First(&version).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File version not found"})
		return
	}

	// Promote version to current version
	file.CurrentVersionID = &version.ID
	file.Size = version.Size
	file.StoragePath = version.StoragePath
	file.UpdatedAt = time.Now()

	if err := database.DB.Save(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore file version"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File version successfully restored", "file": file})
}

// DeleteFileVersion handles DELETE /api/files/:id/versions/:ver_id
func DeleteFileVersion(c *gin.Context) {
	tenantID, err := middleware.GetTenantID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Tenant ID missing"})
		return
	}

	id := c.Param("id")
	versionIDStr := c.Param("ver_id")
	versionUUID, err := uuid.Parse(versionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid version ID"})
		return
	}

	var file models.File
	if err := database.DB.Where("id = ? AND tenant_id = ?", id, tenantID).First(&file).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Cannot delete the currently active version of a file!
	if file.CurrentVersionID != nil && *file.CurrentVersionID == versionUUID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the active file version. Restore another version first."})
		return
	}

	var version models.FileVersion
	if err := database.DB.Where("id = ? AND file_id = ?", versionUUID, file.ID).First(&version).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File version not found"})
		return
	}

	// Check if this physical storage path is shared by other file versions (due to CAS deduplication)
	var pathCount int64
	database.DB.Model(&models.FileVersion{}).Where("storage_path = ?", version.StoragePath).Count(&pathCount)

	if err := database.DB.Delete(&version).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file version record"})
		return
	}

	// Only delete the physical file from disk/remote storage if it is not shared by other file versions (no other duplicates)
	if pathCount <= 1 {
		storageSvc := GetStorageService()
		_ = storageSvc.Delete(c.Request.Context(), version.StoragePath)
	}

	c.JSON(http.StatusOK, gin.H{"message": "File version deleted successfully"})
}
