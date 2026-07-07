/**
 * 鉴权状态:登录用户、令牌管理
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

export interface AuthUser {
  email: string;
  isAdmin: boolean;
  nickname: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean; // 初始化校验中
  initialized: boolean; // 是否已完成首次校验

  sendCode: (email: string) => Promise<{ devCode?: string; isAdminEmail: boolean }>;
  login: (email: string, code: string) => Promise<void>;
  logout: () => void;
  init: () => Promise<void>;
}

const TOKEN_KEY = 'console_auth_token';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  loading: false,
  initialized: false,

  sendCode: async (email) => {
    const data = await api.sendCode(email);
    return { devCode: data.devCode, isAdminEmail: !!data.isAdminEmail };
  },

  login: async (email, code) => {
    const data = await api.login(email, code);
    localStorage.setItem(TOKEN_KEY, data.token);
    set({ user: data.user, token: data.token });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },

  init: async () => {
    set({ loading: true });
    const token = get().token;
    if (!token) {
      set({ loading: false, initialized: true });
      return;
    }
    try {
      const user = await api.getMe();
      set({ user, loading: false, initialized: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, loading: false, initialized: true });
    }
  },
}));
