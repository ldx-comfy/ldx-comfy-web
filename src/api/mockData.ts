// src/api/mockData.ts
import type { WorkflowParam } from './workflows';

// 模擬 API 響應數據
export const mockWorkflowParams: WorkflowParam[] = [
  {
    node_id: '1',
    title: '上傳圖片',
    class_type: 'LoadImageOutput'
  },
  {
    node_id: '2',
    title: '輸入提示詞',
    class_type: 'Text'
  },
  {
    node_id: '3',
    title: '啟用高級功能',
    class_type: 'Switch any [Crystools]'
  },
  {
    node_id: '4',
    title: '其他參數',
    class_type: 'UnknownType'
  }
];