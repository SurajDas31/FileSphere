package controllers

import (
	"context"
	"fmt"
	"io"
	"os"
	"strconv"
	"time"

	"filesphere-api/database"
	"github.com/jlaffaye/ftp"
)

// StorageService defines an interface for general document stores (NFS/FTP/S3 etc)
type StorageService interface {
	Put(ctx context.Context, sourcePath string, destFilename string) (string, error)
	Get(ctx context.Context, storagePath string) (io.ReadCloser, error)
	Delete(ctx context.Context, storagePath string) error
}

// LocalStorage implements NFS / Local Filesystem Storage
type LocalStorage struct {
	BaseDir string
}

func (l *LocalStorage) Put(ctx context.Context, sourcePath string, destFilename string) (string, error) {
	// Already written locally, just return target path
	return sourcePath, nil
}

func (l *LocalStorage) Get(ctx context.Context, storagePath string) (io.ReadCloser, error) {
	return os.Open(storagePath)
}

func (l *LocalStorage) Delete(ctx context.Context, storagePath string) error {
	return os.Remove(storagePath)
}

// FtpStorage implements remote FTP Storage
type FtpStorage struct {
	Host     string
	Port     int
	Username string
	Password string
	BasePath string
}

func (f *FtpStorage) getClient() (*ftp.ServerConn, error) {
	addr := fmt.Sprintf("%s:%d", f.Host, f.Port)
	c, err := ftp.DialTimeout(addr, 5*time.Second)
	if err != nil {
		return nil, err
	}
	err = c.Login(f.Username, f.Password)
	if err != nil {
		c.Quit()
		return nil, err
	}
	return c, nil
}

func (f *FtpStorage) Put(ctx context.Context, sourcePath string, destFilename string) (string, error) {
	client, err := f.getClient()
	if err != nil {
		return "", err
	}
	defer client.Quit()

	file, err := os.Open(sourcePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	// Ensure remote folder exists
	_ = client.MakeDir(f.BasePath)
	_ = client.ChangeDir(f.BasePath)

	remotePath := f.BasePath + "/" + destFilename
	err = client.Stor(destFilename, file)
	if err != nil {
		return "", err
	}

	return "ftp://" + remotePath, nil
}

func (f *FtpStorage) Get(ctx context.Context, storagePath string) (io.ReadCloser, error) {
	client, err := f.getClient()
	if err != nil {
		return nil, err
	}

	// Remove ftp:// prefix if present
	path := storagePath
	if len(path) > 6 && path[:6] == "ftp://" {
		path = path[6:]
	}

	resp, err := client.Retr(path)
	if err != nil {
		client.Quit()
		return nil, err
	}

	// Wrap response to quit client when read completes
	return &ftpReadCloser{
		Response: resp,
		Client:   client,
	}, nil
}

type ftpReadCloser struct {
	Response io.ReadCloser
	Client   *ftp.ServerConn
}

func (f *ftpReadCloser) Read(p []byte) (n int, err error) {
	return f.Response.Read(p)
}

func (f *ftpReadCloser) Close() error {
	err := f.Response.Close()
	f.Client.Quit()
	return err
}

func (f *FtpStorage) Delete(ctx context.Context, storagePath string) error {
	client, err := f.getClient()
	if err != nil {
		return err
	}
	defer client.Quit()

	path := storagePath
	if len(path) > 6 && path[:6] == "ftp://" {
		path = path[6:]
	}

	return client.Delete(path)
}

// GetStorageService fetches the current active storage engine configured in the system_settings database table
func GetStorageService() StorageService {
	// Query system_settings table directly
	var settings []struct {
		SettingKey   string `gorm:"column:setting_key;primaryKey"`
		SettingValue string `gorm:"column:setting_value"`
	}

	database.DB.Table("system_settings").Find(&settings)
	configMap := make(map[string]string)
	for _, s := range settings {
		configMap[s.SettingKey] = s.SettingValue
	}

	storageType := configMap["storage_type"]
	if storageType == "FTP" {
		port, _ := strconv.Atoi(configMap["ftp_port"])
		if port == 0 {
			port = 21
		}
		basePath := configMap["storage_path"]
		if basePath == "" {
			basePath = "/"
		}
		return &FtpStorage{
			Host:     configMap["ftp_host"],
			Port:     port,
			Username: configMap["ftp_user"],
			Password: configMap["ftp_password"],
			BasePath: basePath,
		}
	}

	// Default Standard Local File System / NFS
	return &LocalStorage{
		BaseDir: configMap["storage_path"],
	}
}
