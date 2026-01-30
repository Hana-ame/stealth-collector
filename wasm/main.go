package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/json"
	"io"
	"math"
	"syscall/js"
	"time"
)

// 定义需要导出的数据结构 (必须与前端一致)
type FingerprintData struct {
	UserAgent    string `json:"ua"`
	CanvasHash   string `json:"canvas_hash"`
	WebRTCIP     string `json:"webrtc_ip"`
	JS_Benchmark int64  `json:"js_bench"` // JS侧采集的性能
	WASM_CPU     int64  `json:"wasm_cpu"` // WASM侧采集的性能
}

// 1. WASM 级 CPU 性能指纹 (难以伪造)
func runBenchmark() int64 {
	start := time.Now()
	// 执行复杂的浮点运算，考验 CPU ALU
	var r float64 = 0.0
	for i := 0; i < 2000000; i++ {
		r += math.Sqrt(float64(i)) * math.Sin(float64(i))
	}
	// 防止编译器优化掉循环
	if r < 0 {
		return 0
	}
	return time.Since(start).Nanoseconds()
}

// 辅助：简单的 XOR 运算
func xorBytes(data []byte, key []byte) []byte {
	out := make([]byte, len(data))
	for i := 0; i < len(data); i++ {
		out[i] = data[i] ^ key[i%len(key)]
	}
	return out
}

// 辅助：AES-GCM 加密 (带随机 Nonce)
func aesEncrypt(data []byte, key []byte) []byte {
	block, _ := aes.NewCipher(key)
	gcm, _ := cipher.NewGCM(block)
	nonce := make([]byte, gcm.NonceSize())
	io.ReadFull(rand.Reader, nonce) // 随机 Nonce
	return gcm.Seal(nonce, nonce, data, nil) // 结果 = Nonce + CipherText
}

// 2. 核心：处理入口
func processAndEncrypt(this js.Value, args []js.Value) interface{} {
	// args[0] 是前端传来的 JSON 字符串 (包含所有 JS 采集的指纹)
	jsonStr := args[0].String()
	
	// 解析 JSON 并加入 WASM 自己的指纹
	var data map[string]interface{}
	json.Unmarshal([]byte(jsonStr), &data)
	
	// 加入 WASM 测得的硬件性能 (混合 JS 和 WASM 数据)
	data["wasm_cpu_time"] = runBenchmark()
	
	// 重新序列化为字节
	finalJSON, _ := json.Marshal(data)

	// --- 开始套娃加密流程 ---
	
	// 1. 随机选择两个 Key 的索引
	// 注意：为了让后端能解密，我们需要把这两个索引明文(或者简单编码)传回去
	// 这里为了简单，我们把索引放在返回数组的前两位
	rnd := make([]byte, 2)
	io.ReadFull(rand.Reader, rnd)
	idx1 := int(rnd[0]) % 100
	idx2 := int(rnd[1]) % 100

	key1 := getKey(idx1) // 从 keys.go 动态还原
	key2 := getKey(idx2)

	// 按照你的要求：XOR( Encrypt( Encrypt( XOR(data) ) ) )
	
	// Step A: Layer 1 XOR (with Key1)
	step1 := xorBytes(finalJSON, key1)

	// Step B: Layer 2 Encrypt (AES-GCM with Key1)
	step2 := aesEncrypt(step1, key1)

	// Step C: Layer 3 Encrypt (AES-GCM with Key2)
	step3 := aesEncrypt(step2, key2)

	// Step D: Layer 4 XOR (with Key2)
	finalBlob := xorBytes(step3, key2)

	// 返回给 JS 的结果:
	// 结构: [KeyIndex1, KeyIndex2, ...EncryptedDataBytes...]
	// 我们返回一个 Uint8Array 给 JS
	resultLen := 2 + len(finalBlob)
	result := make([]byte, resultLen)
	result[0] = byte(idx1)
	result[1] = byte(idx2)
	copy(result[2:], finalBlob)

	// 将 Go 的 byte slice 转换为 JS 的 Uint8Array
	jsArray := js.Global().Get("Uint8Array").New(resultLen)
	js.CopyBytesToJS(jsArray, result)
	
	return jsArray
}

func main() {
	c := make(chan struct{}, 0)
	// 注册函数给 JS 调用
	js.Global().Set("wasmProcess", js.FuncOf(processAndEncrypt))
	<-c
}