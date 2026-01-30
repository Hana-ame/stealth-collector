import React, { useEffect, useState } from 'react';
import { sha256 } from 'js-sha256'; // 需要 npm install js-sha256

function App() {
  const [status, setStatus] = useState('Loading Security Module...');

  useEffect(() => {
    const init = async () => {
      // 1. 加载 WASM 环境
      const go = new window.Go();
      const wasmObj = await WebAssembly.instantiateStreaming(
        fetch("main.wasm"), 
        go.importObject
      );
      go.run(wasmObj.instance);
      
      setStatus('Collecting Fingerprints...');

      // 2. 并行采集指纹 (JS 侧)
      const data = {};
      
      // 基础 BOM/DOM 信息
      data.ua = navigator.userAgent;
      data.screen = `${window.screen.width}x${window.screen.height}`;
      data.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      data.cores = navigator.hardwareConcurrency || -1;
      data.mem = navigator.deviceMemory || -1;

      // Canvas 指纹 (2D)
      data.canvas_fp = await getCanvasFP();

      // GPU 指纹 (WebGL)
      data.gpu_renderer = getGPUModel();

      // WebRTC 真实 IP (异步)
      data.webrtc_ip = await getRealIP();

      // 3. 生成摘要 (Digest) - 为每个特征生成 SHA256
      // 最终发送格式：[摘要1, 摘要2..., 加密数据]
      const digests = [];
      const keys = Object.keys(data).sort(); // 排序保证顺序一致
      for (const k of keys) {
        digests.push(sha256(String(data[k])));
      }

      // 4. 调用 WASM 进行终极加密
      // 将 JS 对象转字符串传给 WASM
      // WASM 会加入它自己的 CPU 跑分，然后进行 4 层套娃加密
      const jsonStr = JSON.stringify(data);
      
      // wasmProcess 返回的是 Uint8Array: [idx1, idx2, ...cipher]
      const encryptedBytes = window.wasmProcess(jsonStr);

      // 5. 组装最终 Payload 并发送
      // 我们将 encryptedBytes 转为 Base64 以便传输
      const encryptedBase64 = arrayBufferToBase64(encryptedBytes);

      const finalPayload = [
        ...digests, // 摘要列表
        encryptedBase64 // 加密后的乱码 (包含头部2字节的Key索引)
      ];

      setStatus('Sending Secure Report...');
      
      await fetch('/api/collect', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(finalPayload)
      });

      setStatus('Verified.');
    };

    init();
  }, []);

  return (
    <div style={{padding: 50, fontFamily: 'monospace'}}>
      <h1>System Check</h1>
      <p>Status: {status}</p>
    </div>
  );
}

// --- 辅助采集函数 ---

function getCanvasFP() {
    return new Promise(resolve => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillText("Wm-Ic_#9q", 2, 2);
        resolve(canvas.toDataURL());
    });
}

function getGPUModel() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    } catch(e) { return "unknown"; }
}

function getRealIP() {
    return new Promise(resolve => {
        const pc = new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
        pc.createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o));
        pc.onicecandidate = i => {
            if(i && i.candidate) {
                const res = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(i.candidate.candidate);
                if(res) resolve(res[1]);
            }
        };
        setTimeout(() => resolve("timeout"), 1500);
    });
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export default App;