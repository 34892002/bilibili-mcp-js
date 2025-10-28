// 测试UP主视频列表查询功能
import { getUserVideos } from '../dist/src/index.js';

async function testGetUserVideos() {
  const testUID = '122879'; // B站官方账号
  
  console.log('=== 测试UP主视频列表查询功能 ===\n');
  console.log(`测试UID: ${testUID}\n`);
  
  try {
    // 只进行一次测试请求，避免风控
    console.log('测试获取UP主视频列表（默认参数）...');
    
    const videos = await getUserVideos(testUID);
    console.log(`获取视频列表成功，共 ${videos.list.vlist.length} 个视频`);
    console.log(`总视频数: ${videos.list.count}`);
    console.log('\n前5个视频:');
    videos.list.vlist.slice(0, 5).forEach((video, index) => {
      console.log(`  ${index + 1}. ${video.title}`);
      console.log(`     播放: ${video.play} | 弹幕: ${video.video_review} | 时长: ${Math.floor(video.length / 60)}:${(video.length % 60).toString().padStart(2, '0')}`);
      console.log(`     发布时间: ${new Date(video.created * 1000).toLocaleDateString()}`);
      console.log(`     链接: https://b23.tv/${video.bvid}\n`);
    });

    console.log('UP主视频列表查询功能测试完成！');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testGetUserVideos();