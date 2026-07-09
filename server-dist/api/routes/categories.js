/**
 * 相册分类路由
 */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
const router = Router();
// 获取分类列表(含每类内容数量)
router.get('/categories', (_req, res) => {
    const db = getDb();
    const rows = db
        .prepare(`SELECT c.id, c.name,
        (SELECT COUNT(*) FROM gallery_item g WHERE g.category_id = c.id) as count
       FROM category c ORDER BY c.created_at ASC`)
        .all();
    res.json({ success: true, data: rows });
});
// 创建分类
router.post('/categories', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        res.status(400).json({ success: false, error: '分类名称必填' });
        return;
    }
    const id = randomUUID();
    const db = getDb();
    db.prepare('INSERT INTO category (id, name) VALUES (?, ?)').run(id, name.trim());
    res.json({ success: true, data: { id, name: name.trim(), count: 0 } });
});
// 更新分类
router.put('/categories/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
        res.status(400).json({ success: false, error: '分类名称必填' });
        return;
    }
    const db = getDb();
    db.prepare('UPDATE category SET name = ? WHERE id = ?').run(name.trim(), id);
    res.json({ success: true });
});
// 删除分类
router.delete('/categories/:id', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    db.prepare('DELETE FROM category WHERE id = ?').run(id);
    res.json({ success: true });
});
export default router;
