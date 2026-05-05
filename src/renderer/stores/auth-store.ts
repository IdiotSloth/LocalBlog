import type { User } from '@shared/types';
import { create } from 'zustand';

const STORAGE_KEY_TOKEN = 'lbkb_session_token';
const STORAGE_KEY_USER = 'lbkb_session_user';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;

  /** Initialize auth state from persisted session (call on app startup) */
  initSession: () => Promise<void>;

  /** Login and optionally persist token */
  login: (username: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;

  /** Register a new account */
  register: (
    username: string,
    password: string,
    workspacePath: string,
  ) => Promise<{ success: boolean; error?: string }>;

  /** Logout and clear persisted session */
  logout: () => Promise<void>;

  /** Delete account */
  deleteAccount: (keepFiles: boolean) => Promise<{ success: boolean; error?: string }>;
}

function persistSession(token: string, user: User, rememberMe: boolean): void {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEY_TOKEN, token);
  storage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

function clearPersistedSession(): void {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  sessionStorage.removeItem(STORAGE_KEY_USER);
}

function loadPersistedToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN) || null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,

  initSession: async () => {
    const token = loadPersistedToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await window.api.verifyToken(token);
      if (res.success && res.user) {
        set({ isAuthenticated: true, user: res.user, token, isLoading: false });
      } else {
        clearPersistedSession();
        set({ isLoading: false });
      }
    } catch {
      clearPersistedSession();
      set({ isLoading: false });
    }
  },

  login: async (username, password, rememberMe) => {
    try {
      const res = await window.api.login({ username, password, rememberMe });
      if (res.success && res.user && res.token) {
        persistSession(res.token, res.user, rememberMe);
        set({ isAuthenticated: true, user: res.user, token: res.token });
        return { success: true };
      }
      return { success: false, error: res.error || '登录失败' };
    } catch (err) {
      return { success: false, error: `登录请求失败: ${(err as Error).message}` };
    }
  },

  register: async (username, password, workspacePath) => {
    try {
      const res = await window.api.register({ username, password, workspacePath });
      if (res.success && res.user && res.token) {
        persistSession(res.token, res.user, true);
        set({ isAuthenticated: true, user: res.user, token: res.token });
        return { success: true };
      }
      return { success: false, error: res.error || '注册失败' };
    } catch (err) {
      return { success: false, error: `注册请求失败: ${(err as Error).message}` };
    }
  },

  logout: async () => {
    const { token } = get();
    if (token) {
      await window.api.logout(token).catch(() => {});
    }
    clearPersistedSession();
    set({ isAuthenticated: false, user: null, token: null });
  },

  deleteAccount: async (keepFiles) => {
    const { user, token } = get();
    if (!user) return { success: false, error: '未登录' };

    const res = await window.api.deleteAccount({ userId: user.id, keepFiles });
    if (res.success) {
      clearPersistedSession();
      set({ isAuthenticated: false, user: null, token: null });
      return { success: true };
    }
    return { success: false, error: res.error || '删除失败' };
  },
}));
