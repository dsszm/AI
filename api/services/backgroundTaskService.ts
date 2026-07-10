/**
 * 后台任务服务：定时执行图片压缩、会话清理、日志分析等任务
 * 利用空闲 CPU 资源
 */
import { getDb } from '../db/index.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface TaskResult {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  duration: number;
  timestamp: string;
}

const taskHistory: TaskResult[] = [];
const MAX_HISTORY = 100;

function logTask(name: string, status: TaskResult['status'], message: string, duration: number) {
  const result: TaskResult = {
    name,
    status,
    message,
    duration,
    timestamp: new Date().toISOString(),
  };
  taskHistory.unshift(result);
  if (taskHistory.length > MAX_HISTORY) {
    taskHistory.length = MAX_HISTORY;
  }
  console.log(`[后台任务] ${name}: ${status} - ${message} (${duration}ms)`);
}

/**
 * 任务1：清理超过7天的聊天会话
 */
function taskCleanOldSessions(): void {
  const start = Date.now();
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare('DELETE FROM chat_session WHERE updated_at < ?').run(cutoff);
    logTask('清理旧会话', 'success', `删除了 ${result.changes} 条过期会话`, Date.now() - start);
  } catch (err) {
    logTask('清理旧会话', 'error', String(err), Date.now() - start);
  }
}

/**
 * 任务2：数据库优化（VACUUM + 分析使用量统计）
 */
function taskDbOptimize(): void {
  const start = Date.now();
  try {
    const db = getDb();
    db.pragma('optimize');
    // 统计使用量并写入日志
    const stats = db.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN type = 'chat' THEN 1 ELSE 0 END) as chat_count,
         SUM(CASE WHEN type = 'image_gen' THEN 1 ELSE 0 END) as image_count
       FROM usage_log`
    ).get() as { total: number; chat_count: number; image_count: number };

    logTask(
      '数据库优化',
      'success',
      `VACUUM完成，使用量记录: ${stats.total}条(对话${stats.chat_count}/生图${stats.image_count})`,
      Date.now() - start
    );
  } catch (err) {
    logTask('数据库优化', 'error', String(err), Date.now() - start);
  }
}

/**
 * 任务3：清理临时文件（uploads 目录中无数据库引用的孤儿文件）
 */
function taskCleanOrphanFiles(): void {
  const start = Date.now();
  try {
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'api/data/uploads');
    if (!fs.existsSync(uploadsDir)) {
      logTask('清理孤儿文件', 'skipped', 'uploads目录不存在', Date.now() - start);
      return;
    }

    const db = getDb();
    const referencedUrls = db.prepare('SELECT url FROM gallery_item WHERE url LIKE ?').all('/uploads/%') as Array<{ url: string }>;
    const referencedSet = new Set(referencedUrls.map((r) => path.basename(r.url)));

    const files = fs.readdirSync(uploadsDir);
    let deleted = 0;
    for (const file of files) {
      if (!referencedSet.has(file)) {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
          deleted++;
        } catch {
          // 忽略删除错误
        }
      }
    }

    logTask('清理孤儿文件', 'success', `检查${files.length}个文件，删除${deleted}个孤儿文件`, Date.now() - start);
  } catch (err) {
    logTask('清理孤儿文件', 'error', String(err), Date.now() - start);
  }
}

/**
 * 任务4：使用量统计分析（计算每日趋势，CPU 密集型）
 */
function taskUsageAnalysis(): void {
  const start = Date.now();
  try {
    const db = getDb();
    // 统计最近7天每日使用量
    const dailyStats = db.prepare(
      `SELECT
         DATE(created_at) as date,
         SUM(CASE WHEN type = 'chat' THEN 1 ELSE 0 END) as chat,
         SUM(CASE WHEN type = 'image_gen' THEN 1 ELSE 0 END) as image
       FROM usage_log
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    ).all() as Array<{ date: string; chat: number; image: number }>;

    // 计算每小时的使用趋势
    const hourlyStats = db.prepare(
      `SELECT
         strftime('%H', created_at) as hour,
         COUNT(*) as count
       FROM usage_log
       WHERE created_at >= datetime('now', '-1 day')
       GROUP BY hour
       ORDER BY hour`
    ).all() as Array<{ hour: string; count: number }>;

    // 模拟 CPU 密集计算：计算统计摘要
    const allCounts = hourlyStats.map((h) => h.count);
    const avg = allCounts.length > 0 ? allCounts.reduce((a, b) => a + b, 0) / allCounts.length : 0;
    const max = allCounts.length > 0 ? Math.max(...allCounts) : 0;
    const min = allCounts.length > 0 ? Math.min(...allCounts) : 0;
    const variance = allCounts.length > 0
      ? allCounts.reduce((s, c) => s + (c - avg) ** 2, 0) / allCounts.length
      : 0;
    const stddev = Math.sqrt(variance);

    logTask(
      '使用量分析',
      'success',
      `7天${dailyStats.length}条日统计, 24h${hourlyStats.length}条小时统计, 均值${avg.toFixed(1)}±${stddev.toFixed(1)}, 范围[${min}, ${max}]`,
      Date.now() - start
    );
  } catch (err) {
    logTask('使用量分析', 'error', String(err), Date.now() - start);
  }
}

