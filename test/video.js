import { getVideoDetail } from '../dist/src/index.js';

// 测试用的BV号列表
const testBvids = [
  'BV1xQWizoE6k', // 示例BV号1
  'av115388826263447', // 示例BV号2
];

async function testVideoDetail() {
  console.log('开始测试视频详情功能...\n');
  
  for (let i = 0; i < testBvids.length; i++) {
    const bvid = testBvids[i];
    console.log(`测试 ${i + 1}: ${bvid}`);
    
    try {
      const result = await getVideoDetail(bvid);
      
      console.log('✅ 成功获取视频详情:');
      console.log(`  标题: ${result.title}`);
      console.log(`  作者: ${result.owner.name}`);
      console.log(`  播放量: ${result.stat.view}`);
      console.log(`  点赞数: ${result.stat.like}`);
      console.log(`  收藏数: ${result.stat.favorite}`);
      console.log(`  评论数: ${result.stat.reply}`);
      console.log(`  弹幕数: ${result.stat.danmaku}`);
      console.log(`  投币数: ${result.stat.coin}`);
      console.log(`  分享数: ${result.stat.share}`);
      console.log(`  分P数: ${result.videos}`);
      console.log(`  时长: ${result.duration}秒`);
      console.log(`  分区: ${result.tname}`);
      console.log(`  版权: ${result.copyright === 1 ? '原创' : '转载'}`);
      console.log(`  简介: ${result.desc.substring(0, 100)}${result.desc.length > 100 ? '...' : ''}`);
      
      if (result.pages && result.pages.length > 1) {
        console.log(`  分P信息:`);
        result.pages.forEach((page, index) => {
          console.log(`    P${page.page}: ${page.part} (${page.duration}秒)`);
        });
      }
      
    } catch (error) {
      console.log(`❌ 获取视频详情失败: ${error.message}`);
    }
    
    console.log('---\n');
    
    // 添加延迟避免请求过快
    if (i < testBvids.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('视频详情测试完成!');
}

// 运行测试
testVideoDetail().catch(error => {
  console.error('测试过程中出现错误:', error);
  process.exit(1);
});