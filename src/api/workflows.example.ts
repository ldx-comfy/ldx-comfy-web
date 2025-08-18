// src/api/workflows.example.ts
import { getWorkflowList, getWorkflowParams } from './workflows';

// 示例：獲取並顯示所有工作流
async function displayWorkflows() {
  try {
    const workflowList = await getWorkflowList();
    console.log('可用的工作流:');
    workflowList.forEach((workflow, index) => {
      console.log(`${index + 1}. ${workflow}`);
    });
    
    // 如果有工作流，獲取第一個工作流的參數
    if (workflowList.length > 0) {
      const firstWorkflowId = workflowList[0];
      await displayWorkflowParams(firstWorkflowId);
    }
  } catch (error) {
    console.error('獲取工作流列表時出錯:', error);
  }
}

// 示例：獲取並顯示特定工作流的參數
async function displayWorkflowParams(wfId: string) {
  try {
    const params = await getWorkflowParams(wfId);
    console.log(`\n工作流 "${wfId}" 的參數:`);
    params.forEach((param, index) => {
      console.log(`${index + 1}. 節點ID: ${param.node_id}`);
      console.log(`   標題: ${param.title}`);
      console.log(`   類型: ${param.class_type}`);
    });
  } catch (error) {
    console.error(`獲取工作流 "${wfId}" 的參數時出錯:`, error);
  }
}

// 執行示例
displayWorkflows();

export { displayWorkflows, displayWorkflowParams };