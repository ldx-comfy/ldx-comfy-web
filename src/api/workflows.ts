// src/api/workflows.ts (refactored to unified API client with env + SSR cookie passthrough)
import { apiGet, apiPost, apiFetch, type ApiContext } from '../lib/api/client';

// Types
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

// Helpers
function ensureOk(resp: Response): Response {
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
  }
  return resp;
}

// 獲取所有工作流列表
export async function getWorkflowList(ctx?: ApiContext): Promise<WorkflowListResponse> {
  return apiGet<WorkflowListResponse>('/forms/workflows', ctx);
}

// 獲取工作流表單模式
export async function getWorkflowFormSchema(workflowId: string, ctx?: ApiContext): Promise<WorkflowFormSchemaResponse> {
  const resp = await apiFetch(`/forms/workflows/${workflowId}/form-schema`, {
    method: 'GET',
    ctx,
    rawResponse: true,
  }) as unknown as Response;

  if (!resp.ok) {
    if (resp.status === 422) {
      let body: HTTPValidationError | undefined;
      try { body = await resp.json(); } catch {}
      throw new Error(`驗證錯誤: ${JSON.stringify(body?.detail ?? [])}`);
    }
    let bodyText = '';
    try { bodyText = await resp.text(); } catch {}
    console.error('[getWorkflowFormSchema] Failed. HTTP %s %s. Body: %s', resp.status, resp.statusText, String(bodyText).slice(0, 2000));
    throw new Error(`獲取工作流表單模式失敗: ${resp.status} ${resp.statusText}`);
  }

  const schema = await resp.json();
  try {
    const fieldCount = Array.isArray((schema as any)?.fields) ? (schema as any).fields.length : 'n/a';
    const keys = Object.keys(schema || {}).slice(0, 20).join(',');
    console.debug('[getWorkflowFormSchema] workflowId=%s fields=%s keys=%s', workflowId, fieldCount, keys);
  } catch {}
  return schema;
}

// 通過表單執行工作流
export async function executeWorkflowWithForm(workflowId: string, nodes: string, ctx?: ApiContext): Promise<WorkflowExecutionResponse> {
  const formData = new FormData();
  formData.append('nodes', nodes);

  try {
    console.debug('[executeWorkflowWithForm] workflowId=%s typeof nodes=%s length=%d', workflowId, typeof nodes, nodes?.length ?? 0);
    // @ts-ignore
    if (typeof (formData as any).entries === 'function') {
      // @ts-ignore
      for (const [key, value] of (formData as any).entries()) {
        const isBlob = typeof Blob !== 'undefined' && value instanceof Blob;
        const summary = isBlob ? `Blob(${(value as Blob).type}, ${(value as Blob).size} bytes)` : String(value).slice(0, 200);
        console.debug('[executeWorkflowWithForm] formData entry:', key, isBlob ? 'Blob' : typeof value, summary);
      }
    }
  } catch (e) {
    console.debug('[executeWorkflowWithForm] debug logging failed:', e);
  }

  const resp = await apiFetch(`/forms/workflows/${workflowId}/execute`, {
    method: 'POST',
    body: formData,
    ctx,
    rawResponse: true,
  }) as unknown as Response;

  if (!resp.ok) {
    if (resp.status === 422) {
      let body: HTTPValidationError | undefined;
      try { body = await resp.json(); } catch {}
      throw new Error(`驗證錯誤: ${JSON.stringify(body?.detail ?? [])}`);
    }
    let bodyText = '';
    try { bodyText = await resp.text(); } catch {}
    console.error('[executeWorkflowWithForm] HTTP %s %s. Body: %s', resp.status, resp.statusText, String(bodyText).slice(0, 2000));
    throw new Error(`執行工作流失敗: ${resp.status} ${resp.statusText} Body: ${String(bodyText).slice(0, 500)}`);
  }

  return resp.json();
}

// 獲取執行狀態
export async function getExecutionStatus(executionId: string, ctx?: ApiContext): Promise<ExecutionStatusResponse> {
  return apiGet<ExecutionStatusResponse>(`/forms/executions/${executionId}/status`, ctx);
}

// 取消執行
export async function cancelExecution(executionId: string, ctx?: ApiContext): Promise<void> {
  await apiFetch(`/forms/executions/${executionId}`, { method: 'DELETE', ctx });
  return;
}

// 獲取系統整體健康狀態
export async function getSystemHealth(ctx?: ApiContext): Promise<HealthStatusResponse> {
  return apiGet<HealthStatusResponse>('/health/', ctx);
}

// 獲取 ComfyUI 後端健康狀態
export async function getComfyUIHealth(ctx?: ApiContext): Promise<ComfyUIStatusResponse> {
  return apiGet<ComfyUIStatusResponse>('/health/comfyui', ctx);
}

// 獲取可用工作流列表（别名）
export async function getAvailableWorkflows(ctx?: ApiContext): Promise<AvailableWorkflowsResponse> {
  return getWorkflowList(ctx);
}

// 獲取指定工作流的參數列表
export async function getWorkflowParams(wfId: string, ctx?: ApiContext): Promise<WorkflowParamsResponse> {
  const formSchema = await getWorkflowFormSchema(wfId, ctx);
  const params: WorkflowParam[] = (formSchema.fields || []).map((field: any) => ({
    node_id: field.node_id,
    title: field.title,
    class_type: field.class_type
  }));
  return params;
}