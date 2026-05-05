import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { loginSchema, registerSchema } from '../../shared/validation';
import { JWT_SECRET } from '../config';
import { getPool } from '../db';
import { type AuthRequest, requireAuth } from '../middleware/auth';
import { generateToken, hashPassword, verifyPassword } from '../utils/crypto';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.json({ success: false, error: parsed.error.issues[0]?.message || '参数错误' });
    const { username, password, workspacePath } = parsed.data;

    const pool = getPool();
    const [existing] = (await pool.execute('SELECT id FROM users WHERE username = ?', [username])) as any[];
    if (existing.length > 0) return res.json({ success: false, error: '用户名已存在' });

    const hash = hashPassword(password);
    const now = new Date().toISOString();
    const [result] = (await pool.execute(
      'INSERT INTO users (username, password_hash, workspace_path, created_at) VALUES (?, ?, ?, ?)',
      [username, hash, workspacePath, now],
    )) as any[];
    const userId = result.insertId;

    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.execute('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)', [
      userId,
      sessionToken,
      expiresAt,
      now,
    ]);

    const jwtToken = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', jwtToken, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

    return res.json({
      success: true,
      user: { id: userId, username, workspacePath, createdAt: new Date().toISOString() },
      token: jwtToken,
    });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.json({ success: false, error: parsed.error.issues[0]?.message || '参数错误' });
    const { username, password, rememberMe } = parsed.data;
    const pool = getPool();
    const [rows] = (await pool.execute('SELECT * FROM users WHERE username = ?', [username])) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '用户名或密码错误' });

    const user = rows[0];
    if (!verifyPassword(password, user.password_hash)) return res.json({ success: false, error: '用户名或密码错误' });

    const sessionToken = generateToken();
    const expiryDays = rememberMe ? 30 : 1;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    const now = new Date().toISOString();
    await pool.execute('DELETE FROM sessions WHERE user_id = ?', [user.id]);
    await pool.execute('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)', [
      user.id,
      sessionToken,
      expiresAt,
      now,
    ]);

    const jwtToken = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: rememberMe ? '30d' : '1d' });
    res.cookie('token', jwtToken, { httpOnly: true, maxAge: expiryDays * 24 * 60 * 60 * 1000, sameSite: 'lax' });

    return res.json({
      success: true,
      user: { id: user.id, username, workspacePath: user.workspace_path, createdAt: user.created_at },
      token: jwtToken,
    });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

authRouter.get('/session', requireAuth, async (req: AuthRequest, res) => {
  try {
    const pool = getPool();
    const uid = req.userId;
    if (uid == null) return res.status(401).json({ success: false, error: '未登录' });
    const [rows] = (await pool.execute('SELECT * FROM users WHERE id = ?', [uid])) as any[];
    if (rows.length === 0) return res.json({ success: false, error: '用户不存在' });
    const u = rows[0];
    return res.json({
      success: true,
      user: { id: u.id, username: u.username, workspacePath: u.workspace_path, createdAt: u.created_at },
    });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token');
  return res.json({ success: true });
});

authRouter.post('/delete', requireAuth, async (req: AuthRequest, res) => {
  try {
    const pool = getPool();
    const uid = req.userId;
    if (uid == null) return res.status(401).json({ success: false, error: '未登录' });
    const keepFiles = req.body.keepFiles === true;

    if (keepFiles) {
      // Preserve data: clear auth so account is inaccessible but data survives (reclaimable)
      await pool.execute('DELETE FROM sessions WHERE user_id = ?', [uid]);
      await pool.execute("UPDATE users SET password_hash = '' WHERE id = ?", [uid]);
    } else {
      await pool.execute('DELETE FROM users WHERE id = ?', [uid]);
    }
    res.clearCookie('token');
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});
