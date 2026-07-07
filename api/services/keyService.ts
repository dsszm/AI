/**
 * API Key 管理:加密存储 / 会话内存存储
 * - persist=true: AES 加密后写入 key_config 表
 * - persist=false: 仅存于服务端会话内存,刷新后失效
 */
import crypto from 'crypto';
import { getDb } from '../db/index.js';
import type { ModelId, KeyStatus } from '../../shared/types.js';
import { MODELS } from '../config/models.js';

// 加密密钥(生产环境应通过环境变量配置)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'console-default-encryption-key-32b!';
const ALGORITHM = 'aes-256-cbc';

// 会话内存中的临时 Key(不持久化)
const sessionKeys = new Map<string, string>();

export function encrypt(text: string): string {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encrypted: string): string {
  try {
    const [ivHex, data] = encrypted.split(':');
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

/**
 * 保存某模型的 API Key
 */
export function saveKey(model: ModelId, apiKey: string, persist: boolean): void {
  if (persist) {
    const db = getDb();
    const encrypted = encrypt(apiKey);
    db.prepare(
      `INSERT INTO key_config (model, encrypted_key) VALUES (?, ?)
       ON CONFLICT(model) DO UPDATE SET encrypted_key = excluded.encrypted_key, created_at = CURRENT_TIMESTAMP`
    ).run(model, encrypted);
    // 同步写入会话缓存
    sessionKeys.set(model, apiKey);
  } else {
    // 仅会话内存,清除持久化记录
    const db = getDb();
    db.prepare('DELETE FROM key_config WHERE model = ?').run(model);
    sessionKeys.set(model, apiKey);
  }
}

/**
 * 获取某模型可用的 API Key(优先会话内存,其次加密存储,最后管理员默认 Key)
 */
export function getApiKey(model: ModelId): string | null {
  // 1. 会话内存
  const sessionKey = sessionKeys.get(model);
  if (sessionKey) return sessionKey;

  // 2. 加密存储
  const db = getDb();
  const row = db.prepare('SELECT encrypted_key FROM key_config WHERE model = ?').get(model) as
    | { encrypted_key: string }
    | undefined;
  if (row) {
    const decrypted = decrypt(row.encrypted_key);
    if (decrypted) {
      sessionKeys.set(model, decrypted);
      return decrypted;
    }
  }

  // 3. 通义千问管理员默认 Key
  if (model === 'qwen') {
    const adminKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    if (adminKey) return adminKey;
  }

  return null;
}

/**
 * 获取所有模型的配置状态(不返回明文)
 */
export function getKeyStatuses(): KeyStatus[] {
  const db = getDb();
  return MODELS.map((m) => {
    const configured = isConfigured(m.id, db);
    return {
      model: m.id,
      name: m.name,
      configured,
      defaultEnabled: m.defaultEnabled,
    };
  });
}

function isConfigured(model: ModelId, db: ReturnType<typeof getDb>): boolean {
  if (sessionKeys.has(model)) return true;
  const row = db.prepare('SELECT 1 FROM key_config WHERE model = ?').get(model);
  if (row) return true;
  // 通义千问有管理员默认 Key 也算已配置
  if (model === 'qwen' && (process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY)) return true;
  return false;
}

/**
 * 删除某模型 Key
 */
export function deleteKey(model: ModelId): void {
  sessionKeys.delete(model);
  const db = getDb();
  db.prepare('DELETE FROM key_config WHERE model = ?').run(model);
}
