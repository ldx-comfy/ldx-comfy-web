// src/api/workflows.test.ts
import { getWorkflowList, getWorkflowParams } from './workflows';

// 測試獲取工作流列表
async function testGetWorkflowList() {
  try {
    console.log('正在獲取工作流列表...');
    const workflows = await getWorkflowList();
    console.log('工作流列表:', workflows);
  } catch (error) {
    console.error('獲取工作流列表時出錯:', error);
  }
}

// 測試獲取工作流參數
async function testGetWorkflowParams() {
  try {
    // 使用一個示例工作流 ID
    const wfId = 'example-wf-id';
    console.log(`正在獲取工作流 ${wfId} 的參數...`);
    const params = await getWorkflowParams(wfId);
    console.log(`工作流 ${wfId} 的參數:`, params);
  } catch (error) {
    console.error('獲取工作流參數時出錯:', error);
  }
}

// 執行測試
async function runTests() {
  await testGetWorkflowList();
  await testGetWorkflowParams();
}

// 如果直接運行此文件，則執行測試
if (typeof window === 'undefined') {
  // 在 Node.js 環境中運行
  runTests();
}

export { testGetWorkflowList, testGetWorkflowParams, runTests };