package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

// 全局密钥（实际生产环境建议根据 Session 存储或动态生成）
const SERVER_KEY = "fixed-secret-key-2026"

var db *sql.DB

func initDB() {
	var err error
	// 使用纯 Go 驱动连接 sqlite
	db, err = sql.Open("sqlite", "./data.db")
	if err != nil {
		log.Fatal(err)
	}

	// 创建表
	// logs 表存储收集到的加密信息
	// redirect_urls 表存储待下发的 URL
	queries := []string{
		`CREATE TABLE IF NOT EXISTS logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			raw_data TEXT,
			decrypted_info TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS redirect_urls (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			url TEXT NOT NULL
		);`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Fatal(err)
		}
	}

	// 预埋一条测试 URL（如果表为空）
	var count int
	db.QueryRow("SELECT COUNT(*) FROM redirect_urls").Scan(&count)
	if count == 0 {
		db.Exec("INSERT INTO redirect_urls (url) VALUES (?)", "https://destination-site.com/welcome-"+uuid.NewString())
	}
}

// 解密函数：对应前端的 Web Crypto AES-GCM
func decryptData(cryptoText string, masterKey string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(cryptoText)
	if err != nil {
		return "", err
	}

	// 计算 Key 的 SHA256 (与前端一致)
	keyHash := sha256.Sum256([]byte(masterKey))

	// 前 12 字节是 IV
	if len(data) < 12 {
		return "", fmt.Errorf("invalid ciphertext")
	}
	iv := data[:12]
	ciphertext := data[12:]

	block, err := aes.NewCipher(keyHash[:])
	if err != nil {
		return "", err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	plaintext, err := aesgcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func main() {
	initDB()
	r := gin.Default()

	// 允许跨域（本地测试用）
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Next()
	})

	// 1. /ping 接口：返回密钥
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"key": SERVER_KEY,
		})
	})

	// 2. /get 接口：接收加密数据并返回 URL
	r.POST("/get", func(c *gin.Context) {
		var input struct {
			Data string `json:"data"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// 解密数据
		decrypted, err := decryptData(input.Data, SERVER_KEY)
		if err != nil {
			log.Printf("Decryption failed: %v", err)
			decrypted = "DECRYPTION_FAILED"
		}

		// 存入数据库
		_, err = db.Exec("INSERT INTO logs (raw_data, decrypted_info) VALUES (?, ?)", input.Data, decrypted)
		if err != nil {
			log.Printf("DB Error: %v", err)
		}

		// 从 redirect_urls 表中随机获取一个 URL
		var targetURL string
		err = db.QueryRow("SELECT url FROM redirect_urls ORDER BY RANDOM() LIMIT 1").Scan(&targetURL)
		if err != nil {
			targetURL = "https://default-fallback.com"
		}

		c.JSON(http.StatusOK, gin.H{
			"url": targetURL,
		})
	})

	fmt.Println("Server running at :8080")
	r.Run("127.26.1.31:8080")
}