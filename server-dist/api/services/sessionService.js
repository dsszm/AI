/**
 * 对话会话与消息持久化服务
 */
import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';
export function createSession(title, ip, userName) {
    const id = randomUUID();
    const db = getDb();
    db.prepare('INSERT INTO session (id, title, user_ip, user_name) VALUES (?, ?, ?, ?)').run(id, title || '新对话', ip || null, userName || null);
    return id;
}
export function getSessions() {
    const db = getDb();
    return db
        .prepare('SELECT id, title, created_at FROM session ORDER BY created_at DESC LIMIT 50')
        .all();
}
export function getMessages(sessionId) {
    const db = getDb();
    return db
        .prepare('SELECT * FROM message WHERE session_id = ? ORDER BY created_at ASC')
        .all(sessionId);
}
export function saveMessage(sessionId, role, content, model, images) {
    const db = getDb();
    const id = randomUUID();
    db.prepare('INSERT INTO message (id, session_id, role, content, model, images) VALUES (?, ?, ?, ?, ?, ?)').run(id, sessionId, role, content, model || null, images ? JSON.stringify(images) : null);
}
export function deleteSession(sessionId) {
    const db = getDb();
    db.prepare('DELETE FROM session WHERE id = ?').run(sessionId);
}
export function updateSessionTitle(sessionId, title) {
    const db = getDb();
    db.prepare('UPDATE session SET title = ? WHERE id = ?').run(title, sessionId);
}
/**
 * 把数据库消息行转换为 AI 调用所需的 ChatMessage
 */
export function toChatMessages(rows) {
    return rows.map((r) => {
        const msg = { role: r.role, content: r.content };
        if (r.images) {
            try {
                msg.images = JSON.parse(r.images);
            }
            catch {
                // 忽略解析错误
            }
        }
        return msg;
    });
}
