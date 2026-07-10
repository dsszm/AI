/**
 * 系统监控页面：CPU/内存/后台任务实时监控
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  Clock,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Server,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemStats {
  cpu: {
    percent: number;
    cores: number;
    model: string;
    loadAvg1: string;
    loadAvg5: string;
    loadAvg15: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  uptime: number;
  platform: string;
  nodeVersion: string;
  hostname: string;
  pid: number;
}

interface TaskResult {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  duration: number;
  timestamp: string;
}

interface TaskConfig {
  name: string;
  interval: number;
  lastRun: string | null;
  nextRun: string | null;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}天${h}时${m}分`;
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
}

function formatInterval(ms: number): string {
  if (ms >= 3600000) return `${ms / 3600000}小时`;
  if (ms >= 60000) return `${ms / 60000}分钟`;
  return `${ms / 1000}秒`;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export default function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [tasks, setTasks] = useState<TaskResult[]>([]);
  const [taskConfig, setTaskConfig] = useState<TaskConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('console_auth_token');
      const res = await fetch('/api/monitor/system', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem('console_auth_token');
      const res = await fetch('/api/monitor/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.history);
        setTaskConfig(data.data.config);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchTasks()]);
    setLoading(false);
  }, [fetchStats, fetchTasks]);

  const runTasksNow = async () => {
    setRunLoading(true);
    try {
      const token = localStorage.getItem('console_auth_token');
      const res = await fetch('/api/monitor/tasks/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to run tasks:', err);
    } finally {
      setRunLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  const cpuColor = stats && stats.cpu.percent > 80 ? 'bg-red-500' : stats && stats.cpu.percent > 50 ? 'bg-orange-500' : 'bg-green-500';
  const memColor = stats && stats.memory.percent > 80 ? 'bg-red-500' : stats && stats.memory.percent > 50 ? 'bg-orange-500' : 'bg-brand-accent';

  return (
    <div className="h-full overflow-y-auto scroll-thin">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center shadow-[0_0_12px_rgba(16,163,127,0.3)]">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">系统监控</h1>
              <p className="text-xs text-slate-500">CPU、内存与后台任务实时监控</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all',
                autoRefresh
                  ? 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent'
                  : 'bg-surface-card/60 border-white/[0.06] text-slate-400 hover:text-white'
              )}
            >
              {autoRefresh ? <Zap size={14} /> : <Clock size={14} />}
              {autoRefresh ? '自动刷新(3s)' : '已暂停'}
            </button>
            <button
              onClick={refreshAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card/60 border border-white/[0.06] text-slate-400 hover:text-white transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>

        {/* 实时指标卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* CPU */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 border border-white/[0.06]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                <Cpu size={18} className="text-brand-accent" />
              </div>
              <span className="text-[10px] text-slate-500">CPU</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {stats ? `${stats.cpu.percent}%` : '--'}
            </div>
            <div className="text-[10px] text-slate-500 mb-3">
              {stats ? `${stats.cpu.cores}核 · ${stats.cpu.model.slice(0, 20)}` : '加载中...'}
            </div>
            <ProgressBar value={stats?.cpu.percent || 0} color={cpuColor} />
            <div className="flex justify-between mt-2 text-[10px] text-slate-600">
              <span>1min: {stats?.cpu.loadAvg1 || '--'}</span>
              <span>5min: {stats?.cpu.loadAvg5 || '--'}</span>
              <span>15min: {stats?.cpu.loadAvg15 || '--'}</span>
            </div>
          </motion.div>

          {/* 内存 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-4 border border-white/[0.06]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <MemoryStick size={18} className="text-blue-400" />
              </div>
              <span className="text-[10px] text-slate-500">内存</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {stats ? `${stats.memory.percent}%` : '--'}
            </div>
            <div className="text-[10px] text-slate-500 mb-3">
              {stats ? `${stats.memory.used}MB / ${stats.memory.total}MB` : '加载中...'}
            </div>
            <ProgressBar value={stats?.memory.percent || 0} color={memColor} />
            <div className="flex justify-between mt-2 text-[10px] text-slate-600">
              <span>已用: {stats?.memory.used || '--'}MB</span>
              <span>空闲: {stats?.memory.free || '--'}MB</span>
            </div>
          </motion.div>

          {/* 运行时间 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-4 border border-white/[0.06]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Clock size={18} className="text-green-400" />
              </div>
              <span className="text-[10px] text-slate-500">运行时间</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {stats ? formatUptime(stats.uptime) : '--'}
            </div>
            <div className="text-[10px] text-slate-500">
              {stats ? `主机: ${stats.hostname}` : '加载中...'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {stats ? `Node ${stats.nodeVersion} · PID ${stats.pid}` : ''}
            </div>
          </motion.div>

          {/* 系统 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card rounded-2xl p-4 border border-white/[0.06]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Server size={18} className="text-purple-400" />
              </div>
              <span className="text-[10px] text-slate-500">系统</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1 capitalize">
              {stats ? stats.platform : '--'}
            </div>
            <div className="text-[10px] text-slate-500">
              {stats ? `${stats.cpu.cores} 核 CPU` : '加载中...'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              后台任务: {taskConfig.length} 个
            </div>
          </motion.div>
        </div>

        {/* 后台任务 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5 border border-white/[0.06] mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-brand-accent" />
              <h2 className="text-sm font-semibold text-white">后台任务调度</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent">
                {taskConfig.length} 个任务
              </span>
            </div>
            <button
              onClick={runTasksNow}
              disabled={runLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-xs hover:bg-brand-accent/20 transition-all disabled:opacity-50"
            >
              <Play size={12} className={runLoading ? 'animate-spin' : ''} />
              {runLoading ? '执行中...' : '立即执行全部'}
            </button>
          </div>

          {/* 任务配置 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {taskConfig.map((task) => {
              const lastResult = tasks.find((t) => t.name === task.name);
              return (
                <div
                  key={task.name}
                  className="p-3 rounded-xl bg-surface-card/40 border border-white/[0.04]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white">{task.name}</span>
                    {lastResult && (
                      <>
                        {lastResult.status === 'success' && <CheckCircle2 size={14} className="text-green-400" />}
                        {lastResult.status === 'error' && <XCircle size={14} className="text-red-400" />}
                        {lastResult.status === 'skipped' && <AlertCircle size={14} className="text-orange-400" />}
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mb-1">
                    间隔: {formatInterval(task.interval)}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {task.lastRun ? `上次: ${new Date(task.lastRun).toLocaleTimeString('zh-CN')}` : '未执行'}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {task.nextRun ? `下次: ${new Date(task.nextRun).toLocaleTimeString('zh-CN')}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 任务历史 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card rounded-2xl p-5 border border-white/[0.06]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-brand-accent" />
            <h2 className="text-sm font-semibold text-white">任务执行历史</h2>
            <span className="text-[10px] text-slate-500">最近 {tasks.length} 条</span>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              暂无任务执行记录
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
              {tasks.map((task, i) => (
                <div
                  key={`${task.name}-${task.timestamp}-${i}`}
                  className="flex items-start gap-3 p-3 rounded-xl bg-surface-card/40 border border-white/[0.04] hover:bg-surface-card/60 transition-colors"
                >
                  <div className="shrink-0 mt-0.5">
                    {task.status === 'success' && <CheckCircle2 size={16} className="text-green-400" />}
                    {task.status === 'error' && <XCircle size={16} className="text-red-400" />}
                    {task.status === 'skipped' && <AlertCircle size={16} className="text-orange-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-white">{task.name}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded',
                          task.status === 'success' && 'bg-green-500/15 text-green-400',
                          task.status === 'error' && 'bg-red-500/15 text-red-400',
                          task.status === 'skipped' && 'bg-orange-500/15 text-orange-400'
                        )}
                      >
                        {task.status === 'success' ? '成功' : task.status === 'error' ? '失败' : '跳过'}
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {task.duration}ms
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(task.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{task.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
