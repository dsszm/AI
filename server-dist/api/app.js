/**
 * Express 应用入口:注册所有 API 路由 + 鉴权中间件
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import keysRoutes from './routes/keys.js';
import galleryRoutes from './routes/gallery.js';
import categoriesRoutes from './routes/categories.js';
import usersRoutes from './routes/users.js';
import imageGenRoutes from './routes/imageGen.js';
import monitorRoutes from './routes/monitor.js';
import { getDb } from './db/index.js';
import { MODELS } from './config/models.js';
import { verifyToken } from './services/authService.js';
import { startBackgroundTasks } from './services/backgroundTaskService.js';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'api/data/uploads');
app.use('/uploads', express.static(uploadsDir));
const publicDir = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');
app.use(express.static(publicDir));
/**
 * 初始化数据库(首次启动时建表 + 种子数据)
 */
try {
    getDb();
}
catch (err) {
    console.error('数据库初始化失败:', err);
}
/**
 * 启动后台任务调度器（CPU 利用、定时清理、日志分析等）
 */
startBackgroundTasks();
/**
 * 鉴权中间件:解析 Authorization 头,挂载 authUser
 * 不强制登录(允许匿名访问公开接口),由具体路由决定是否需要
 */
app.use((req, _res, next) => {
    const auth = req.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    if (match) {
        const payload = verifyToken(match[1]);
        if (payload) {
            req.authUser = {
                email: payload.email,
                isAdmin: payload.isAdmin,
                nickname: payload.email.split('@')[0],
            };
        }
    }
    next();
});
/**
 * 需要登录才能访问的路由(所有业务接口)
 */
function requireAuth(req, res, next) {
    if (!req.authUser) {
        res.status(401).json({ success: false, error: '请先登录' });
        return;
    }
    next();
}
/**
 * 公开路由(无需登录)
 */
app.get('/api/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'ok' });
});
app.get('/api/models', (_req, res) => {
    res.json({ success: true, data: MODELS });
});
app.get('/download', (_req, res) => {
    const filePath = path.join(process.cwd(), 'console-project.tar.gz');
    res.download(filePath, 'console-project.tar.gz', (err) => {
        if (err) {
            res.status(404).json({ success: false, error: '文件不存在' });
        }
    });
});
app.use('/api', authRoutes);
/**
 * 公开相册接口（无需登录，只读）
 */
app.get('/api/public/gallery', (req, res) => {
    const { category, type } = req.query;
    const db = getDb();
    let sql = 'SELECT id, type, url, thumbnail, title, title_color as titleColor, title_style as titleStyle, category_id as categoryId FROM gallery_item WHERE 1=1';
    const params = [];
    if (category) {
        sql += ' AND category_id = ?';
        params.push(category);
    }
    if (type && (type === 'image' || type === 'video')) {
        sql += ' AND type = ?';
        params.push(type);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = db.prepare(sql).all(...params);
    res.json({ success: true, data: rows });
});
app.get('/api/public/categories', (_req, res) => {
    const db = getDb();
    const rows = db.prepare(`SELECT c.id, c.name, COUNT(g.id) as count
     FROM category c LEFT JOIN gallery_item g ON g.category_id = c.id
     GROUP BY c.id ORDER BY c.created_at DESC`).all();
    res.json({ success: true, data: rows });
});
/**
 * 受保护的业务路由(需要登录)
 */
app.use('/api', requireAuth, chatRoutes);
app.use('/api', requireAuth, keysRoutes);
app.use('/api', requireAuth, galleryRoutes);
app.use('/api', requireAuth, categoriesRoutes);
app.use('/api', requireAuth, usersRoutes);
app.use('/api', requireAuth, imageGenRoutes);
app.use('/api', requireAuth, monitorRoutes);
/**
 * 错误处理中间件
 */
app.use((error, _req, res, _next) => {
    console.error('API 错误:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
});
/**
 * SPA 前端路由支持：非 API 请求返回 index.html
 */
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        next();
        return;
    }
    res.sendFile(path.join(publicDir, 'index.html'));
});
/**
 * 404
 */
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'API 不存在' });
});
export default app;
