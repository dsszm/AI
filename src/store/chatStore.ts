/**
 * 全局状态:模型、对话、会话
 */
import { create } from 'zustand';
import type { ChatMessage, ModelId, ModelInfo } from '../../shared/types';
import { api, streamChat } from '@/lib/api';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: ModelId;
  images?: string[];
  streaming?: boolean;
  error?: string;
}

export interface SessionInfo {
  id: string;
  title: string;
  created_at: string;
}

interface ChatState {
  models: ModelInfo[];
  currentModel: ModelId;
  messages: UIMessage[];
  sessions: SessionInfo[];
  currentSessionId: string | null;
  loading: boolean;
  sending: boolean;
  error: string | null;

  setModel: (m: ModelId) => void;
  loadModels: () => Promise<void>;
  loadSessions: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  newChat: () => void;
  sendMessage: (text: string, images?: string[]) => Promise<void>;
  retryLast: () => Promise<void>;
  clearError: () => void;
}

let msgSeq = 0;
const nextId = () => `m${Date.now()}_${msgSeq++}`;

export const useChatStore = create<ChatState>((set, get) => ({
  models: [],
  currentModel: 'qwen',
  messages: [],
  sessions: [],
  currentSessionId: null,
  loading: false,
  sending: false,
  error: null,

  setModel: (m) => set({ currentModel: m }),

  loadModels: async () => {
    try {
      const models = await api.getModels();
      set({ models });
    } catch (err) {
      console.error('加载模型失败', err);
    }
  },

  loadSessions: async () => {
    try {
      const sessions = await api.getSessions();
      set({ sessions });
    } catch (err) {
      console.error('加载会话列表失败', err);
    }
  },

  selectSession: async (id) => {
    set({ loading: true, currentSessionId: id });
    try {
      const history = await api.getHistory(id);
      const messages: UIMessage[] = history.map((h) => ({
        id: h.id,
        role: h.role,
        content: h.content,
        model: (h.model as ModelId) || undefined,
        images: h.images ? safeParse(h.images) : undefined,
      }));
      set({ messages, loading: false });
    } catch (err) {
      set({ loading: false, error: '加载历史失败' });
    }
  },

  newChat: () => {
    set({ messages: [], currentSessionId: null, error: null });
  },

  sendMessage: async (text, images) => {
    const state = get();
    if (state.sending) return;
    if (!text.trim() && (!images || images.length === 0)) return;

    const userMsg: UIMessage = {
      id: nextId(),
      role: 'user',
      content: text.trim(),
      images,
    };
    const assistantMsg: UIMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      model: state.currentModel,
      streaming: true,
    };

    // 构建发送给后端的消息(包含历史)
    const historyMessages: ChatMessage[] = [
      ...state.messages
        .filter((m) => !m.error)
        .map((m) => ({
          role: m.role,
          content: m.content,
          images: m.images,
        })),
      { role: 'user' as const, content: text.trim(), images },
    ];

    set({
      messages: [...state.messages, userMsg, assistantMsg],
      sending: true,
      error: null,
    });

    await doStream(set, get, historyMessages, assistantMsg.id);
  },

  retryLast: async () => {
    const state = get();
    if (state.sending) return;
    // 找到最后一条用户消息
    const lastUserIdx = [...state.messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const realIdx = state.messages.length - 1 - lastUserIdx;
    const lastUser = state.messages[realIdx];

    // 移除其后的所有助手消息
    const kept = state.messages.slice(0, realIdx + 1);
    const assistantMsg: UIMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      model: state.currentModel,
      streaming: true,
    };
    set({ messages: [...kept, assistantMsg], sending: true, error: null });

    const historyMessages: ChatMessage[] = kept.map((m) => ({
      role: m.role,
      content: m.content,
      images: m.images,
    }));

    await doStream(set, get, historyMessages, assistantMsg.id);
  },

  clearError: () => set({ error: null }),
}));

async function doStream(
  set: (partial: Partial<ChatState>) => void,
  get: () => ChatState,
  historyMessages: ChatMessage[],
  assistantId: string
) {
  const state = get();
  const updateAssistant = (updater: (m: UIMessage) => UIMessage) => {
    set({
      messages: get().messages.map((m) => (m.id === assistantId ? updater(m) : m)),
    });
  };

  // 判断是否使用 demo 模式:无 Key 配置时降级到 demo
  let useDemo = false;
  try {
    const keys = await api.getKeys();
    const modelKey = keys.find((k) => k.model === state.currentModel);
    // 通义千问默认启用(有管理员 Key),其他模型需配置
    if (state.currentModel !== 'qwen' && modelKey && !modelKey.configured) {
      useDemo = true;
    }
  } catch {
    // 获取状态失败,尝试真实调用
  }

  await streamChat(
    {
      model: state.currentModel,
      messages: historyMessages,
      sessionId: state.currentSessionId || undefined,
    },
    {
      onSession: (sessionId) => {
        set({ currentSessionId: sessionId });
      },
      onToken: (token) => {
        updateAssistant((m) => ({ ...m, content: m.content + token }));
      },
      onDone: (sessionId) => {
        updateAssistant((m) => ({ ...m, streaming: false }));
        set({ sending: false, currentSessionId: sessionId });
        // 刷新会话列表
        get().loadSessions();
      },
      onError: (message) => {
        updateAssistant((m) => ({
          ...m,
          streaming: false,
          error: message,
          content: m.content || '',
        }));
        set({ sending: false, error: message });
      },
    },
    useDemo
  );
}

function safeParse(s: string): string[] | undefined {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
}
