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
type UserWorkflowListResponse = string[];
type UserGenerationHistoryResponse = Record<string, any>[];
type AllUsersGenerationHistoryResponse = Record<string, any>[];


// 授权码管理相关类型定义
export interface CreateCodeData {
  name?: string;
  code?: string;
  expires_in_seconds?: number;
  roles?: string[];
  groups?: string[];
  permissions?: string[];
}

export interface CodeInfo {
  code: string;
  expires_at: string;
  roles: string[];
  groups: string[];
  permissions: string[];
}


// 身份组管理相关类型定义
export interface Group {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  level: number;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
}

export interface CreateGroupData {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  level: number;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  permissions?: string[];
  level?: number;
}

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

// 獲取當前用戶可用的工作流列表
export async function getUserWorkflows(ctx?: ApiContext): Promise<UserWorkflowListResponse> {
  return apiGet<UserWorkflowListResponse>('/forms/user/workflows', ctx);
}

// 獲取當前用戶的生成歷史記錄
export async function getUserGenerationHistory(ctx?: ApiContext): Promise<UserGenerationHistoryResponse> {
  return apiGet<UserGenerationHistoryResponse>('/forms/user/history', ctx);
}

// 獲取當前用戶特定執行ID的生成歷史記錄詳情
export async function getUserGenerationHistoryDetail(executionId: string, ctx?: ApiContext): Promise<Record<string, any>> {
  return apiGet<Record<string, any>>(`/forms/user/history/${executionId}`, ctx);
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

// 獲取所有用戶的生成歷史記錄（僅限管理員）
export async function getAllUsersGenerationHistory(ctx?: ApiContext): Promise<AllUsersGenerationHistoryResponse> {
  return apiGet<AllUsersGenerationHistoryResponse>('/forms/admin/history', ctx);
}

// 獲取任意用戶特定執行ID的生成歷史記錄詳情（僅限管理員）
export async function getAnyUserGenerationHistoryDetail(executionId: string, ctx?: ApiContext): Promise<Record<string, any>> {
  return apiGet<Record<string, any>>(`/forms/admin/history/${executionId}`, ctx);
}


// 上傳工作流文件
export async function uploadWorkflow(file: File, ctx?: ApiContext): Promise<{ message: string; workflow_id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await apiFetch('/forms/workflows/upload', {
    method: 'POST',
    body: formData,
    ctx,
    rawResponse: true,
  }) as unknown as Response;
  
  if (!response.ok) {
    let bodyText = '';
    try { bodyText = await response.text(); } catch {}
    console.error('[uploadWorkflow] HTTP %s %s. Body: %s', response.status, response.statusText, String(bodyText).slice(0, 2000));
    throw new Error(`上傳工作流文件失敗: ${response.status} ${response.statusText} Body: ${String(bodyText).slice(0, 500)}`);
  }
  
  return response.json();
}


// 刪除工作流文件
export async function deleteWorkflow(workflowId: string, ctx?: ApiContext): Promise<{ message: string }> {
  const response = await apiFetch(`/forms/workflows/${workflowId}`, {
    method: 'DELETE',
    ctx,
    rawResponse: true,
  }) as unknown as Response;

  if (!response.ok) {
    let bodyText = '';
    try { bodyText = await response.text(); } catch {}
    console.error('[deleteWorkflow] HTTP %s %s. Body: %s', response.status, response.statusText, String(bodyText).slice(0, 2000));
    throw new Error(`刪除工作流文件失敗: ${response.status} ${response.statusText} Body: ${String(bodyText).slice(0, 500)}`);
  }

  return response.json();
}

// 用户管理相关类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  groups: string[];
  status: 'active' | 'inactive' | 'banned';
  created_at: string;
  last_login: string;
  generation_count: number;
}

export interface SystemStats {
  total_users: number;
  total_generations: number;
  active_workflows: number;
  system_uptime: string;
  memory_usage: number;
  cpu_usage: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  user_id?: string;
  action?: string;
}

// 获取所有用户列表（仅管理员）
export async function getAllUsers(ctx?: ApiContext): Promise<User[]> {
  return apiGet<User[]>('/admin/users', ctx);
}

// 更新用户角色
export async function updateUserRole(userId: string, role: string, ctx?: ApiContext): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/users/${userId}/role`, { method: 'PUT', body: { role }, ctx });
}

// 更新用户状态
export async function updateUserStatus(userId: string, status: string, ctx?: ApiContext): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/users/${userId}/status`, { method: 'PUT', body: { status }, ctx });
}

// 获取系统统计信息
export async function getSystemStats(ctx?: ApiContext): Promise<SystemStats> {
  // 模拟系统统计数据
  return {
    total_users: 156,
    total_generations: 2847,
    active_workflows: 12,
    system_uptime: '7天 14小时 32分钟',
    memory_usage: 68.5,
    cpu_usage: 42.3
  };
}

// 获取系统日志
export async function getSystemLogs(limit: number = 50, ctx?: ApiContext): Promise<SystemLog[]> {
  // 模拟系统日志数据
  return [
    {
      id: '1',
      timestamp: '2024-12-10T10:30:00Z',
      level: 'info',
      message: '用户 admin 登录系统',
      user_id: '1',
      action: 'login'
    },
    {
      id: '2',
      timestamp: '2024-12-10T10:25:00Z',
      level: 'info',
      message: '工作流 workflow_001 执行完成',
      action: 'workflow_execution'
    },
    {
      id: '3',
      timestamp: '2024-12-10T10:20:00Z',
      level: 'warning',
      message: '内存使用率超过80%',
      action: 'system_monitoring'
    }
  ];
}

