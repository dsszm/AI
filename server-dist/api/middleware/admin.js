import { verifyToken, isAdmin } from '../services/authService.js';
export function requireAdmin(req, res, next) {
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
    req.authUser = payload;
    next();
}
