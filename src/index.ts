import axios from "axios";
import { CookieJar } from "tough-cookie";
// import * as fs from "fs";
// import * as path from "path";

// API 常量
const HOME_URL = "https://www.bilibili.com";
const API_WEB = "https://api.bilibili.com/x/web-interface";
const API_X = "https://api.bilibili.com/x";

// 默认参数常量
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE_NUM = 1;

// 请求头常量
const BW_HEADERS = {
  Accept: "*/*",
  Connection: "keep-alive",
  "Accept-Encoding": "gzip, deflate, br",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
  Referer: HOME_URL,
};

// 工具函数
function fixUrl(url: string): string {
  if (url.startsWith("//")) {
    return "https:" + url;
  } else {
    return url.replace(/^http:\/\//, "https://");
  }
}

/**
 * 处理视频项目的图片URL
 * @param item 视频项目对象
 */
function processVideoItem(item: any): void {
  console.log(item);
  item.pic = fixUrl(item.pic);
  if (item.owner && item.owner.face) {
    item.owner.face = fixUrl(item.owner.face);
  }
  // 处理搜索结果中的arcurl
  if (item.arcurl) {
    item.arcurl = fixUrl(item.arcurl);
  }
}

/**
 * 获取 Bilibili cookies
 * @returns Promise<{jar: CookieJar, client: AxiosInstance, cookieString: string}>
 */
async function getBilibiliCookies() {
  const jar = new CookieJar();
  const client = axios.create();

  try {
    const biliResponse = await client.get(HOME_URL, {
      headers: BW_HEADERS,
    });
    
    if (biliResponse.status === 200 && biliResponse.headers["set-cookie"]) {
      const setCookies = biliResponse.headers["set-cookie"];
      for (const cookieStr of setCookies) {
        await jar.setCookieSync(cookieStr, HOME_URL);
      }
    }
  } catch (error) {
    console.error("访问B站失败:", error);
  }

  const cookieString = await jar.getCookieString(HOME_URL);
  return { jar, client, cookieString };
}

export async function searchBilibili(
  keyword: string,
  page: number = DEFAULT_PAGE_NUM,
  limit: number = DEFAULT_PAGE_SIZE,
  order: string = "totalrank"
) {
  // 获取 cookies 和 client
  const { client, cookieString } = await getBilibiliCookies();

  // 使用获取的 cookies 访问搜索 API
  const encodeStr = encodeURIComponent(keyword);
  const searchUrl = `${API_WEB}/search/all/v2?keyword=${encodeStr}&page=${page}&order=${order}`;

  // 发送搜索请求
  const response = await client.get(searchUrl, {
    headers: {
      ...BW_HEADERS,
      Cookie: cookieString,
      Referer: `https://search.bilibili.com/all?keyword=${encodeStr}`,
    },
  });

  // 处理返回结果
  if (response?.data?.code == 0) {
    const res = response.data.data.result.find((item: any) => item.result_type === "video")
    ?.data || []
    res.forEach(processVideoItem);
    return res;
  } else {
    console.log("搜索失败:", response?.data);
    return []; 
  }
}

// 热门内容：all(综合热门), history(入站必刷),rank/all(排行榜),music(全站音乐榜)
// 获取热门内容的通用函数
export async function getHotContent(
  type: "all" | "history" | "rank" | "music" = "all"
) {
  // 获取 cookies 和 client
  const { client, cookieString } = await getBilibiliCookies();

  // 根据类型选择不同的API和参数
  let hotUrl: string;
  let referer: string;
  
  if (type === "all") {
    // 综合热门内容
    hotUrl = `${API_WEB}/popular?ps=${DEFAULT_PAGE_SIZE}&pn=${DEFAULT_PAGE_NUM}`;
    referer = "https://www.bilibili.com/v/popular/all/";
  } else if (type === "history") {
    // 入站必刷内容
    hotUrl = `${API_WEB}/popular/precious?page_size=${DEFAULT_PAGE_SIZE}&page_num=${DEFAULT_PAGE_NUM}`
    referer = "https://www.bilibili.com/v/popular/history/";
  } else if (type === "rank") {
    // 排行榜内容
    hotUrl = `${API_WEB}/ranking/v2?rid=0&type=all`;
    referer = "https://www.bilibili.com/v/popular/rank/all";
  } else if (type === "music") {
    // 全站音乐榜内容 - 使用ranking/v2端点替代失效的copyright-music-publicity
    hotUrl = `${API_WEB}/ranking/v2?rid=3&type=all`;
    referer = "https://www.bilibili.com/v/popular/music/";
  } else {
    throw new Error(`不支持的热门内容类型: ${type}`);
  }
  
  // 发送请求
  const response = await client.get(hotUrl, {
    headers: {
      ...BW_HEADERS,
      Cookie: cookieString,
      Referer: referer,
    },
  });

  if (response?.data?.code == 0) {
    const res = response.data.data.list || [];
    res.forEach(processVideoItem);
    return res;
  } else {
    console.log(`获取热门内容失败:`, response?.data);
    return [];
  }
}

/**
 * 获取视频详情信息
 * @param videoId 视频ID，支持BV号或AV号
 * @returns Promise<VideoDetail>
 */
export async function getVideoDetail(videoId: string) {
  // 获取 cookies 和 client
  const { client, cookieString } = await getBilibiliCookies();

  // 判断是BV号还是AV号，构建相应的API URL
  let videoUrl: string;
  let refererUrl: string;
  
  if (videoId.startsWith('BV')) {
    // BV号
    videoUrl = `${API_WEB}/view?bvid=${videoId}`;
    refererUrl = `https://www.bilibili.com/video/${videoId}`;
  } else if (videoId.startsWith('av') || /^\d+$/.test(videoId)) {
    // AV号（支持av123456或纯数字123456格式）
    const aid = videoId.startsWith('av') ? videoId.substring(2) : videoId;
    videoUrl = `${API_WEB}/view?aid=${aid}`;
    refererUrl = `https://www.bilibili.com/video/av${aid}`;
  } else {
    throw new Error(`不支持的视频ID格式: ${videoId}`);
  }

  try {
    // 发送请求获取视频详情
    const response = await client.get(videoUrl, {
      headers: {
        ...BW_HEADERS,
        Cookie: cookieString,
        Referer: refererUrl,
      },
    });

    if (response?.data?.code === 0) {
      const data = response.data.data;
      
      // 处理图片URL
      data.pic = fixUrl(data.pic);
      if (data.owner && data.owner.face) {
        data.owner.face = fixUrl(data.owner.face);
      }

      // 返回整理后的视频详情信息
      return {
        bvid: data.bvid,
        aid: data.aid,
        title: data.title,
        desc: data.desc,
        pic: data.pic,
        duration: data.duration,
        pubdate: data.pubdate,
        ctime: data.ctime,
        videos: data.videos,
        tid: data.tid,
        tname: data.tname,
        copyright: data.copyright,
        owner: {
          mid: data.owner.mid,
          name: data.owner.name,
          face: data.owner.face
        },
        stat: {
          aid: data.stat.aid,
          view: data.stat.view,
          danmaku: data.stat.danmaku,
          reply: data.stat.reply,
          favorite: data.stat.favorite,
          coin: data.stat.coin,
          share: data.stat.share,
          like: data.stat.like,
          now_rank: data.stat.now_rank,
          his_rank: data.stat.his_rank
        },
        pages: data.pages || []
      };
    } else {
      console.log("获取视频详情失败:", response?.data);
      throw new Error(`获取视频详情失败: ${response?.data?.message || '未知错误'}`);
    }
  } catch (error) {
    console.error("获取视频详情出错:", error);
    throw error;
  }
}
