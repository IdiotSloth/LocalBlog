/** Centralized JWT cookie auth middleware */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

export interface AuthRequest extends Request {
  userId?: number;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.token;
    if (!token) { res.status(401).json({ success: false, error: '未登录' }); return; }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token 无效或已过期' });
  }
}
