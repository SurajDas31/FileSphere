package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Folder represents a directory structure
type Folder struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	ParentID  *uuid.UUID `gorm:"type:uuid" json:"parentId"`
	TenantID  string     `gorm:"not null;index" json:"tenantId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Relationships
	SubFolders []Folder `gorm:"foreignKey:ParentID" json:"subFolders,omitempty"`
	Files      []File   `gorm:"foreignKey:FolderID" json:"files,omitempty"`
}

// File represents the logical document container
type File struct {
	ID               uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	FolderID         uuid.UUID      `gorm:"type:uuid;not null;index" json:"folderId"`
	Title            string         `gorm:"not null" json:"title"`
	Type             string         `gorm:"not null" json:"type"` // e.g., pdf, word, excel, image, text, zip, 3d
	Size             int64          `gorm:"not null" json:"size"` // Size of the active current version
	StoragePath      string         `gorm:"not null" json:"-"`    // Storage path of the active current version
	Owner            string         `gorm:"default:'Admin'" json:"owner"`
	Tags             string         `gorm:"default:'none'" json:"tags"`
	TenantID         string         `gorm:"not null;index" json:"tenantId"`
	Status           string         `gorm:"default:'Ready'" json:"status"`
	CurrentVersionID *uuid.UUID     `gorm:"type:uuid" json:"currentVersionId,omitempty"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
	Versions         []FileVersion  `gorm:"foreignKey:FileID;constraint:OnDelete:CASCADE" json:"versions,omitempty"`
}

// FileVersion represents a physical file state copy in storage
type FileVersion struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	FileID        uuid.UUID `gorm:"type:uuid;not null;index" json:"fileId"`
	VersionNumber int       `gorm:"not null" json:"versionNumber"`
	Size          int64     `gorm:"not null" json:"size"`
	StoragePath   string    `gorm:"not null" json:"-"`
	Checksum      string    `gorm:"type:varchar(64);not null;index" json:"checksum"`
	CreatedBy     string    `gorm:"default:'Admin'" json:"createdBy"`
	CreatedAt     time.Time `json:"createdAt"`
}

// BeforeCreate hooks to automatically generate UUIDs if not provided
func (folder *Folder) BeforeCreate(tx *gorm.DB) (err error) {
	if folder.ID == uuid.Nil {
		folder.ID = uuid.New()
	}
	return
}

func (file *File) BeforeCreate(tx *gorm.DB) (err error) {
	if file.ID == uuid.Nil {
		file.ID = uuid.New()
	}
	return
}
