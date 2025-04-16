#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { searchBilibili } from "./src/index.js";


interface BilibiliSearchResult {
  title: string;
  author: string;
  play_count: number;
  duration: string;
  publish_date: string;
  url: string;
  bvid: string;
  upic: string;
  pic: string;
}

const isValidSearchArgs = (
  args: any
): args is { keyword: string; page?: number; limit?: number } =>
  typeof args === "object" &&
  args !== null &&
  typeof args.keyword === "string" &&
  (args.page === undefined || typeof args.page === "number") &&
  (args.limit === undefined || typeof args.limit === "number");

class BilibiliSearchServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "bilibili-search",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "bilibili-search",
          description: "搜索B站视频内容",
          inputSchema: {
            type: "object",
            properties: {
              keyword: {
                type: "string",
                description: "搜索关键词",
              },
              page: {
                type: "number",
                description: "页码（默认：1）",
                minimum: 1,
              },
              limit: {
                type: "number",
                description: "返回结果数量（默认：10）",
                minimum: 1,
                maximum: 20,
              },
            },
            required: ["keyword"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "bilibili-search") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `未知工具: ${request.params.name}`
        );
      }

      if (!isValidSearchArgs(request.params.arguments)) {
        throw new McpError(ErrorCode.InvalidParams, "无效的搜索参数");
      }

      const keyword = request.params.arguments.keyword;
      const page = request.params.arguments.page || 1;
      const limit = Math.min(request.params.arguments.limit || 10, 20);

      try {
        const results = await this.performSearch(keyword, page, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `搜索错误: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async performSearch(
    keyword: string,
    page: number,
    limit: number
  ): Promise<BilibiliSearchResult[]> {
    try {
      // 调用src/index.ts中的searchBilibili函数获取搜索结果
      const searchResults = await searchBilibili(keyword, page, limit);
      
      // 处理视频项目
      const results: BilibiliSearchResult[] = searchResults.map((video: any) => ({
        title: this.cleanTitle(video.title),
        author: video.author || "",
        play_count: parseInt(video.play) || 0,
        duration: video.duration || "",
        publish_date: this.formatDate(video.pubdate),
        url: video.arcurl || `https://www.bilibili.com/video/${video.bvid}`,
        bvid: video.bvid || "",
        upic: video.upic || "",
        pic: video.pic || "",
        tag: video.tag || "",
        description: video.description || "",
      }));

      return results;
    } catch (error) {
      console.error("搜索B站视频时出错:", error);
      throw new Error(`搜索B站视频失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private cleanTitle(title: string): string {
    if (!title) return "";
    return title.replace(/<em class="keyword">(.*?)<\/em>/g, "$1");
  }

  private formatDate(timestamp: number): string {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toISOString().split("T")[0];
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Bilibili Search MCP server running on stdio");
  }
}

const server = new BilibiliSearchServer();
server.run().catch(console.error);
