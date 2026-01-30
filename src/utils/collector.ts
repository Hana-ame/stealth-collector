export const getWebRTCIP = (): Promise<string> => {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pc.createDataChannel("");
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
      const match = ipRegex.exec(e.candidate.candidate);
      if (match) {
        resolve(match[1]);
        pc.onicecandidate = null;
        pc.close();
      }
    };
    pc.createOffer().then((sdp) => pc.setLocalDescription(sdp));
    setTimeout(() => resolve("mDNS_Hidden_or_Timeout"), 3000);
  });
};

export const getHardwareInfo = () => {
  const canvas = document.createElement("canvas");
  const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
  const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");

  return {
    cpu: navigator.hardwareConcurrency || "unknown",
    gpu: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mem: (navigator as any).deviceMemory || "unknown",
  };
};

export const getCanvasFingerprint = (): string => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 240;
  canvas.height = 60;
  ctx.textBaseline = "top";
  ctx.font = "14px 'Arial'";
  ctx.fillStyle = "#f60";
  ctx.fillRect(100, 5, 50, 40);
  ctx.fillStyle = "#069";
  ctx.fillText("Browser2026-Scan", 2, 10);
  ctx.strokeStyle = "rgba(102, 204, 0, 0.7)";
  ctx.strokeText("Fingerprint", 4, 15);
  return canvas.toDataURL();
};

export const runPerformanceTest = () => {
  const start = performance.now();
  let sum = 0;
  for (let i = 0; i < 1_000_000; i++) {
    sum += Math.sqrt(i);
  }
  const end = performance.now();
  if (sum < 0) {
    return
  }
  return {
    score: (end - start).toFixed(4),
    desc: "1M Sqrt Task (ms)"
  };
};