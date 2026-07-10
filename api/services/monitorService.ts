/**
 * 系统监控服务：采集 CPU、内存、磁盘、运行时间等指标
 */
import os from 'os';
import fs from 'fs';

let prevCpu: { idle: number; total: number } | null = null;

function cpuSnapshot(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.irq + t.idle;
  }
  return { idle, total };
}

/**
 * 获取 CPU 使用率（百分比），基于两次调用间的差值
 */
export function getCpuUsage(): number {
  const cur = cpuSnapshot();
  if (!prevCpu) {
    prevCpu = cur;
    return 0;
  }
  const idleDiff = cur.idle - prevCpu.idle;
  const totalDiff = cur.total - prevCpu.total;
  prevCpu = cur;
  if (totalDiff === 0) return 0;
  return Math.round((1 - idleDiff / totalDiff) * 100);
}

/**
 * 获取内存使用情况
 */
export function getMemoryInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    total: Math.round(total / 1024 / 1024), // MB
    used: Math.round(used / 1024 / 1024),
    free: Math.round(free / 1024 / 1024),
    percent: Math.round((used / total) * 100),
  };
}

/**
 * 获取磁盘使用情况
 */
export function getDiskInfo() {
  try {
    const stat = fs.statSync(process.cwd());
    // 使用 du 风格的估算：读取 /proc/mounts 获取根分区
    const mounts = fs.readFileSync('/proc/mounts', 'utf-8');
    const lines = mounts.split('\n');
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts[1] === '/') {
        // 通过 statvfs 系统调用获取磁盘信息不可用，用 df 替代
        break;
      }
    }
    // 使用 Node.js fs.availableSpaceSync 如果可用，否则回退
    return {
      total: 0,
      used: 0,
      free: 0,
      percent: 0,
      note: 'disk info requires shell access',
    };
  } catch {
    return { total: 0, used: 0, free: 0, percent: 0, note: 'unavailable' };
  }
}

/**
 * 获取系统运行时间（秒）
 */
export function getUptime(): number {
  return Math.floor(os.uptime());
}

/**
 * 获取系统概览
 */
export function getSystemStats() {
  const cpuPercent = getCpuUsage();
  const mem = getMemoryInfo();
  const loadAvg = os.loadavg();
  return {
    cpu: {
      percent: cpuPercent,
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'unknown',
      loadAvg1: loadAvg[0].toFixed(2),
      loadAvg5: loadAvg[1].toFixed(2),
      loadAvg15: loadAvg[2].toFixed(2),
    },
    memory: mem,
    uptime: getUptime(),
    platform: process.platform,
    nodeVersion: process.version,
    hostname: os.hostname(),
    pid: process.pid,
  };
}
