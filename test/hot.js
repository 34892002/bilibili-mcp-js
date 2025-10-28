import { spawn } from "child_process";

// 启动服务器进程 - 修正路径，指向项目根目录的index.ts
const isBun = typeof process.versions.bun !== 'undefined';
const serverProcess = spawn(
  isBun ? "bun" : "npx", 
  isBun ? ["../index.ts"] : ["tsx", "../index.ts"],
  {stdio: ["pipe", "pipe", "inherit"], shell: true, cwd: process.cwd()}
);

// 准备简单的 JSON-RPC 请求
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: { version: "1.0" },
};

let buffer = "";
let currentTestId = 2;

// 定义测试类型和对应的emoji
const testTypes = [
  { type: "all", name: "综合热门", emoji: "🔥" },
  { type: "history", name: "入站必刷", emoji: "💎" },
  { type: "rank", name: "排行榜", emoji: "🏆" },
  { type: "music", name: "全站音乐榜", emoji: "🎵" }
];

let currentTestIndex = 0;

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
      console.log("工具列表已获取，开始测试热门内容...\n");
      sendNextTest();
      continue;
    }

    // 处理热门内容测试结果
    if (msg.id >= 2 && msg.id <= 5) {
      const testIndex = msg.id - 2;
      const testType = testTypes[testIndex];
      
      const result = msg.result ?? msg;
      if (result.isError) {
        const errText = Array.isArray(result.content) && result.content[0]?.text ? result.content[0].text : "未知错误";
        console.error(`${testType.emoji} 获取${testType.name}内容发生错误:`, errText);
      } else {
        const textBlock = Array.isArray(result.content) ? result.content.find((c) => c.type === "text") : null;
        let results = [];
        if (textBlock && typeof textBlock.text === "string") {
          try {
            results = JSON.parse(textBlock.text);
          } catch {
            console.warn(`无法解析${testType.name}内容结果文本为JSON，原始文本:`, textBlock.text?.slice(0, 200));
          }
        }

        console.log(`${testType.emoji} ${testType.name}内容获取完成，共返回 ${Array.isArray(results) ? results.length : 0} 条结果。`);
        const topN = (results || []).slice(0, 3);
        for (let i = 0; i < topN.length; i++) {
          const r = topN[i];
          console.log(`#${i + 1} ${r.title} | 作者: ${r.author} | 播放: ${r.play_count} | 时长: ${r.duration} | 链接: ${r.url}`);
        }
        console.log(); // 空行分隔
      }
      
      // 发送下一个测试
      currentTestIndex++;
      if (currentTestIndex < testTypes.length) {
        sendNextTest();
      } else {
        console.log("所有热门内容类型测试完成！");
        // 关闭服务器
        try { serverProcess.stdin.end(); } catch {}
        serverProcess.kill();
        process.exit(0);
      }
    }
  }
});

function sendNextTest() {
  if (currentTestIndex < testTypes.length) {
    const testType = testTypes[currentTestIndex];
    console.log(`${testType.emoji} 测试${testType.name}内容...`);
    
    const hotRequest = {
      jsonrpc: "2.0",
      id: currentTestId++,
      method: "tools/call",
      params: {
        version: "0.1.0",
        name: "bilibili-hot",
        arguments: { type: testType.type },
      },
    };
    serverProcess.stdin.write(JSON.stringify(hotRequest) + "\n");
  }
}

// 发送请求前打印请求内容
console.log("测试B站所有热门内容类型获取功能...\n");
console.log("发送 MCP 请求:", JSON.stringify(request, null, 2));
serverProcess.stdin.write(JSON.stringify(request) + "\n");

// 设置超时
setTimeout(() => {
  console.error("测试超时");
  try { serverProcess.stdin.end(); } catch {}
  serverProcess.kill();
  process.exit(1);
}, 25000); // 调整超时时间到25秒，因为现在只测试4种类型