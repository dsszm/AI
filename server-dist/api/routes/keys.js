/**
 * 秘钥管理路由
 */
import { Router } from 'express';
import { getKeyStatuses, saveKey, deleteKey } from '../services/keyService.js';
const router = Router();
// 获取所有模型配置状态(不返回明文)
router.get('/keys', (_req, res) => {
    const statuses = getKeyStatuses();
    res.json({ success: true, data: statuses });
});
// 保存某模型 API Key
router.post('/keys', (req, res) => {
    const { model, apiKey, persist } = req.body;
    if (!model || !apiKey) {
        res.status(400).json({ success: false, error: 'model 与 apiKey 必填' });
        return;
    }
    const validModels = ['qwen', 'openai', 'deepseek', 'claude', 'gemini', 'glm', 'moonshot', 'doubao', 'spark'];
    if (!validModels.includes(model)) {
        res.status(400).json({ success: false, error: '不支持的模型' });
        return;
    }
    saveKey(model, apiKey, persist !== false);
    res.json({ success: true, data: { model, configured: true } });
});
// 删除某模型 Key
router.delete('/keys/:model', (req, res) => {
    const { model } = req.params;
    deleteKey(model);
    res.json({ success: true });
});
export default router;
