/**
 * Express 应用入口:注册所有 API 路由 + 鉴权中间件
 */
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
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
import { getDb } from './db/index.js';
import { MODELS } from './config/models.js';
import { verifyToken, type AuthedRequest } from './services/authService.js';

dotenv.config();

const app: express.Application = express();

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
} catch (err) {
  console.error('数据库初始化失败:', err);
}

/**
 * 鉴权中间件:解析 Authorization 头,挂载 authUser
 * 不强制登录(允许匿名访问公开接口),由具体路由决定是否需要
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  const auth = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (match) {
    const payload = verifyToken(match[1]);
    if (payload) {
      (req as unknown as AuthedRequest).authUser = {
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
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as unknown as AuthedRequest).authUser) {
    res.status(401).json({ success: false, error: '请先登录' });
    return;
  }
  next();
}

/**
 * 公开路由(无需登录)
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' });
});
app.get('/api/models', (_req: Request, res: Response) => {
  res.json({ success: true, data: MODELS });
});
app.get('/download', (_req: Request, res: Response) => {
  const filePath = path.join(process.cwd(), 'console-project.tar.gz');
  res.download(filePath, 'console-project.tar.gz', (err) => {
    if (err) {
      res.status(404).json({ success: false, error: '文件不存在' });
    }
  });
});
app.use('/api', authRoutes);

/**
 * 受保护的业务路由(需要登录)
 */
app.use('/api', requireAuth, chatRoutes);
app.use('/api', requireAuth, keysRoutes);
app.use('/api', requireAuth, galleryRoutes);
app.use('/api', requireAuth, categoriesRoutes);
app.use('/api', requireAuth, usersRoutes);
app.use('/api', requireAuth, imageGenRoutes);

/**
 * 错误处理中间件
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API 错误:', error);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

/**
 * SPA 前端路由支持：非 API 请求返回 index.html
 */
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    next();
    return;
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

/**
 * 404
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API 不存在' });
});

export default app;
