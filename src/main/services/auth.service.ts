import fs from 'node:fs';
import { nowTimestamp, toDateTime } from '../../shared/datetime';
import type { AuthResponse, User } from '../../shared/types';
import { dbGet, dbRun } from '../db';
import { generateToken, hashPassword, verifyPassword } from '../utils/crypto';
import { initWorkspaceDirectories } from '../utils/paths';

const TOKEN_EXPIRY_DAYS = 30;

export class AuthService {
  static async register(username: string, password: string, workspacePath: string): Promise<AuthResponse> {
    console.log('[Auth] Register attempt:', username, 'workspace:', workspacePath);

    if (!username || username.length < 2) return { success: false, error: '用户名至少需要2个字符' };
    if (!password || password.length < 4) return { success: false, error: '密码至少需要4个字符' };
    if (!workspacePath) return { success: false, error: '请选择工作区目录' };

    const existing = await dbGet<{ id: number }>('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return { success: false, error: `用户名 "${username}" 已存在` };

    // Check for a reclaimed account (same workspace, cleared password from keepFiles=true deletion)
    const reclaimed = await dbGet<{ id: number; username: string }>(
      "SELECT id, username FROM users WHERE workspace_path = ? AND password_hash = ''",
      [workspacePath],
    );

    const passwordHash = hashPassword(password);
    let userId: number;

    if (reclaimed) {
      // Reclaim: restore auth on existing user row, preserving all blog/knowledge data
      await dbRun('UPDATE users SET username = ?, password_hash = ? WHERE id = ?', [
        username,
        passwordHash,
        reclaimed.id,
      ]);
      userId = reclaimed.id;
    } else {
      await dbRun('INSERT INTO users (username, password_hash, workspace_path, created_at) VALUES (?, ?, ?, ?)', [
        username,
        passwordHash,
        workspacePath,
        nowTimestamp(),
      ]);
      const newUser = await dbGet<{ id: number }>('SELECT id FROM users WHERE username = ?', [username]);
      if (!newUser?.id) return { success: false, error: '创建用户失败: 数据库写入异常' };
      userId = newUser.id;
    }

    try {
      initWorkspaceDirectories(workspacePath);
    } catch (err) {
      await dbRun('DELETE FROM users WHERE id = ?', [userId]);
      return { success: false, error: `创建工作区目录失败: ${(err as Error).message}` };
    }

    const token = generateToken();
    const expiresAt = toDateTime(new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    await dbRun('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)', [
      userId,
      token,
      expiresAt,
      nowTimestamp(),
    ]);

    return { success: true, user: { id: userId, username, workspacePath, createdAt: nowTimestamp() }, token };
  }

  static async login(username: string, password: string, rememberMe: boolean): Promise<AuthResponse> {
    console.log('[Auth] Login attempt:', username);
    const row = await dbGet<{ id: number; password_hash: string; workspace_path: string; created_at: string }>(
      'SELECT id, password_hash, workspace_path, created_at FROM users WHERE username = ?',
      [username],
    );

    if (!row) {
      console.log('[Auth] User not found');
      return { success: false, error: '用户名或密码错误' };
    }

    const valid = verifyPassword(password, row.password_hash);
    if (!valid) return { success: false, error: '用户名或密码错误' };

    const token = generateToken();
    const expiryDays = rememberMe ? TOKEN_EXPIRY_DAYS : 1;
    const expiresAt = toDateTime(new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000));

    await dbRun('DELETE FROM sessions WHERE user_id = ?', [row.id]);
    await dbRun('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)', [
      row.id,
      token,
      expiresAt,
      nowTimestamp(),
    ]);

    return {
      success: true,
      user: { id: row.id, username, workspacePath: row.workspace_path, createdAt: row.created_at },
      token,
    };
  }

  static async verifyToken(token: string): Promise<AuthResponse> {
    const row = await dbGet<{
      user_id: number;
      username: string;
      workspace_path: string;
      created_at: string;
      expires_at: string;
    }>(
      `SELECT s.user_id, u.username, u.workspace_path, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
      [token],
    );

    if (!row) return { success: false, error: 'Token 无效' };
    if (new Date(row.expires_at) < new Date()) {
      await dbRun('DELETE FROM sessions WHERE token = ?', [token]);
      return { success: false, error: '登录已过期，请重新登录' };
    }

    return {
      success: true,
      user: { id: row.user_id, username: row.username, workspacePath: row.workspace_path, createdAt: row.created_at },
      token,
    };
  }

  static async logout(token: string): Promise<void> {
    await dbRun('DELETE FROM sessions WHERE token = ?', [token]);
  }

  static async deleteAccount(userId: number, keepFiles: boolean): Promise<{ success: boolean; error?: string }> {
    const user = await dbGet<{ workspace_path: string }>('SELECT workspace_path FROM users WHERE id = ?', [userId]);
    if (!user) return { success: false, error: '用户不存在' };

    if (keepFiles) {
      // Preserve DB data: clear auth so account is inaccessible but data survives
      await dbRun('DELETE FROM sessions WHERE user_id = ?', [userId]);
      await dbRun("UPDATE users SET password_hash = '' WHERE id = ?", [userId]);
    } else {
      await dbRun('DELETE FROM users WHERE id = ?', [userId]);
      if (user.workspace_path) {
        try {
          fs.rmSync(user.workspace_path, { recursive: true, force: true });
        } catch {
          /* workspace may not exist or already deleted */
        }
      }
    }
    return { success: true };
  }
}