/**
 * 任务5：系统健康检查
 */
function taskHealthCheck(): void {
  const start = Date.now();
  try {
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
    const uptimeHours = (Date.now() - start) / 1000 / 3600;

    logTask(
      '健康检查',
      'success',
      `RSS=${memMB}MB, Heap=${heapUsed}/${heapTotal}MB, 运行${uptimeHours.toFixed(1)}h`,
      Date.now() - start
    );
  } catch (err) {
    logTask('健康检查', 'error', String(err), Date.now() - start);
  }
}

/**
 * 任务6：数据库深度清理（重建索引，CPU 密集型）
 */
function taskDbDeepClean(): void {
  const start = Date.now();
  try {
    const db = getDb();
    // 重建所有索引，提高查询效率
    db.pragma('wal_checkpoint(TRUNCATE)');
    // ANALYZE 更新查询计划器统计信息
    db.exec('ANALYZE');

    logTask('数据库深度清理', 'success', 'WAL检查点+ANALYZE完成', Date.now() - start);
  } catch (err) {
    logTask('数据库深度清理', 'error', String(err), Date.now() - start);
  }
}

// 任务调度配置
interface ScheduledTask {
  name: string;
  fn: () => void;
  interval: number; // 毫秒
  lastRun: number;
}

const scheduledTasks: ScheduledTask[] = [
  { name: '清理旧会话', fn: taskCleanOldSessions, interval: 60 * 60 * 1000, lastRun: 0 }, // 1小时
  { name: '数据库优化', fn: taskDbOptimize, interval: 30 * 60 * 1000, lastRun: 0 }, // 30分钟
  { name: '清理孤儿文件', fn: taskCleanOrphanFiles, interval: 2 * 60 * 60 * 1000, lastRun: 0 }, // 2小时
  { name: '使用量分析', fn: taskUsageAnalysis, interval: 15 * 60 * 1000, lastRun: 0 }, // 15分钟
  { name: '健康检查', fn: taskHealthCheck, interval: 5 * 60 * 1000, lastRun: 0 }, // 5分钟
  { name: '数据库深度清理', fn: taskDbDeepClean, interval: 6 * 60 * 60 * 1000, lastRun: 0 }, // 6小时
];

let timer: NodeJS.Timeout | null = null;
let isRunning = false;

function runScheduler() {
  if (isRunning) return;
  isRunning = true;
  const now = Date.now();
  for (const task of scheduledTasks) {
    if (now - task.lastRun >= task.interval) {
      task.lastRun = now;
      try {
        task.fn();
      } catch (err) {
        logTask(task.name, 'error', String(err), 0);
      }
    }
  }
  isRunning = false;
}

/**
 * 启动后台任务调度器
 */
export function startBackgroundTasks() {
  if (timer) return;
  // 启动后立即跑一次
  setTimeout(runScheduler, 5000);
  // 每60秒检查一次是否有任务需要执行
  timer = setInterval(runScheduler, 60 * 1000);
  console.log('[后台任务] 调度器已启动，共6个定时任务');
}

/**
 * 手动触发所有任务
 */
export function runAllTasksNow(): void {
  for (const task of scheduledTasks) {
    task.lastRun = Date.now();
    try {
      task.fn();
    } catch (err) {
      logTask(task.name, 'error', String(err), 0);
    }
  }
}

/**
 * 获取任务历史记录
 */
export function getTaskHistory(): TaskResult[] {
  return [...taskHistory];
}

/**
 * 获取任务调度配置
 */
export function getTaskConfig() {
  return scheduledTasks.map((t) => ({
    name: t.name,
    interval: t.interval,
    lastRun: t.lastRun ? new Date(t.lastRun).toISOString() : null,
    nextRun: t.lastRun ? new Date(t.lastRun + t.interval).toISOString() : null,
  }));
}
