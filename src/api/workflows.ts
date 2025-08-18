// src/api/workflows.ts
interface WorkflowParam {
  node_id: string;
  title: string;
  class_type: string;
}

interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

interface HTTPValidationError {
  detail: ValidationError[];
}

// API 響應類型
type WorkflowListResponse = string[];
type WorkflowParamsResponse = WorkflowParam[];

// 基礎 API 配置
const API_BASE_URL = '/api/v1';

// 獲取所有工作流列表
export async function getWorkflowList(): Promise<WorkflowListResponse> {
  const response = await fetch(`${API_BASE_URL}/workflows/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`獲取工作流列表失敗: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 獲取指定工作流的參數列表
export async function getWorkflowParams(wfId: string): Promise<WorkflowParamsResponse> {
  const response = await fetch(`${API_BASE_URL}/workflows/wf/${wfId}/params`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    // 處理驗證錯誤
    if (response.status === 422) {
      const error: HTTPValidationError = await response.json();
      throw new Error(`驗證錯誤: ${JSON.stringify(error.detail)}`);
    }
    throw new Error(`獲取工作流參數失敗: ${response.status} ${response.statusText}`);
  }

  return response.json();
}