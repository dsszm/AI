/**
 * AI 使用量记录服务
 */
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';

export type UsageType = 'chat' | 'image_gen';

/**
 * 记录一次 AI 使用
 */
export function logUsage(
  userEmail: string,
  type: UsageType,
  model: string,
  prompt: string,
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO usage_log (id, user_email, type, model, prompt_preview)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    userEmail,
    type,
    model,
    prompt.slice(0, 200),
  );
}

/**
 * 获取所有用户的使用量统计
 */
export function getUsageStats(): Array<{
  user_email: string;
  chat_count: number;
  image_count: number;
  total_count: number;
  last_used: string;
}> {
  const db = getDb();
  return db.prepare(
    `SELECT
       user_email,
       SUM(CASE WHEN type = 'chat' THEN 1 ELSE 0 END) as chat_count,
       SUM(CASE WHEN type = 'image_gen' THEN 1 ELSE 0 END) as image_count,
       COUNT(*) as total_count,
       MAX(created_at) as last_used
     FROM usage_log
     GROUP BY user_email
     ORDER BY total_count DESC`
  ).all() as Array<{
    user_email: string;
    chat_count: number;
    image_count: number;
    total_count: number;
    last_used: string;
  }>;
}

/**
 * 获取某个用户的最近使用记录
 */
export function getUserUsage(
  email: string,
  limit = 50,
): Array<{
  id: string;
  type: UsageType;
  model: string;
  prompt_preview: string;
  created_at: string;
}> {
  const db = getDb();
  return db.prepare(
    `SELECT id, type, model, prompt_preview, created_at
     FROM usage_log
     WHERE user_email = ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).all(email, limit) as Array<{
    id: string;
    type: UsageType;
    model: string;
    prompt_preview: string;
    created_at: string;
  }>;
}
