import React, { useState, useEffect } from "react";
import type { CSSProperties } from "react";
// --- 类型定义 ---
interface StorageData {
  url: string;
  rtt: number;
}

type Step = "countdown" | "choice" | "loading" | "result";

export default function App() {
  // --- 配置区域 ---
  // const QR_IMAGE = "https://via.placeholder.com/250?text=Payment+QR";
  const TUTORIAL_IMAGE =
    "https://via.placeholder.com/600x400?text=Tutorial+Image";

  // --- 状态初始化 (修复核心：直接从本地存储读取初始值) ---
  const [result, setResult] = useState<StorageData | null>(() => {
    const cached = localStorage.getItem("user_auth_data");
    return cached ? JSON.parse(cached) : null;
  });

  const [step, setStep] = useState<Step>(() => {
    const cached = localStorage.getItem("user_auth_data");
    return cached ? "result" : "countdown";
  });

  const [seconds, setSeconds] = useState(10);

  // --- 倒计时逻辑 ---
  useEffect(() => {
    // 只有在倒计时步骤且时间大于0时才启动
    if (step === "countdown" && seconds > 0) {
      const timer = setTimeout(() => setSeconds((v) => v - 1), 1000);
      return () => clearTimeout(timer);
    }
    // 时间到，切换到选项
    if (step === "countdown" && seconds === 0) {
      setTimeout(() => setStep("choice"), 200);
    }
  }, [seconds, step]);

  // --- 处理请求 ---
  const handleVerify = async (hasPaid: boolean) => {
    if (!hasPaid) {
      alert("请先完成支付");
      return;
    }
    setStep("loading");

    try {
      const resp = await fetch("/get");
      const data = await resp.json();
      const finalData = data;

      localStorage.setItem("user_auth_data", JSON.stringify(finalData));
      setResult(finalData);
      setStep("result");
    } catch (e) {
      // 模拟失败演示
      console.error(e);
      const mock = { url: "https://fallback-secure-link.com/access", rtt: 42 };
      localStorage.setItem("user_auth_data", JSON.stringify(mock));
      setResult(mock);
      setStep("result");
    }
  };

  // --- 原生样式 (Inline Styles) ---
  const styles: { [key: string]: CSSProperties } = {
    wrapper: {
      minHeight: "100vh",
      backgroundColor: "#0f172a",
      color: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, system-ui, sans-serif",
      padding: "20px",
    },
    card: {
      backgroundColor: "#1e293b",
      padding: "40px",
      borderRadius: "24px",
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      textAlign: "center",
      maxWidth: "500px",
      width: "100%",
      border: "1px solid #334155",
    },
    bigText: {
      fontSize: "80px",
      fontWeight: "bold",
      color: "#3b82f6",
      margin: "20px 0",
    },
    qr: {
      width: "220px",
      height: "220px",
      margin: "0 auto 20px",
      display: "block",
      borderRadius: "16px",
      border: "4px solid #334155",
    },
    btnBlue: {
      width: "100%",
      padding: "16px",
      backgroundColor: "#2563eb",
      border: "none",
      borderRadius: "12px",
      color: "white",
      fontWeight: "bold",
      fontSize: "18px",
      cursor: "pointer",
      marginBottom: "12px",
    },
    btnGray: {
      width: "100%",
      padding: "16px",
      backgroundColor: "#475569",
      border: "none",
      borderRadius: "12px",
      color: "#cbd5e1",
      fontSize: "16px",
      cursor: "pointer",
    },
    linkBox: {
      padding: "20px",
      backgroundColor: "#0f172a",
      borderRadius: "12px",
      color: "#60a5fa",
      wordBreak: "break-all",
      textDecoration: "underline",
      display: "block",
      fontSize: "18px",
      border: "1px dashed #3b82f6",
    },
  };

  // --- 视图渲染 ---

  // 1. 结果页面 (如果 result 存在，直接显示)
  if (step === "result" && result) {
    return (
      <div style={styles.wrapper}>
        <div style={{ ...styles.card, maxWidth: "800px" }}>
          <h2 style={{ marginBottom: "10px", color: "#4ade80" }}>
            下次访问不会改变。
          </h2>
          <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
            首次使用开始计时
          </p>
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            style={styles.linkBox}
          >
            {result.url}
          </a>
          <div style={{ marginTop: "40px", textAlign: "left" }}>
            <p
              style={{
                color: "#f8fafc",
                fontWeight: "bold",
                marginBottom: "15px",
              }}
            >
              使用教程：
            </p>
            <img
              src={TUTORIAL_IMAGE}
              alt="Tutorial"
              style={{
                width: "100%",
                borderRadius: "12px",
                border: "1px solid #334155",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. 初始/过程中页面
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {step === "countdown" && (
          <>
            <h3 style={{ color: "#94a3b8" }}>大变申</h3>
            {/* <h3 style={{ color: "#94a3b8" }}>微信要饭连接，可以不用给。给过的千万别再给了</h3> */}
            {/* <h3 style={{ color: "#94a3b8" }}>有钱了会多做点灾备，没有钱大家也可以养生</h3> */}
            <div style={styles.bigText}>{seconds}</div>
            {/* <img src={QR_IMAGE} alt="QR" style={styles.qr} /> */}
            <p style={{ color: "#64748b" }}>
              等个10秒会给一个vmess连接，不需要翻墙的可以直接撤退了。
            </p>
            <p style={{ color: "#64748b" }}>
              别吐槽为啥每次都是vmess连接，因为我只有这个啊。
            </p>
            <p style={{ color: "#64748b" }}>
              1.5T~/月，所有人共用。单个连接也有限制，100G/100天。
            </p>
          </>
        )}

        {step === "choice" && (
          <>
            {handleVerify(true)}
            {/* <h2 style={{ marginBottom: "30px" }}>只是问卷调查，如实选择，不影响之后内容</h2>
            <button style={styles.btnBlue} onClick={() => handleVerify(true)}>
              我已给钱
            </button>
            <button style={styles.btnGray} onClick={() => handleVerify(false)}>
              我没给钱
            </button> */}
          </>
        )}

        {step === "loading" && (
          <div style={{ padding: "40px 0" }}>
            <div className="loader" />
            <p style={{ color: "#3b82f6" }}>请求中</p>
            <style>{`
              .loader {
                border: 4px solid #1e293b;
                border-top: 4px solid #3b82f6;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
