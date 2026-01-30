package main

import (
	"crypto/rand"
	// "encoding/hex"
	"fmt"
	"os"
	"strings"
)

// 混淆种子 (XOR key)，让 WASM 中的数据看起来像随机乱码
const XOR_SEED = 0x5A 

func main() {
	fmt.Println("正在生成 100 个高强度密钥并注入到 wasm/keys.go ...")

	var goCode strings.Builder
	goCode.WriteString("package main\n\n// 自动生成的混淆密钥库，请勿手动修改\n")
	goCode.WriteString("var obfuscatedKeys = [][]byte{\n")

	for i := 0; i < 100; i++ {
		// 1. 生成 32 字节 (256-bit) 随机密钥
		key := make([]byte, 32)
		rand.Read(key)

		// 2. 写入 Go 代码格式，但在写入前进行异或混淆
		// 这样编译后的 WASM 文件中绝对找不到原始 Key
		goCode.WriteString("\t{")
		for _, b := range key {
			goCode.WriteString(fmt.Sprintf("0x%02X, ", b^XOR_SEED))
		}
		goCode.WriteString("},\n")
	}
	goCode.WriteString("}\n")

	// 3. 注入还原函数
	goCode.WriteString(fmt.Sprintf(`
// 运行时动态还原密钥
func getKey(index int) []byte {
	raw := obfuscatedKeys[index]
	realKey := make([]byte, len(raw))
	for i, b := range raw {
		realKey[i] = b ^ 0x%02X
	}
	return realKey
}
`, XOR_SEED))

	os.WriteFile("wasm/keys.go", []byte(goCode.String()), 0644)
	os.WriteFile("server/keys.go", []byte(goCode.String()), 0644)
	fmt.Println("密钥注入完成！")
}