package database

import (
	"fmt"
	"log"
	"os"

	"filesphere-api/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	// Defaults for local docker-compose setup
	host := "localhost"
	user := "user"
	password := "password"
	dbname := "filesphere"
	port := "5432"

	// Allow override via environment variables
	if h := os.Getenv("DB_HOST"); h != "" { host = h }
	if u := os.Getenv("DB_USER"); u != "" { user = u }
	if p := os.Getenv("DB_PASSWORD"); p != "" { password = p }
	if d := os.Getenv("DB_NAME"); d != "" { dbname = d }
	if P := os.Getenv("DB_PORT"); P != "" { port = P }

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		host, user, password, dbname, port)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}

	log.Println("Database connection successfully opened")

	// Auto Migrate the schema
	err = db.AutoMigrate(&models.Folder{}, &models.File{})
	if err != nil {
		log.Fatal("Failed to migrate database. \n", err)
	}

	log.Println("Database migration completed")
	DB = db
}
