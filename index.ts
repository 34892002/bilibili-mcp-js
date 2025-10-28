#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { searchBilibili, getHotContent, getVideoDetail, getUserInfo, getUserStat, getUserVideos, getCompleteUserInfo } from "./src/index.js";


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
  tag?: string;
  description?: string;
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
  public server: Server;

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
          name: "bilibili-search-summary",
          description: "搜索B站视频内容简介列表",
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
        {
          name: "bilibili-hot",
          description: "获取B站热门内容",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description: "热门类型：all（综合热门）、history（入站必刷）、rank（排行榜）、music（全站音乐榜）",
                enum: ["all", "history", "rank", "music"],
                default: "all",
              },
            },
            required: [],
          },
        },
        {
          name: "bilibili-video-detail",
          description: "获取B站视频详情信息",
          inputSchema: {
            type: "object",
            properties: {
              videoId: {
                type: "string",
                description: "视频ID，支持BV号（如：BV1xx411c7mD）或AV号（如：av123456或123456）"
              },
            },
            required: ["videoId"],
          },
        },
        {
          name: "bilibili-user-info",
          description: "获取UP主基本信息",
          inputSchema: {
            type: "object",
            properties: {
              uid: {
                type: "string",
                description: "UP主的UID（用户ID）"
              },
            },
            required: ["uid"],
          },
        },
        {
          name: "bilibili-user-stat",
          description: "获取UP主统计信息（粉丝数、关注数等）",
          inputSchema: {
            type: "object",
            properties: {
              uid: {
                type: "string",
                description: "UP主的UID（用户ID）"
              },
            },
            required: ["uid"],
          },
        },
        {
          name: "bilibili-user-videos",
          description: "暂不支持-获取UP主视频列表",
          inputSchema: {
            type: "object",
            properties: {
              uid: {
                type: "string",
                description: "UP主的UID（用户ID）"
              },
              page: {
                type: "number",
                description: "页码（默认：1）",
                minimum: 1,
                default: 1
              },
              pageSize: {
                type: "number",
                description: "每页数量（默认：20）",
                minimum: 1,
                maximum: 50,
                default: 20
              },
              order: {
                type: "string",
                description: "排序方式：pubdate（发布时间）、click（播放量）、stow（收藏量）",
                enum: ["pubdate", "click", "stow"],
                default: "pubdate"
              },
            },
            required: ["uid"],
          },
        },
        {
          name: "bilibili-user-complete",
          description: "获取UP主完整信息（包含基本信息和统计信息）",
          inputSchema: {
            type: "object",
            properties: {
              uid: {
                type: "string",
                description: "UP主的UID（用户ID）"
              },
            },
            required: ["uid"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "bilibili-search-summary") {
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
      } else if (request.params.name === "bilibili-user-info") {
        if (!request.params.arguments?.uid) {
          throw new McpError(ErrorCode.InvalidParams, "缺少必需的uid参数");
        }

        const uid = request.params.arguments.uid as string;
        
        try {
          const result = await getUserInfo(uid);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `获取UP主信息错误: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === "bilibili-user-stat") {
        if (!request.params.arguments?.uid) {
          throw new McpError(ErrorCode.InvalidParams, "缺少必需的uid参数");
        }

        const uid = request.params.arguments.uid as string;
        
        try {
          const result = await getUserStat(uid);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `获取UP主统计信息错误: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === "bilibili-user-videos") {
        if (!request.params.arguments?.uid) {
          throw new McpError(ErrorCode.InvalidParams, "缺少必需的uid参数");
        }

        const uid = request.params.arguments.uid as string;
        const page = (request.params.arguments.page as number) || 1;
        const pageSize = (request.params.arguments.pageSize as number) || 20;
        const order = (request.params.arguments.order as string) || "pubdate";
        
        try {
          const result = await getUserVideos(uid, page, pageSize, order);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `获取UP主视频列表错误: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === "bilibili-user-complete") {
        if (!request.params.arguments?.uid) {
          throw new McpError(ErrorCode.InvalidParams, "缺少必需的uid参数");
        }

        const uid = request.params.arguments.uid as string;
        
        try {
          const result = await getCompleteUserInfo(uid);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `获取UP主完整信息错误: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === "bilibili-hot") {
        const hotType = (request.params.arguments?.type as string) || "all";
        
        try {
          const results = await this.getHotContent(hotType);
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
                text: `获取热门内容错误: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      } else if (request.params.name === "bilibili-video-detail") {
        if (!request.params.arguments?.videoId) {
          throw new McpError(ErrorCode.InvalidParams, "缺少必需的videoId参数");
        }

        const videoId = request.params.arguments.videoId as string;
        
        // 验证视频ID格式（支持BV号和AV号）
        const isBV = /^BV[a-zA-Z0-9]{10}$/.test(videoId);
        const isAV = /^av\d+$/.test(videoId) || /^\d+$/.test(videoId);
        
        if (!isBV && !isAV) {
          throw new McpError(ErrorCode.InvalidParams, "无效的视频ID格式，请提供BV号（如：BV1xx411c7mD）或AV号（如：av123456或123456）");
        }

        try {
          const result = await this.getVideoDetail(videoId);
          if (!result) {
            return {
              content: [
                {
                  type: "text",
                  text: `视频详情获取失败: 未找到视频ID ${videoId} 的相关信息`,
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error(`获取视频详情时发生错误:`, error);
          return {
            content: [
              {
                type: "text",
                text: `获取视频详情错误: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
            isError: true,
          };
        }
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `未知工具: ${request.params.name}`
        );
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

  private async getHotContent(type: any = 'all'): Promise<BilibiliSearchResult[]> {
    try {
      const hotResults = await getHotContent(type);
      // 处理热门视频项目
      const results: BilibiliSearchResult[] = hotResults.map((video: any) => ({
        title: this.cleanTitle(video.title),
        author: video.owner?.name || video.author || "",
        play_count: parseInt(video.stat?.view || video.play) || 0,
        duration: this.formatDuration(video.duration),
        publish_date: this.formatDate(video.pubdate || video.ctime),
        url: video.short_link_v2 || `https://www.bilibili.com/video/${video.bvid}`,
        bvid: video.bvid || "",
        upic: video.owner?.face || video.upic || "",
        pic: video.pic || "",
        tag: video.tname || video.tag || "",
        description: video.desc || video.description || "",
      }));

      return results;
    } catch (error) {
      console.error("获取B站热门内容时出错:", error);
      throw new Error(`获取B站热门内容失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private formatDuration(duration: any): string {
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'number') {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return "";
  }

  private formatDate(timestamp: number): string {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toISOString().split("T")[0];
  }

  private async getVideoDetail(videoId: string): Promise<any> {
    try {
      const videoDetail = await getVideoDetail(videoId);
      
      // 格式化返回结果
      return {
        bvid: videoDetail.bvid,
        aid: videoDetail.aid,
        title: videoDetail.title,
        description: videoDetail.desc,
        pic: videoDetail.pic,
        duration: this.formatDuration(videoDetail.duration),
        publish_date: this.formatDate(videoDetail.pubdate),
        create_time: this.formatDate(videoDetail.ctime),
        videos: videoDetail.videos,
        tid: videoDetail.tid,
        tname: videoDetail.tname,
        copyright: videoDetail.copyright === 1 ? "原创" : "转载",
        owner: {
          mid: videoDetail.owner.mid,
          name: videoDetail.owner.name,
          face: videoDetail.owner.face
        },
        stat: {
          view: videoDetail.stat.view,
          danmaku: videoDetail.stat.danmaku,
          reply: videoDetail.stat.reply,
          favorite: videoDetail.stat.favorite,
          coin: videoDetail.stat.coin,
          share: videoDetail.stat.share,
          like: videoDetail.stat.like,
          now_rank: videoDetail.stat.now_rank,
          his_rank: videoDetail.stat.his_rank
        },
        pages: videoDetail.pages.map((page: any) => ({
          cid: page.cid,
          page: page.page,
          part: page.part,
          duration: this.formatDuration(page.duration)
        }))
      };
    } catch (error) {
      console.error("获取B站视频详情时出错:", error);
      throw new Error(`获取B站视频详情失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async run() {
    if ((process.env.TRANSPORT || undefined) == "remote") {
      const app = express();
      app.use(express.json());

      app.post('/mcp', async (req, res) => {
          // Create a new transport for each request to prevent request ID collisions
          const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: undefined,
              enableJsonResponse: true
          });

          res.on('close', () => {
              transport.close();
          });

          await this.server.connect(transport);
          await transport.handleRequest(req, res, req.body);
      });
      const port = parseInt(process.env.PORT || '3000');
      app.listen(port, () => {
          console.log(`Bilibili Search MCP Server running on http://localhost:${port}/mcp`);
      }).on('error', error => {
          console.error('Server error:', error);
          process.exit(1);
      })
    } else {
        let transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Bilibili Search MCP server running on stdio");
    }
  }
}

    const server = new BilibiliSearchServer();
    server.run().catch(console.error);

