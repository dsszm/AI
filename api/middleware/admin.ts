import { type Request, type Response, type NextFunction } from 'express';
import { verifyToken, isAdmin, type AuthTokenPayload } from '../services/authService.js';

export interface AdminRequest extends Request {
  authUser?: AuthTokenPayload;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ success: false, error: '未登录' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: '登录已过期' });
    return;
  }

  if (!isAdmin(payload.email)) {
    res.status(403).json({ success: false, error: '仅管理员可操作' });
    return;
  }

  (req as AdminRequest).authUser = payload;
  next();
}
