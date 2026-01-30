const ENDPOINT = "http://127.26.1.31:8080";

export async function pingAPI() {
  console.log(`fetch(${ENDPOINT}/ping);`)
  return {
    // 模拟 Response 对象的 json 方法
    json: async () => ({
      key: "fixed-secret-key-2026",
      status: "pong",
    }),
  };
}

export async function getAPI(encryptedData: string) {
  console.log("Mocking getAPI with data:", encryptedData);
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    // 必须返回一个包含 json 函数的对象，且函数是 async 的
    json: async () => ({
      url: "https://mock-api-result.com/v1/status",
      id: "report-" + Math.random().toString(36).substr(2, 9),
      success: true
    })
  };}

// export async function pingAPI() {
//   return await fetch(`${ENDPOINT}/ping`);
// }

// export async function getAPI(encryptedData: string) {
//   return await fetch(`${ENDPOINT}/get`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ data: encryptedData }),
//   });
// }
