import { spawn } from "child_process";

// 启动服务器进程
const isBun = typeof process.versions.bun !== 'undefined';
const serverProcess = spawn(
  isBun ? "bun" : "npx", 
  isBun ? ["index.ts"] : ["tsx", "index.ts"],
  {stdio: ["pipe", "pipe", "inherit"], shell: true}
);

// 准备简单的 JSON-RPC 请求
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: { version: "1.0" },
};

let buffer = "";

// 监听服务器输出并按行解析 JSON-RPC 消息
serverProcess.stdout.on("data", (data) => {
  buffer += data.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || ""; // 保留最后一行可能的半包

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 仅尝试解析完整 JSON 行
    if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      continue;
    }

    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (msg.id === 1 && msg.result && msg.result.tools) {
      console.log("工具列表已获取，发送搜索请求...");
      const searchRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          version: "0.1.0",
          name: "bilibili-search",
          arguments: { keyword: "岛市老八", limit: 10 },
        },
      };
      serverProcess.stdin.write(JSON.stringify(searchRequest) + "\n");
      continue;
    }

    if (msg.id === 2) {
      const result = msg.result ?? msg;
      if (result.isError) {
        const errText = Array.isArray(result.content) && result.content[0]?.text ? result.content[0].text : "未知错误";
        console.error("搜索发生错误:", errText);
      } else {
        const textBlock = Array.isArray(result.content) ? result.content.find((c) => c.type === "text") : null;
        let results = [];
        if (textBlock && typeof textBlock.text === "string") {
          try {
            results = JSON.parse(textBlock.text);
          } catch {
            console.warn("无法解析搜索结果文本为JSON，原始文本:", textBlock.text?.slice(0, 200));
          }
        }

        console.log(`搜索完成，共返回 ${Array.isArray(results) ? results.length : 0} 条结果。`);
        const topN = (results || []).slice(0, 5);
        for (let i = 0; i < topN.length; i++) {
          const r = topN[i];
          console.log(`#${i + 1} ${r.title} | 作者: ${r.author} | 播放: ${r.play_count} | 发布: ${r.publish_date} | 链接: ${r.url}`);
        }
      }
      // 关闭服务器
      try { serverProcess.stdin.end(); } catch {}
      serverProcess.kill();
      process.exit(0);
    }
  }
});

// 发送请求前打印请求内容
console.log("发送 MCP 请求:", JSON.stringify(request, null, 2));
serverProcess.stdin.write(JSON.stringify(request) + "\n");

// 设置超时
setTimeout(() => {
  console.error("测试超时");
  try { serverProcess.stdin.end(); } catch {}
  serverProcess.kill();
  process.exit(1);
}, 10000); // 增加超时时间
