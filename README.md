# readme

```txt
/stealth-collector
├── tools/
│   └── gen_keys.go       # [关键] 密钥生成器，用于生成混淆的 Go 代码
├── wasm/
│   ├── main.go           # WASM 主逻辑
│   └── keys.go           # [由 gen_keys 生成] 包含混淆后的密钥库
├── client/
│   ├── src/
│   │   ├── index.js
│   │   └── App.js        # React 逻辑
│   ├── webpack.config.js # 代码混淆配置
│   └── package.json
├── server/
│   └── main.go           # 后端 (SQLite + 解密逻辑)
└── go.mod                # Go 依赖管理
```