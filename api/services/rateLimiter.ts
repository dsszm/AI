/**
 * 通义千问限流:使用管理员 Key 时 5 秒冷却
 * 同时记录高频访问 IP / 用户名,在后台标红
 */
import { getDb } from '../db/index.js';
import { QWEN_COOLDOWN_MS } from '../config/models.js';

interface RateEntry {
  lastRequest: number;
  count: number;
}

const rateMap = new Map<string, RateEntry>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = rateMap.get(identifier);

  if (entry) {
    const elapsed = now - entry.lastRequest;
    if (elapsed < QWEN_COOLDOWN_MS) {
      return {
        allowed: false,
        retryAfterMs: QWEN_COOLDOWN_MS - elapsed,
      };
    }
    entry.lastRequest = now;
    entry.count += 1;
  } else {
    rateMap.set(identifier, { lastRequest: now, count: 1 });
  }

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * 记录用户访问(用于后台标红高频访问)
 * 短时间内访问次数过多则标记 flagged
 */
export function recordAccess(sessionId: string, ip: string, userName: string): void {
  const db = getDb();
  const now = Date.now();
  const windowMs = 60_000; // 1 分钟窗口
  const threshold = 10; // 1 分钟内超过 10 次标记为异常

  db.prepare(
    `INSERT INTO user_meta (session_id, ip, user_name, access_count, flagged, last_request_at)
     VALUES (?, ?, ?, 1, 0, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       access_count = access_count + 1,
       last_request_at = excluded.last_request_at`
  ).run(sessionId, ip, userName, new Date().toISOString());

  // 检查窗口内是否高频
  const recent = db
    .prepare(
      `SELECT last_request_at FROM user_meta WHERE session_id = ?`
    )
    .get(sessionId) as { last_request_at: string } | undefined;

  if (recent) {
    const lastTime = new Date(recent.last_request_at).getTime();
    if (now - lastTime < windowMs) {
      const meta = db
        .prepare('SELECT access_count FROM user_meta WHERE session_id = ?')
        .get(sessionId) as { access_count: number } | undefined;
      if (meta && meta.access_count >= threshold) {
        db.prepare('UPDATE user_meta SET flagged = 1 WHERE session_id = ?').run(sessionId);
      }
    } else {
      // 超出窗口,重置计数
      db.prepare('UPDATE user_meta SET access_count = 1 WHERE session_id = ?').run(sessionId);
    }
  }
}

/**
 * 获取标红的用户记录(后台管理用)
 */
export function getFlaggedUsers() {
  const db = getDb();
  return db
    .prepare('SELECT session_id, ip, user_name, access_count, last_request_at FROM user_meta WHERE flagged = 1')
    .all();
}
