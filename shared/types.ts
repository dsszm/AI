/**
 * 共享类型定义(前后端通用)
 */

export type ModelId =
  | 'qwen'
  | 'openai'
  | 'deepseek'
  | 'claude'
  | 'gemini'
  | 'glm'
  | 'moonshot'
  | 'doubao'
  | 'spark';

export interface ModelInfo {
  id: ModelId;
  name: string;
  provider: string;
  description: string;
  defaultEnabled: boolean; // 通义千问默认启用
  supportsVision: boolean;
  color: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

export interface ChatRequest {
  model: ModelId;
  messages: ChatMessage[];
  sessionId?: string;
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail: string;
  title: string;
  titleColor?: string;
  titleStyle?: string;
  categoryId?: string;
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface KeyStatus {
  model: ModelId;
  name: string;
  configured: boolean;
  defaultEnabled: boolean;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
