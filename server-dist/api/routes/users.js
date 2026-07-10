/**
 * 用户管理路由（管理员专用）
 * - 查看用户列表
 * - 封号/解封用户
 */
import { Router } from 'express';
import { getDb } from '../db/index.js';
import { ADMIN_EMAIL, isAdmin } from '../services/authService.js';
import { getUsageStats, getUserUsage } from '../services/usageService.js';
const router = Router();
/**
 * 检查用户是否被封禁
 */
export function isUserBanned(email) {
    const db = getDb();
    const user = db.prepare('SELECT is_banned FROM users WHERE email = ?').get(email);
    return user?.is_banned === 1;
}
/**
 * 记录或更新用户登录信息
 */
export function recordUserLogin(email) {
    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
        db.prepare(`
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP, login_count = login_count + 1 
      WHERE email = ?
    `).run(normalizedEmail);
    }
    else {
        db.prepare(`
      INSERT INTO users (email, nickname, last_login_at, login_count) 
      VALUES (?, ?, CURRENT_TIMESTAMP, 1)
    `).run(normalizedEmail, normalizedEmail.split('@')[0]);
    }
}
/**
 * 获取用户列表
 */
router.get('/users', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可访问' });
        return;
    }
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const search = req.query.search || '';
    const banned = req.query.banned;
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (search) {
        whereClause += ' AND (email LIKE ? OR nickname LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (banned === 'true') {
        whereClause += ' AND is_banned = 1';
    }
    else if (banned === 'false') {
        whereClause += ' AND is_banned = 0';
    }
    // 获取总数
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM users ${whereClause}`).get(...params);
    const total = countRow.total;
    // 获取用户列表
    const users = db.prepare(`
    SELECT email, nickname, is_banned, ban_reason, banned_at, banned_by, last_login_at, login_count, created_at 
    FROM users ${whereClause} 
    ORDER BY last_login_at DESC 
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);
    res.json({
        success: true,
        data: {
            users: users.map(u => ({
                email: u.email,
                nickname: u.nickname,
                isBanned: u.is_banned === 1,
                banReason: u.ban_reason,
                bannedAt: u.banned_at,
                bannedBy: u.banned_by,
                lastLoginAt: u.last_login_at,
                loginCount: u.login_count,
                createdAt: u.created_at,
                isAdmin: isAdmin(u.email),
            })),
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        },
    });
});
/**
 * 封禁用户
 */
router.post('/users/:email/ban', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可操作' });
        return;
    }
    const targetEmail = req.params.email.toLowerCase().trim();
    // 不能封禁管理员
    if (targetEmail === ADMIN_EMAIL.toLowerCase()) {
        res.status(400).json({ success: false, error: '不能封禁管理员账号' });
        return;
    }
    const { reason } = req.body;
    const banReason = reason || '违反平台规定';
    const db = getDb();
    // 检查用户是否存在
    const user = db.prepare('SELECT email FROM users WHERE email = ?').get(targetEmail);
    if (!user) {
        res.status(404).json({ success: false, error: '用户不存在' });
        return;
    }
    db.prepare(`
    UPDATE users 
    SET is_banned = 1, ban_reason = ?, banned_at = CURRENT_TIMESTAMP, banned_by = ? 
    WHERE email = ?
  `).run(banReason, authUser.email, targetEmail);
    res.json({ success: true, message: '用户已封禁' });
});
/**
 * 解封用户
 */
router.post('/users/:email/unban', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可操作' });
        return;
    }
    const targetEmail = req.params.email.toLowerCase().trim();
    const db = getDb();
    // 检查用户是否存在
    const user = db.prepare('SELECT email, is_banned FROM users WHERE email = ?').get(targetEmail);
    if (!user) {
        res.status(404).json({ success: false, error: '用户不存在' });
        return;
    }
    if (user.is_banned !== 1) {
        res.status(400).json({ success: false, error: '该用户未被封禁' });
        return;
    }
    db.prepare(`
    UPDATE users 
    SET is_banned = 0, ban_reason = NULL, banned_at = NULL, banned_by = NULL 
    WHERE email = ?
  `).run(targetEmail);
    res.json({ success: true, message: '用户已解封' });
});
/**
 * 获取用户统计
 */
router.get('/users/stats', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可访问' });
        return;
    }
    const db = getDb();
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const bannedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_banned = 1').get();
    const activeUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE last_login_at > datetime('now', '-7 days')
  `).get();
    const newUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users 
    WHERE created_at > datetime('now', '-7 days')
  `).get();
    res.json({
        success: true,
        data: {
            totalUsers: totalUsers.count,
            bannedUsers: bannedUsers.count,
            activeUsers: activeUsers.count,
            newUsers: newUsers.count,
        },
    });
});
/**
 * 获取所有用户 AI 使用量统计（仅管理员）
 */
router.get('/users/usage', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可访问' });
        return;
    }
    const stats = getUsageStats();
    res.json({ success: true, data: stats });
});
/**
 * 获取某用户的使用明细（仅管理员）
 */
router.get('/users/:email/usage', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可访问' });
        return;
    }
    const email = req.params.email.toLowerCase().trim();
    const limit = parseInt(req.query.limit) || 50;
    const records = getUserUsage(email, limit);
    res.json({ success: true, data: records });
});
export default router;