// 获取系统配置
export async function getSystemConfig(ctx?: ApiContext): Promise<Record<string, any>> {
  // 模拟系统配置
  return {
    api_rate_limit: 100,
    max_file_size: '10MB',
    session_timeout: 3600,
    enable_registration: true,
    maintenance_mode: false,
    smtp_enabled: true
  };
}

// 更新系统配置
export async function updateSystemConfig(config: Record<string, any>, ctx?: ApiContext): Promise<{ message: string }> {
  // 模拟配置更新
  console.log('Updating system config:', config);
  return { message: '系统配置更新成功' };
}

// 创建用户
export async function createUser(userData: { username: string; password: string; email: string; role: string }, ctx?: ApiContext): Promise<User> {
  return apiPost<User>('/admin/users', userData, ctx);
}

// 删除用户
export async function deleteUser(userId: string, ctx?: ApiContext): Promise<{ message: string }> {
  return apiFetch(`/admin/users/${userId}`, {
    method: 'DELETE',
    ctx,
    rawResponse: true,
  }) as unknown as Promise<{ message: string }>;
}

// 获取用户信息
export async function getUserInfo(userId: string, ctx?: ApiContext): Promise<User> {
  // 由于后端没有提供单独获取用户信息的API，我们通过获取所有用户然后过滤来实现
  const users = await getAllUsers(ctx);
  const user = users.find(u => u.id === userId);
  if (!user) {
    throw new Error(`用户 ${userId} 不存在`);
  }
  return user;
}

// 重置用户密码
export async function resetUserPassword(userId: string, newPassword: string, ctx?: ApiContext): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/users/${userId}/reset-password`, {
    method: 'PUT',
    body: { new_password: newPassword },
    ctx
  });
}

// 重置自己的密码

// 获取用户详细信息
export async function getUserDetails(userId: string, ctx?: ApiContext): Promise<User> {
  // 由于后端没有提供单独获取用户详细信息的API，我们通过获取所有用户然后过滤来实现
  const users = await getAllUsers(ctx);
  const user = users.find(u => u.id === userId);
  if (!user) {
    throw new Error(`用户 ${userId} 不存在`);
  }
  return user;
}

// 更新用户身分組
export async function updateUserGroups(userId: string, groups: string[], ctx?: ApiContext): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/users/${userId}/groups`, { method: 'PUT', body: { groups }, ctx });
}

// 身分組管理API函數

// 獲取當前用戶的權限列表
export async function getMyPermissions(ctx?: ApiContext): Promise<Permission[]> {
  return apiGet<Permission[]>('/admin/groups/my/permissions', ctx);
}

// 身分組管理API函數
// 獲取所有身分組列表（僅管理員）
export async function getAllGroups(ctx?: ApiContext): Promise<Group[]> {
  return apiGet<Group[]>('/admin/groups', ctx);
}

// 獲取指定身分組信息（僅管理員）
export async function getGroup(groupId: string, ctx?: ApiContext): Promise<Group> {
  return apiGet<Group>(`/admin/groups/${groupId}`, ctx);
}

// 創建新身分組（僅管理員）
export async function createGroup(groupData: CreateGroupData, ctx?: ApiContext): Promise<Group> {
  return apiPost<Group>('/admin/groups', groupData, ctx);
}

// 更新身分組（僅管理員）
export async function updateGroup(groupId: string, groupData: UpdateGroupData, ctx?: ApiContext): Promise<Group> {
  return apiFetch<Group>(`/admin/groups/${groupId}`, { method: 'PUT', body: groupData, ctx });
}

// 刪除身分組（僅管理員）
export async function deleteGroup(groupId: string, ctx?: ApiContext): Promise<{ message: string }> {
  return apiFetch(`/admin/groups/${groupId}`, {
    method: 'DELETE',
    ctx,
    rawResponse: true,
  }) as unknown as Promise<{ message: string }>;
}

// 获取系统所有权限列表（仅管理员）
export async function getSystemPermissions(ctx?: ApiContext): Promise<Permission[]> {
  return apiGet<Permission[]>('/admin/groups/permissions/list', ctx);
}


// 授权码管理API函数
// 获取所有授权码列表（仅管理员）
export async function getAllCodes(ctx?: ApiContext): Promise<CodeInfo[]> {
  return apiGet<CodeInfo[]>('/auth/admin/codes', ctx);
}

// 创建新授权码（仅管理员）
export async function createCode(codeData: CreateCodeData, ctx?: ApiContext): Promise<CodeInfo> {
  return apiPost<CodeInfo>('/auth/admin/codes', codeData, ctx);
}

// 删除授权码（仅管理员）
export async function deleteCode(code: string, ctx?: ApiContext): Promise<{ message: string }> {
  return apiFetch(`/auth/admin/codes/${code}`, {
    method: 'DELETE',
    ctx,
    rawResponse: true,
  }) as unknown as Promise<{ message: string }>;
}