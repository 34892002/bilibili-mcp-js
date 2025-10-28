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
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0";
const BW_HEADERS = {
  Accept: "*/*",
  Connection: "keep-alive",
  "Accept-Encoding": "gzip, deflate, br",
  "User-Agent": USER_AGENT,
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
async function getBilibiliCookies(url: string) {
  const jar = new CookieJar();
  const client = axios.create();

  try {
    const biliResponse = await client.get(url, {
      headers: {...BW_HEADERS, Referer: url},
    });
    
    if (biliResponse.status === 200 && biliResponse.headers["set-cookie"]) {
      const setCookies = biliResponse.headers["set-cookie"];
      for (const cookieStr of setCookies) {
        await jar.setCookieSync(cookieStr, url);
      }
    }
  } catch (error) {
    console.error("访问B站失败:", error);
  }

  const cookieString = await jar.getCookieString(url);
  return { jar, client, cookieString };
}

export async function searchBilibili(
  keyword: string,
  page: number = DEFAULT_PAGE_NUM,
  limit: number = DEFAULT_PAGE_SIZE,
  order: string = "totalrank"
) {
  // 获取 cookies 和 client
  const { client, cookieString } = await getBilibiliCookies(HOME_URL);

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
  const { client, cookieString } = await getBilibiliCookies(HOME_URL);

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

  // 获取 cookies 和 client
  const { client, cookieString } = await getBilibiliCookies(refererUrl);

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

/**
 * 获取UP主基本信息
 * @param uid UP主的UID
 * @returns Promise<UserInfo>
 */
export async function getUserInfo(uid: string | number) {
  const userUrl = `${API_X}/space/acc/info?mid=${uid}`;
  const refererUrl = `https://space.bilibili.com/${uid}`;

  try {
    // 获取 cookies 和 client
    const { client, cookieString } = await getBilibiliCookies(refererUrl);
    
    // 发送请求获取UP主基本信息，使用Cookie
    const response = await client.get(userUrl, {
      headers: {
        ...BW_HEADERS,
        Cookie: cookieString,
        Referer: refererUrl,
      },
    });

    if (response?.data?.code === 0) {
      const data = response.data.data;
      
      // 处理头像URL
      if (data.face) {
        data.face = fixUrl(data.face);
      }

      // 返回整理后的UP主基本信息
      return {
        mid: data.mid,
        name: data.name,
        sex: data.sex,
        face: data.face,
        sign: data.sign,
        rank: data.rank,
        level: data.level,
        jointime: data.jointime,
        moral: data.moral,
        silence: data.silence,
        coins: data.coins,
        fans_badge: data.fans_badge,
        official: data.official,
        vip: data.vip,
        pendant: data.pendant,
        nameplate: data.nameplate,
        user_honour_info: data.user_honour_info,
        is_followed: data.is_followed,
        top_photo: data.top_photo ? fixUrl(data.top_photo) : null,
        theme: data.theme,
        sys_notice: data.sys_notice,
        live_room: data.live_room,
        birthday: data.birthday,
        school: data.school,
        profession: data.profession,
        tags: data.tags,
        series: data.series
      };
    } else {
      console.log("获取UP主信息失败:", response?.data);
      throw new Error(`获取UP主信息失败: ${response?.data?.message || '未知错误'}`);
    }
  } catch (error) {
    console.error("获取UP主信息出错:", error);
    throw error;
  }
}

/**
 * 获取UP主统计信息（粉丝数、关注数等）
 * @param uid UP主的UID
 * @returns Promise<UserStat>
 */
export async function getUserStat(uid: string | number) {
  const statUrl = `${API_X}/relation/stat?vmid=${uid}`;
  const refererUrl = `https://space.bilibili.com/${uid}`;

  try {
    // 获取 cookies 和 client
    const { client, cookieString } = await getBilibiliCookies(refererUrl);
    
    // 发送请求获取UP主统计信息，使用Cookie
    const response = await client.get(statUrl, {
      headers: {
        ...BW_HEADERS,
        Cookie: cookieString,
        Referer: refererUrl,
      },
    });

    if (response?.data?.code === 0) {
      const data = response.data.data;
      
      return {
        mid: data.mid,
        following: data.following,  // 关注数
        whisper: data.whisper,     // 悄悄关注数
        black: data.black,         // 黑名单数
        follower: data.follower    // 粉丝数
      };
    } else {
      console.log("获取UP主统计信息失败:", response?.data);
      throw new Error(`获取UP主统计信息失败: ${response?.data?.message || '未知错误'}`);
    }
  } catch (error) {
    console.error("获取UP主统计信息出错:", error);
    throw error;
  }
}

/**
 * 获取UP主视频列表
 * @param uid UP主的UID
 * @param page 页码，默认为1
 * @param pageSize 每页数量，默认为20
 * @param order 排序方式：pubdate(发布时间)、click(播放量)、stow(收藏量)
 * @returns Promise<UserVideos>
 */
export async function getUserVideos(
  uid: string | number,
  page: number = 1,
  pageSize: number = 20,
  order: string = "pubdate"
) {
  throw new Error('风控校验严格，既然官方不让搞那就别搞了');
  // https://space.bilibili.com/122879/upload/video
  // https://api.bilibili.com/x/space/wbi/arc/search?pn=1&ps=40&tid=0&special_type=&order=pubdate&mid=122879&index=0&keyword=&order_avoided=true&platform=web
  const videosUrl = `${API_X}/space/wbi/arc/search?tid=0&special_type=&order=${order}&mid=${uid}&ps=${pageSize}&pn=${page}&index=0&keyword=&order_avoided=true&platform=web`;
  const refererUrl = `https://space.bilibili.com/${uid}/upload/video`;

  try {
    // 获取 cookies 和 client
    const { client, cookieString } = await getBilibiliCookies(refererUrl);
    
    // 发送请求获取UP主视频列表，使用Cookie
    const response = await client.get(videosUrl, {
      headers: {
        ...BW_HEADERS,
        Cookie: cookieString,
        Referer: refererUrl,
      },
    });

    if (response?.data?.code === 0) {
      const data = response.data.data;
      
      // 处理视频列表中的图片URL
      if (data.list && data.list.vlist) {
        data.list.vlist.forEach((video: any) => {
          if (video.pic) {
            video.pic = fixUrl(video.pic);
          }
        });
      }

      return {
        list: data.list,
        page: data.page,
        episodic_button: data.episodic_button
      };
    } else {
      console.log("获取UP主视频列表失败:", response?.data);
      throw new Error(`获取UP主视频列表失败: ${response?.data?.message || '未知错误'}`);
    }
  } catch (error) {
    console.error("获取UP主视频列表出错:", error);
    throw error;
  }
}

/**
 * 获取UP主完整信息（包含基本信息和统计信息）
 * @param uid UP主的UID
 * @returns Promise<CompleteUserInfo>
 */
export async function getCompleteUserInfo(uid: string | number) {
  try {
    const [userInfo, userStat] = await Promise.all([
      getUserInfo(uid),
      getUserStat(uid)
    ]);

    return {
      ...userInfo,
      stat: userStat
    };
  } catch (error) {
    console.error("获取UP主完整信息出错:", error);
    throw error;
  }
}

/**
 * 获取番剧时间表
 * @param types 内容类型，1表示番剧/动漫
 * @param before 获取当前时间之前多少天的播出信息
 * @param after 获取当前时间之后多少天的播出信息
 * @returns 番剧时间表数据
 */
export async function getBangumiTimeline(
  types: number = 1,
  before: number = 6,
  after: number = 6
) {
  try {
    const { client, cookieString } = await getBilibiliCookies(HOME_URL);

    const response = await client.get(
      `https://api.bilibili.com/pgc/web/timeline`,
      {
        params: {
          types,
          before,
          after,
        },
        headers: {
          ...BW_HEADERS,
          Cookie: cookieString,
        },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`API错误: ${response.data.message}`);
    }

    const timelineData = response.data.result;
    if (timelineData && Array.isArray(timelineData)) {
      timelineData.forEach((dayData: any) => {
        if (dayData.episodes && Array.isArray(dayData.episodes)) {
          dayData.episodes.forEach((item: any) => {
            if (item.ep_cover) {
              item.ep_cover = fixUrl(item.ep_cover);
            }
            if (item.square_cover) {
              item.square_cover = fixUrl(item.square_cover);
            }
            if (item.cover) {
              item.cover = fixUrl(item.cover);
            }
          });
        }
      });
    }

    return {
      success: true,
      data: timelineData,
      message: "获取番剧时间表成功",
    };
  } catch (error: any) {
    console.error("获取番剧时间表失败:", error);
    return {
      success: false,
      data: null,
      message: error.message || "获取番剧时间表失败",
    };
  }
}
