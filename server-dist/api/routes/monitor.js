/**
 * 系统监控 API 路由（仅管理员）
 */
import { Router } from 'express';
import { getSystemStats } from '../services/monitorService.js';
import { getTaskHistory, getTaskConfig, runAllTasksNow, } from '../services/backgroundTaskService.js';
const router = Router();
/**
 * 获取系统监控数据（CPU/内存/运行时间等）
 */
router.get('/monitor/system', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可访问' });
        return;
    }
    const stats = getSystemStats();
    res.json({ success: true, data: stats });
});
/**
 * 获取后台任务历史记录
 */
router.get('/monitor/tasks', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可访问' });
        return;
    }
    const history = getTaskHistory();
    const config = getTaskConfig();
    res.json({ success: true, data: { history, config } });
});
/**
 * 手动触发所有后台任务
 */
router.post('/monitor/tasks/run', (req, res) => {
    const authUser = req.authUser;
    if (!authUser || !authUser.isAdmin) {
        res.status(403).json({ success: false, error: '仅管理员可访问' });
        return;
    }
    runAllTasksNow();
    const history = getTaskHistory();
    res.json({ success: true, data: history.slice(0, 6), message: '任务已触发' });
});
export default router;
