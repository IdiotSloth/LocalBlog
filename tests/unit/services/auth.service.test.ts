import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module before importing the service
vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

vi.mock('../../../src/main/utils/paths', () => ({
  getWorkspacePath: vi.fn(),
  getBlogsDir: vi.fn(),
  getKnowledgeBaseDir: vi.fn(),
  getAssetsDir: vi.fn(),
  getBlogPath: vi.fn(),
  getBlogAssetsDir: vi.fn(),
  initWorkspaceDirectories: vi.fn(),
}));

import { AuthService } from '../../../src/main/services/auth.service';
import { dbGet, dbRun } from '../../../src/main/db';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbRun = dbRun as ReturnType<typeof vi.fn>;

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should reject username shorter than 2 characters', async () => {
      const result = await AuthService.register('a', 'password123', '/tmp/ws');
      expect(result.success).toBe(false);
      expect(result.error).toContain('至少需要2个字符');
    });

    it('should reject password shorter than 4 characters', async () => {
      const result = await AuthService.register('validuser', 'ab', '/tmp/ws');
      expect(result.success).toBe(false);
      expect(result.error).toContain('至少需要4个字符');
    });

    it('should reject empty workspace path', async () => {
      const result = await AuthService.register('validuser', 'password123', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('工作区目录');
    });

    it('should reject duplicate username', async () => {
      mockDbGet.mockResolvedValueOnce({ id: 1 }); // existing user
      const result = await AuthService.register('existing', 'password123', '/tmp/ws');
      expect(result.success).toBe(false);
      expect(result.error).toContain('已存在');
    });

    it('should create user successfully', async () => {
      mockDbGet.mockResolvedValueOnce(undefined); // username check
      mockDbGet.mockResolvedValueOnce(undefined); // reclaim check — no empty-password user found
      mockDbRun.mockResolvedValue(undefined); // INSERT
      mockDbGet.mockResolvedValueOnce({ id: 42 }); // SELECT id after INSERT
      const result = await AuthService.register('newuser', 'password123', '/tmp/ws');
      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(42);
      expect(result.token).toBeTruthy();
      // Verify INSERT was called with correct values
      const insertCall = mockDbRun.mock.calls[0];
      expect(insertCall[1][0]).toBe('newuser');
      expect(insertCall[1][2]).toBe('/tmp/ws');
    });
  });

  describe('login', () => {
    it('should return error for non-existent user', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);
      const result = await AuthService.login('nobody', 'password', false);
      expect(result.success).toBe(false);
    });

    it('should return error for wrong password', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        password_hash: 'salt123:hashvalue',
      });
      const result = await AuthService.login('validuser', 'wrongpassword', false);
      expect(result.success).toBe(false);
    });

    it('should login successfully with correct password', async () => {
      const { hashPassword } = await import('../../../src/main/utils/crypto');
      const hash = hashPassword('correct123');
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        password_hash: hash,
        workspace_path: '/tmp/ws',
        created_at: '2026-01-01',
      });
      mockDbRun.mockResolvedValue(undefined);
      mockDbRun.mockResolvedValue(undefined);
      const result = await AuthService.login('validuser', 'correct123', true);
      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(1);
      expect(result.token).toBeTruthy();
    });
  });

  describe('verifyToken', () => {
    it('should reject invalid token', async () => {
      mockDbGet.mockResolvedValueOnce(undefined);
      const result = await AuthService.verifyToken('invalid-token');
      expect(result.success).toBe(false);
    });

    it('should reject expired token', async () => {
      const pastDate = new Date(Date.now() - 999 * 24 * 60 * 60 * 1000).toISOString();
      mockDbGet.mockResolvedValueOnce({
        user_id: 1, username: 'test', workspace_path: '/tmp', created_at: '2026-01-01', expires_at: pastDate,
      });
      const result = await AuthService.verifyToken('expired-token');
      expect(result.success).toBe(false);
    });
  });

  describe('deleteAccount', () => {
    it('should clear auth on user when keepFiles is true', async () => {
      mockDbGet.mockResolvedValueOnce({ workspace_path: '/tmp/ws' });
      mockDbRun.mockResolvedValue(undefined);
      const result = await AuthService.deleteAccount(1, true);
      expect(result.success).toBe(true);
      expect(mockDbRun).toHaveBeenCalledWith(
        "UPDATE users SET password_hash = '' WHERE id = ?",
        [1],
      );
    });

    it('should delete user and clean up workspace when keepFiles is false', async () => {
      mockDbGet.mockResolvedValueOnce({ workspace_path: '/tmp/ws' });
      mockDbRun.mockResolvedValue(undefined);
      const result = await AuthService.deleteAccount(1, false);
      expect(result.success).toBe(true);
      expect(mockDbRun).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?', [1]);
    });
  });
});
