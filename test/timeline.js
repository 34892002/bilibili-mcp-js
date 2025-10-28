import { getBangumiTimeline } from '../dist/src/index.js';

// 简单测试番剧时间表功能
async function testBangumiTimeline() {
  console.log('🎬 测试B站番剧时间表功能...\n');

  try {
    console.log('📅 获取默认参数的番剧时间表（前后6天）...');
    const result = await getBangumiTimeline();
    
    if (result.success) {
      const data = result.data;
      
      console.log(`✅ 成功获取 ${data.length} 天的番剧时间表`);
      
      // 显示每天的番剧数量
      let totalAnime = 0;
      data.forEach((dayData, index) => {
        const animeCount = dayData.episodes ? dayData.episodes.length : 0;
        totalAnime += animeCount;
        if (animeCount > 0) {
          // 修复周几显示逻辑：day_of_week 1-7 对应周一到周日
          let dayName;
          if (dayData.day_of_week >= 1 && dayData.day_of_week <= 7) {
            const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            dayName = dayNames[dayData.day_of_week - 1];
          } else {
            dayName = `周${dayData.day_of_week}`;
          }
          console.log(`   ${dayData.date}: ${animeCount} 部番剧 (${dayName})`);
        }
      });
      
      console.log(`🎯 总计: ${totalAnime} 部番剧`);
      
      // 显示今天的番剧详情（如果有的话）
      const todayData = data.find(day => day.is_today === 1);
      if (todayData && todayData.episodes && todayData.episodes.length > 0) {
        console.log(`\n📺 今天 (${todayData.date}) 的番剧:`);
        todayData.episodes.forEach((anime, index) => {
          console.log(`   ${index + 1}. ${anime.title} - ${anime.pub_index} (${anime.pub_time})`);
        });
      }
      
      // 显示明天的番剧详情（如果有的话）
      const tomorrowIndex = data.findIndex(day => day.is_today === 1) + 1;
      if (tomorrowIndex < data.length && data[tomorrowIndex].episodes && data[tomorrowIndex].episodes.length > 0) {
        const tomorrowData = data[tomorrowIndex];
        console.log(`\n🌅 明天 (${tomorrowData.date}) 的番剧:`);
        tomorrowData.episodes.forEach((anime, index) => {
          console.log(`   ${index + 1}. ${anime.title} - ${anime.pub_index} (${anime.pub_time})`);
        });
      }
      
    } else {
      console.log('❌ 获取失败:', result.error || '未知错误');
    }
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
    console.log('详细错误:', error);
  }
}

// 运行测试
testBangumiTimeline().catch(console.error);