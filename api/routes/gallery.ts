/**
 * 相册路由:从阿里云视频点播获取内容(此处用数据库模拟)
 */
import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db/index.js';
import type { GalleryItem } from '../../shared/types.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

const uploadDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'api/data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片格式: jpg, jpeg, png, gif, webp, bmp'));
    }
  },
});

// 获取相册列表(支持分类与类型筛选)
router.get('/gallery', (req: Request, res: Response) => {
  const { category, type } = req.query as { category?: string; type?: string };
  const db = getDb();

  let sql = 'SELECT id, type, url, thumbnail, title, title_color as titleColor, title_style as titleStyle, category_id as categoryId FROM gallery_item WHERE 1=1';
  const params: string[] = [];
  if (category) {
    sql += ' AND category_id = ?';
    params.push(category);
  }
  if (type && (type === 'image' || type === 'video')) {
    sql += ' AND type = ?';
    params.push(type);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params) as GalleryItem[];
  res.json({ success: true, data: rows });
});

// 获取单项详情(供 AI 引用取图)
router.get('/gallery/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const row = db
    .prepare('SELECT id, type, url, thumbnail, title, title_color as titleColor, title_style as titleStyle, category_id as categoryId FROM gallery_item WHERE id = ?')
    .get(id) as GalleryItem | undefined;
  if (!row) {
    res.status(404).json({ success: false, error: '未找到该内容' });
    return;
  }
  res.json({ success: true, data: row });
});

// 通过URL添加图片(管理员)
router.post('/gallery/url', requireAdmin, async (req: Request, res: Response) => {
  const { url, title, categoryId } = req.body as { url: string; title?: string; categoryId?: string };

  if (!url || !url.trim()) {
    res.status(400).json({ success: false, error: '图片URL必填' });
    return;
  }

  const db = getDb();
  const id = randomUUID();
  const safeTitle = title?.trim() || '图片';

  db.prepare(
    'INSERT INTO gallery_item (id, type, url, thumbnail, title, category_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, 'image', url.trim(), url.trim(), safeTitle, categoryId || null);

  const item = db
    .prepare('SELECT id, type, url, thumbnail, title, category_id as categoryId FROM gallery_item WHERE id = ?')
    .get(id) as GalleryItem;

  res.json({ success: true, data: item });
});

// 上传本地图片(管理员)
router.post('/gallery/upload', requireAdmin, upload.single('image'), (req: Request, res: Response) => {
  const file = req.file;
  const { title, categoryId } = req.body as { title?: string; categoryId?: string };

  if (!file) {
    res.status(400).json({ success: false, error: '请选择图片文件' });
    return;
  }

  const db = getDb();
  const id = randomUUID();
  const safeTitle = title?.trim() || '上传图片';
  const filePath = `/uploads/${file.filename}`;

  db.prepare(
    'INSERT INTO gallery_item (id, type, url, thumbnail, title, category_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, 'image', filePath, filePath, safeTitle, categoryId || null);

  const item = db
    .prepare('SELECT id, type, url, thumbnail, title, category_id as categoryId FROM gallery_item WHERE id = ?')
    .get(id) as GalleryItem;

  res.json({ success: true, data: item });
});

// 删除图片(管理员)
router.delete('/gallery/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const item = db
    .prepare('SELECT url FROM gallery_item WHERE id = ?')
    .get(id) as { url: string } | undefined;

  if (!item) {
    res.status(404).json({ success: false, error: '未找到该内容' });
    return;
  }

  if (item.url.startsWith('/uploads/')) {
    const fileName = item.url.replace('/uploads/', '');
    const filePath = path.join(uploadDir, fileName);
    fs.unlink(filePath, () => {});
  }

  db.prepare('DELETE FROM gallery_item WHERE id = ?').run(id);
  res.json({ success: true });
});

// 分配内容到分类
router.post('/gallery/:id/category', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { categoryId } = req.body as { categoryId: string };
  const db = getDb();
  db.prepare('UPDATE gallery_item SET category_id = ? WHERE id = ?').run(categoryId, id);
  res.json({ success: true });
});

// 更新单项（标题、标题颜色、标题样式、分类）
router.put('/gallery/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, titleColor, titleStyle, categoryId } = req.body as {
    title?: string;
    titleColor?: string | null;
    titleStyle?: string | null;
    categoryId?: string | null;
  };
  const db = getDb();

  const fields: string[] = [];
  const values: (string | null)[] = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (titleColor !== undefined) { fields.push('title_color = ?'); values.push(titleColor ?? null); }
  if (titleStyle !== undefined) { fields.push('title_style = ?'); values.push(titleStyle ?? null); }
  if (categoryId !== undefined) { fields.push('category_id = ?'); values.push(categoryId || null); }

  if (fields.length === 0) {
    res.status(400).json({ success: false, error: '没有需要更新的字段' });
    return;
  }

  values.push(id);
  db.prepare(`UPDATE gallery_item SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const row = db
    .prepare('SELECT id, type, url, thumbnail, title, title_color as titleColor, title_style as titleStyle, category_id as categoryId FROM gallery_item WHERE id = ?')
    .get(id) as GalleryItem | undefined;
  res.json({ success: true, data: row });
});

// 批量操作（删除、设置分类、设置标题样式）
router.post('/gallery/batch', requireAdmin, (req: Request, res: Response) => {
  const { ids, action, categoryId, titleColor, titleStyle } = req.body as {
    ids: string[];
    action: 'delete' | 'category' | 'style';
    categoryId?: string;
    titleColor?: string | null;
    titleStyle?: string | null;
  };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '请选择至少一项' });
    return;
  }

  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');

  if (action === 'delete') {
    // 删除本地上传文件
    const items = db.prepare(`SELECT url FROM gallery_item WHERE id IN (${placeholders})`).all(...ids) as { url: string }[];
    for (const item of items) {
      if (item.url.startsWith('/uploads/')) {
        const fileName = item.url.replace('/uploads/', '');
        fs.unlink(path.join(uploadDir, fileName), () => {});
      }
    }
    db.prepare(`DELETE FROM gallery_item WHERE id IN (${placeholders})`).run(...ids);
    res.json({ success: true, data: { deleted: ids.length } });
  } else if (action === 'category') {
    if (!categoryId) {
      res.status(400).json({ success: false, error: '请选择分类' });
      return;
    }
    db.prepare(`UPDATE gallery_item SET category_id = ? WHERE id IN (${placeholders})`).run(categoryId, ...ids);
    res.json({ success: true, data: { updated: ids.length } });
  } else if (action === 'style') {
    const fields: string[] = [];
    const values: (string | null)[] = [];
    if (titleColor !== undefined) { fields.push('title_color = ?'); values.push(titleColor ?? null); }
    if (titleStyle !== undefined) { fields.push('title_style = ?'); values.push(titleStyle ?? null); }
    if (fields.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }
    values.push(...ids);
    db.prepare(`UPDATE gallery_item SET ${fields.join(', ')} WHERE id IN (${placeholders})`).run(...values);
    res.json({ success: true, data: { updated: ids.length } });
  } else {
    res.status(400).json({ success: false, error: '不支持的操作' });
  }
});

export default router;
