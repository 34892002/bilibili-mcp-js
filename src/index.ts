import axios from "axios";
import { CookieJar } from "tough-cookie";
// import * as fs from "fs";
// import * as path from "path";

const HOME_URL = "https://www.bilibili.com";
const BW_HEADERS = {
  Accept: "*/*",
  Connection: "keep-alive",
  "Accept-Encoding": "gzip, deflate, br",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0",
  Referer: HOME_URL,
};

export async function searchBilibili(
  keyword: string,
  page: number = 1,
  limit: number = 20,
  order: string = "totalrank"
) {
  // 创建 cookie jar
  const jar = new CookieJar();
  const client = axios.create();

  // 第一步：访问 bilibili.com 获取 cookies
  // console.log会返回到客户端,所以屏蔽
  // console.log("正在获取 Bilibili cookies...");
  try {
    const biliResponse = await client.get(HOME_URL, {
      headers: BW_HEADERS,
    });
    if (biliResponse.status === 200) {
      if (biliResponse.headers["set-cookie"]) {
        const setCookies = biliResponse.headers["set-cookie"];
        for (const cookieStr of setCookies) {
          await jar.setCookieSync(cookieStr, HOME_URL);
        }
      }
    }
  } catch (error) {
    console.error("访问B站失败:", error);
  }

  // 第二步：使用获取的 cookies 访问搜索 API
  // console.log(`正在搜索关键词: ${keyword}`);
  const encodeStr = encodeURIComponent(keyword);
  // 使用正确的搜索 API URL，添加更多必要参数
  const searchUrl = `https://api.bilibili.com/x/web-interface/search/all/v2?keyword=${encodeStr}&page=${page}&order=${order}`;

  // 获取将要发送的 cookies
  const cookiesForRequest = await jar.getCookieString(HOME_URL);
  // console.log("搜索使用的 cookies:", cookiesForRequest);

  // 手动将 cookies 添加到请求头
  const response = await client.get(searchUrl, {
    headers: {
      ...BW_HEADERS,
      Cookie: cookiesForRequest, // 手动设置 Cookie 头
      Referer: `https://search.bilibili.com/all?keyword=${encodeStr}`, // 必须设置正确的 Referer
    },
  });

  // 打印返回的数据
  // console.log("接口 Code:", response?.data?.code);
  if (response?.data?.code == 0) {
    const res = response.data.data.result.find((item: any) => item.result_type === "video")
    ?.data || []
    res.forEach((item: any) => {
      console.log(item);
      item.arcurl = fixUrl(item.arcurl);
      item.pic = fixUrl(item.pic);
    });
    return res;
  } else {
    console.log("搜索失败:", response?.data);
    return []; 
  }
}

function fixUrl(url: string): string {
  if (url.startsWith("//")) {
    return "https:" + url;
  } else {
    return url.replace(/^http:\/\//, "https://");
  }
}

// 获取热门内容
export async function getHotContent(
  rid: number = 0, // 分区ID，0为全站
  type: string = "all", // 类型：all, origin, rookie
  day: number = 3 // 时间范围：1, 3, 7, 30
) {
  // 创建 cookie jar
  const jar = new CookieJar();
  const client = axios.create();

  // 第一步：访问 bilibili.com 获取 cookies
  try {
    const biliResponse = await client.get(HOME_URL, {
      headers: BW_HEADERS,
    });
    if (biliResponse.status === 200) {
      if (biliResponse.headers["set-cookie"]) {
        const setCookies = biliResponse.headers["set-cookie"];
        for (const cookieStr of setCookies) {
          await jar.setCookieSync(cookieStr, HOME_URL);
        }
      }
    }
  } catch (error) {
    console.error("访问B站失败:", error);
  }

  // 第二步：使用获取的 cookies 访问热门内容 API
  const hotUrl = `https://api.bilibili.com/x/web-interface/popular?ps=20&pn=1`;
  
  // 获取将要发送的 cookies
  const cookiesForRequest = await jar.getCookieString(HOME_URL);

  // 手动将 cookies 添加到请求头
  const response = await client.get(hotUrl, {
    headers: {
      ...BW_HEADERS,
      Cookie: cookiesForRequest,
      Referer: "https://www.bilibili.com/v/popular/all/",
    },
  });

  if (response?.data?.code == 0) {
    const res = response.data.data.list || [];
    res.forEach((item: any) => {
      console.log(item);
      item.pic = fixUrl(item.pic);
      if (item.owner && item.owner.face) {
        item.owner.face = fixUrl(item.owner.face);
      }
    });
    return res;
  } else {
    console.log("获取热门内容失败:", response?.data);
    return [];
  }
}

// 获取分区热门内容
export async function getRegionHot(
  rid: number, // 分区ID
  day: number = 7 // 时间范围：1, 3, 7, 30
) {
  // 创建 cookie jar
  const jar = new CookieJar();
  const client = axios.create();

  // 第一步：访问 bilibili.com 获取 cookies
  try {
    const biliResponse = await client.get(HOME_URL, {
      headers: BW_HEADERS,
    });
    if (biliResponse.status === 200) {
      if (biliResponse.headers["set-cookie"]) {
        const setCookies = biliResponse.headers["set-cookie"];
        for (const cookieStr of setCookies) {
          await jar.setCookieSync(cookieStr, HOME_URL);
        }
      }
    }
  } catch (error) {
    console.error("访问B站失败:", error);
  }

  // 第二步：使用获取的 cookies 访问分区热门 API
  const regionUrl = `https://api.bilibili.com/x/web-interface/popular/precious?page_size=20&page_num=1`;
  
  // 获取将要发送的 cookies
  const cookiesForRequest = await jar.getCookieString(HOME_URL);

  // 手动将 cookies 添加到请求头
  const response = await client.get(regionUrl, {
    headers: {
      ...BW_HEADERS,
      Cookie: cookiesForRequest,
      Referer: "https://www.bilibili.com/v/popular/precious/",
    },
  });

  if (response?.data?.code == 0) {
    const res = response.data.data.list || [];
    res.forEach((item: any) => {
      console.log(item);
      item.pic = fixUrl(item.pic);
      if (item.owner && item.owner.face) {
        item.owner.face = fixUrl(item.owner.face);
      }
    });
    return res;
  } else {
    console.log("获取分区热门内容失败:", response?.data);
    return [];
  }
}

// 测试
// // 执行搜索
// const res = await searchBilibili("一栗小莎子").catch((err) => {
//   console.log("程序执行出错:", err?.response?.data || err);
// });

// // 将结果保存到文件
// const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
// const filename = `bilibili_search_${timestamp}.json`;
// fs.writeFileSync(
//   path.join(__dirname, filename),
//   JSON.stringify(res, null, 2),
//   "utf8"
// );
// console.log(`搜索结果已保存到文件: ${filename}`);
