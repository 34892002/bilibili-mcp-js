import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";
import { searchBilibili } from "../src/index.ts";

test("search returns no more than the requested limit using synthetic responses", async (t) => {
  const originalCreate = axios.create;
  const originalLog = console.log;
  const videos = [
    { bvid: "BV-synthetic-1", title: "one", pic: "//img.invalid/1" },
    { bvid: "BV-synthetic-2", title: "two", pic: "//img.invalid/2" },
    { bvid: "BV-synthetic-3", title: "three", pic: "//img.invalid/3" },
  ];
  const requestedUrls = [];

  axios.create = () => ({
    get: async (url) => {
      requestedUrls.push(url);
      if (url === "https://www.bilibili.com") {
        return { status: 200, headers: {} };
      }
      return {
        status: 200,
        data: {
          code: 0,
          data: { result: [{ result_type: "video", data: videos }] },
        },
      };
    },
  });
  console.log = () => {};
  t.after(() => {
    axios.create = originalCreate;
    console.log = originalLog;
  });

  const results = await searchBilibili("synthetic query", 1, 1);

  assert.equal(requestedUrls.length, 2);
  assert.equal(results.length, 1);
  assert.equal(results[0].bvid, "BV-synthetic-1");
});
