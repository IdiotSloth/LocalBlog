import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../../shared/types';
import { AuthService } from '../services/auth.service';
import { setCurrentUserId } from '../pet';

export function registerAuthHandlers(): void {
  ipcMain.handle(IPC.AUTH_LOGIN, async (_event, req: LoginRequest): Promise<AuthResponse> => {
    try {
      const res = await AuthService.login(req.username, req.password, req.rememberMe);
      if (res.success && res.user) setCurrentUserId(res.user.id);
      return res;
    } catch (err) {
      console.error('[Auth IPC] Login error:', err);
      return { success: false, error: `登录异常: ${(err as Error).message}` };
    }
  });

  ipcMain.handle(IPC.AUTH_REGISTER, async (_event, req: RegisterRequest): Promise<AuthResponse> => {
    try {
      const res = await AuthService.register(req.username, req.password, req.workspacePath);
      if (res.success && res.user) setCurrentUserId(res.user.id);
      return res;
    } catch (err) {
      console.error('[Auth IPC] Register error:', err);
      return { success: false, error: `注册异常: ${(err as Error).message}` };
    }
  });

  ipcMain.handle(IPC.AUTH_LOGOUT, async (_event, token: string): Promise<void> => {
    try {
      await AuthService.logout(token);
    } catch (err) {
      console.error('[Auth IPC] Logout error:', err);
    }
  });

  ipcMain.handle(IPC.AUTH_VERIFY_TOKEN, async (_event, token: string): Promise<AuthResponse> => {
    try {
      const res = await AuthService.verifyToken(token);
      if (res.success && res.user) setCurrentUserId(res.user.id);
      return res;
    } catch (err) {
      console.error('[Auth IPC] Verify error:', err);
      return { success: false, error: '验证失败' };
    }
  });

  ipcMain.handle(
    IPC.AUTH_DELETE_ACCOUNT,
    async (_event, data: { userId: number; keepFiles: boolean }): Promise<{ success: boolean; error?: string }> => {
      try {
        return await AuthService.deleteAccount(data.userId, data.keepFiles);
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
}
