/**
 * API 客户端:统一请求封装
 */
import type {
  ApiResult,
  Category,
  ChatMessage,
  GalleryItem,
  KeyStatus,
  ModelId,
  ModelInfo,
} from '../../shared/types';

const BASE = '/api';

const TOKEN_KEY = 'console_auth_token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...options,
  });
  const json = (await res.json()) as ApiResult<T>;
  if (!json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json.data as T;
}

export interface AuthUser {
  email: string;
  isAdmin: boolean;
  nickname: string;
}

export const api = {
  // 鉴权
  sendCode: (email: string) =>
    request<{ devCode?: string; isAdminEmail: boolean; message: string }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  login: (email: string, code: string) =>
    request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  getMe: () => request<AuthUser>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  getModels: () => request<ModelInfo[]>('/models'),
  getKeys: () => request<KeyStatus[]>('/keys'),
  saveKey: (model: ModelId, apiKey: string, persist: boolean) =>
    request('/keys', {
      method: 'POST',
      body: JSON.stringify({ model, apiKey, persist }),
    }),
  deleteKey: (model: ModelId) =>
    request(`/keys/${model}`, { method: 'DELETE' }),

  getGallery: (params?: { category?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.type) qs.set('type', params.type);
    return request<GalleryItem[]>(`/gallery${qs.toString() ? '?' + qs : ''}`);
  },
  getGalleryItem: (id: string) => request<GalleryItem>(`/gallery/${id}`),
  addGalleryUrl: (url: string, title?: string, categoryId?: string) =>
    request<GalleryItem>('/gallery/url', {
      method: 'POST',
      body: JSON.stringify({ url, title, categoryId }),
    }),
  uploadGalleryImage: (file: File, title?: string, categoryId?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (title) formData.append('title', title);
    if (categoryId) formData.append('categoryId', categoryId);
    return fetch(`${BASE}/gallery/upload`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: formData,
    }).then(async (res) => {
      const json = (await res.json()) as ApiResult<GalleryItem>;
      if (!json.success) throw new Error(json.error || '上传失败');
      return json.data as GalleryItem;
    });
  },
  deleteGalleryItem: (id: string) =>
    request(`/gallery/${id}`, { method: 'DELETE' }),
  assignCategory: (id: string, categoryId: string) =>
    request(`/gallery/${id}/category`, {
      method: 'POST',
      body: JSON.stringify({ categoryId }),
    }),

  getCategories: () => request<Category[]>('/categories'),
  createCategory: (name: string) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  updateCategory: (id: string, name: string) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteCategory: (id: string) =>
    request(`/categories/${id}`, { method: 'DELETE' }),

  generateImage: (params: { model: string; prompt: string; size?: string; saveToGallery?: boolean; title?: string; categoryId?: string; referenceImage?: string; referenceStrength?: number }) =>
    request<{ url: string; galleryId?: string }>('/image-gen', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getImageGenModels: () => request<string[]>('/image-gen/models'),

  // 公开相册（无需登录）
  getPublicGallery: (params?: { category?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.type) qs.set('type', params.type);
    return request<GalleryItem[]>(`/public/gallery${qs.toString() ? '?' + qs : ''}`);
  },
  getPublicCategories: () => request<Category[]>('/public/categories'),
  sendImageEmail: (imageUrl: string, email: string, prompt?: string) =>
    request('/image-gen/send-email', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, email, prompt }),
    }),

  getSessions: () => request<Array<{ id: string; title: string; created_at: string }>>('/chat/sessions'),
  getHistory: (sessionId: string) =>
    request<Array<{ id: string; role: 'user' | 'assistant'; content: string; model: string | null; images: string | null; created_at: string }>>(
      `/chat/history/${sessionId}`
    ),
};

/**
 * 流式对话:SSE 解析
 * 通过 fetch + ReadableStream 读取 SSE 事件
 */
export interface StreamHandlers {
  onSession?: (sessionId: string) => void;
  onToken: (token: string) => void;
  onDone: (sessionId: string) => void;
  onError: (message: string) => void;
}

export async function streamChat(
  payload: { model: ModelId; messages: ChatMessage[]; sessionId?: string },
  handlers: StreamHandlers,
  useDemo = false
): Promise<void> {
  const endpoint = useDemo ? '/api/chat/demo' : '/api/chat';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });

  // 非 SSE 响应(错误)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const json = await res.json().catch(() => ({ error: '请求失败' }));
    handlers.onError(json.error || `请求失败(${res.status})`);
    return;
  }

  if (!res.body) {
    handlers.onError('无响应流');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 以双换行分隔事件
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const evt of events) {
      const lines = evt.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (event === 'session') handlers.onSession?.(parsed.sessionId);
        else if (event === 'token') handlers.onToken(parsed.content);
        else if (event === 'done') handlers.onDone(parsed.sessionId);
        else if (event === 'error') handlers.onError(parsed.message);
      } catch {
        // 忽略解析错误
      }
    }
  }
}
