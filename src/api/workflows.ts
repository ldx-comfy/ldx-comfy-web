// src/api/workflows.ts
export interface WorkflowParam {
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

// 新增的接口定義
interface ComfyUIStatus {
  status: string;
  response_time_ms?: number;
  error?: string;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  services: Record<string, any>;
  message?: string;
}

interface WorkflowExecutionResponse {
  execution_id: string;
  status: string;
  result?: Record<string, any> | null;
  error?: string | null;
}

// API 響應類型
type WorkflowListResponse = string[];
type WorkflowParamsResponse = WorkflowParam[];
type AvailableWorkflowsResponse = string[];
type WorkflowFormSchemaResponse = Record<string, any>;
type ExecutionStatusResponse = WorkflowExecutionResponse;
type HealthStatusResponse = HealthStatus;
type ComfyUIStatusResponse = ComfyUIStatus;

// 基礎 API 配置
const API_BASE_URL = 'http://127.0.0.1:1145/api/v1';

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

// 獲取工作流表單模式
export async function getWorkflowFormSchema(workflowId: string): Promise<WorkflowFormSchemaResponse> {
  const response = await fetch(`${API_BASE_URL}/forms/workflows/${workflowId}/form-schema`, {
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
    throw new Error(`獲取工作流表單模式失敗: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 通過表單執行工作流
export async function executeWorkflowWithForm(workflowId: string, nodes: string): Promise<WorkflowExecutionResponse> {
  const formData = new FormData();
  formData.append('nodes', nodes);

  const response = await fetch(`${API_BASE_URL}/forms/workflows/${workflowId}/execute`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    // 處理驗證錯誤
    if (response.status === 422) {
      const error: HTTPValidationError = await response.json();
      throw new Error(`驗證錯誤: ${JSON.stringify(error.detail)}`);
    }
    throw new Error(`執行工作流失敗: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 獲取執行狀態
export async function getExecutionStatus(executionId: string): Promise<ExecutionStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/forms/executions/${executionId}/status`, {
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
    throw new Error(`獲取執行狀態失敗: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 取消執行
export async function cancelExecution(executionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/forms/executions/${executionId}`, {
    method: 'DELETE',
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
    throw new Error(`取消執行失敗: ${response.status} ${response.statusText}`);
  }

  // DELETE 請求通常不需要返回內容
  return;
}

// 獲取系統整體健康狀態
export async function getSystemHealth(): Promise<HealthStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/health/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`獲取系統健康狀態失敗: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 獲取 ComfyUI 後端健康狀態
export async function getComfyUIHealth(): Promise<ComfyUIStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/health/comfyui`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`獲取 ComfyUI 健康狀態失敗: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 獲取可用工作流列表
export async function getAvailableWorkflows(): Promise<AvailableWorkflowsResponse> {
  const response = await fetch(`${API_BASE_URL}/forms/workflows`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`獲取可用工作流列表失敗: ${response.status} ${response.statusText}`);
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