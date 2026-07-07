/**
 * 对话会话与消息持久化服务
 */
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
import type { ChatMessage, ModelId } from '../../shared/types.js';

export interface SessionRow {
  id: string;
  title: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  images: string | null;
  created_at: string;
}

export function createSession(title?: string, ip?: string, userName?: string): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    'INSERT INTO session (id, title, user_ip, user_name) VALUES (?, ?, ?, ?)'
  ).run(id, title || '新对话', ip || null, userName || null);
  return id;
}

export function getSessions(): SessionRow[] {
  const db = getDb();
  return db
    .prepare('SELECT id, title, created_at FROM session ORDER BY created_at DESC LIMIT 50')
    .all() as SessionRow[];
}

export function getMessages(sessionId: string): MessageRow[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM message WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId) as MessageRow[];
}

export function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  model?: ModelId,
  images?: string[]
): void {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    'INSERT INTO message (id, session_id, role, content, model, images) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, sessionId, role, content, model || null, images ? JSON.stringify(images) : null);
}

export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM session WHERE id = ?').run(sessionId);
}

export function updateSessionTitle(sessionId: string, title: string): void {
  const db = getDb();
  db.prepare('UPDATE session SET title = ? WHERE id = ?').run(title, sessionId);
}

/**
 * 把数据库消息行转换为 AI 调用所需的 ChatMessage
 */
export function toChatMessages(rows: MessageRow[]): ChatMessage[] {
  return rows.map((r) => {
    const msg: ChatMessage = { role: r.role, content: r.content };
    if (r.images) {
      try {
        msg.images = JSON.parse(r.images);
      } catch {
        // 忽略解析错误
      }
    }
    return msg;
  });
}
