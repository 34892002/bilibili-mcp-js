// 测试UP主信息查询功能
import { getCompleteUserInfo } from '../dist/src/index.js';

async function testUserFunctions() {
  const testUID = '122879'; // B站官方账号
  
  console.log('=== 测试UP主信息查询功能 ===\n');
  
  try {
    // 测试获取UP主完整信息
    console.log('测试获取UP主完整信息...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒避免请求过于频繁
    const completeInfo = await getCompleteUserInfo(testUID);
    console.log('UP主完整信息:', {
      基本信息: {
        mid: completeInfo.mid,
        name: completeInfo.name,
        level: completeInfo.level
      },
      统计信息: completeInfo.stat
    });
    console.log('获取UP主完整信息成功\n');
    console.log('UP主信息查询功能测试通过！');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testUserFunctions();