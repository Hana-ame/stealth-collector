package main

import (
	"crypto/aes"
	"crypto/cipher"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite" // 纯 Go SQLite 驱动
)

// 必须与 tools/gen_keys.go 中的逻辑一致，这里需要一份相同的 Key 列表
// 在实际工程中，gen_keys.go 可以同时生成 server/keys.go
// 这里为了演示，我们假设 keyPool 已经加载
var keyPool [][]byte

// 初始化 Key (模拟服务端也持有那100个Key)
func init() {
	// 注意：在真实部署中，你应该让 tools/gen_keys.go 同时输出服务端代码
	// 这里我只写逻辑：服务端必须有同样的 Key
	// 为了代码能跑，这里使用了固定的伪代码。请务必使用工具生成的服务端Key文件。
	// fmt.Println("Server Keys Initialized (Mock)")
	// for i := 0; i < 100; i++ {
	// 	keyPool[i] = make([]byte, 32)
	// 	// 填充假数据，实际上这里应该是真实的 Key
	// }
	keyPool = obfuscatedKeys
}

// 数据结构：前端发来的是一个数组
// [ "digest1", "digest2", ..., "base64_encrypted_payload" ]
func handleCollect(w http.ResponseWriter, r *http.Request) {
	var rawReq []string
	if err := json.NewDecoder(r.Body).Decode(&rawReq); err != nil {
		http.Error(w, "Bad JSON", 400)
		return
	}

	if len(rawReq) < 1 {
		http.Error(w, "Empty", 400)
		return
	}

	// 1. 提取各个部分
	digests := rawReq[:len(rawReq)-1]     // 前面 n-1 个是摘要
	encryptedB64 := rawReq[len(rawReq)-1] // 最后一个是加密体

	// 2. Base64 解码
	cipherBlob, err := base64.StdEncoding.DecodeString(encryptedB64)
	if err != nil || len(cipherBlob) < 2 {
		http.Error(w, "Decode Err", 400)
		return
	}

	// 3. 提取 Key 索引 (前两个字节)
	idx1 := int(cipherBlob[0])
	idx2 := int(cipherBlob[1])
	payload := cipherBlob[2:]

	if idx1 >= 100 || idx2 >= 100 {
		http.Error(w, "Key Index Error", 400)
		return
	}

	// 获取服务端持有的 Key
	// k1 := keyPool[idx1]
	// k2 := keyPool[idx2]
	k1 := getKey(idx1)
	k2 := getKey(idx2)

	// 4. 逆向解密：顺序必须完全反过来
	// WASM: XOR(k1) -> AES(k1) -> AES(k2) -> XOR(k2)
	// Srvr: XOR(k2) -> Decrypt(k2) -> Decrypt(k1) -> XOR(k1)

	// Step A: XOR k2
	step1 := xorBytes(payload, k2)

	// Step B: Decrypt AES k2
	step2, err := aesDecrypt(step1, k2)
	if err != nil {
		fmt.Println("Decryption Error Layer 2:", err)
		return
	}

	// Step C: Decrypt AES k1
	step3, err := aesDecrypt(step2, k1)
	if err != nil {
		fmt.Println("Decryption Error Layer 1:", err)
		return
	}

	// Step D: XOR k1
	finalJSON := xorBytes(step3, k1)

	fmt.Printf("Success! IP: %s, Decrypted Data: %s\n", r.RemoteAddr, string(finalJSON))
	fmt.Printf("Digests received: %v\n", digests)

	// TODO: 存入 SQLite
	// db.Exec("INSERT INTO ...")
	
	w.Write([]byte("OK"))
}

// 辅助：AES-GCM 解密
func aesDecrypt(data []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil { return nil, err }
	gcm, err := cipher.NewGCM(block)
	if err != nil { return nil, err }

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	return gcm.Open(nil, nonce, ciphertext, nil)
}

func xorBytes(data, key []byte) []byte {
	out := make([]byte, len(data))
	for i := 0; i < len(data); i++ {
		out[i] = data[i] ^ key[i%len(key)]
	}
	return out
}

func main() {
	// 连接数据库
	db, _ := sql.Open("sqlite", "./data.db")
	defer db.Close()
	db.Exec(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, data TEXT)`)

	http.HandleFunc("/api/collect", handleCollect)

	// 服务静态文件 (支持 .wasm MIME)
	fs := http.FileServer(http.Dir("../dist"))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, ".wasm") {
			w.Header().Set("Content-Type", "application/wasm")
		}
		fs.ServeHTTP(w, r)
	})

	log.Println("Listening on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}