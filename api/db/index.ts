/**
 * SQLite 数据库连接与初始化
 * 存储:相册分类、对话历史、API Key 加密配置、用户访问记录
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'console.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // 确保数据目录存在
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  seedData(db);
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gallery_item (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('image','video')),
      url TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      title TEXT,
      category_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery_item(category_id);
    CREATE INDEX IF NOT EXISTS idx_gallery_type ON gallery_item(type);

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      user_ip TEXT,
      user_name TEXT
    );

    CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      model TEXT,
      images TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_message_session ON message(session_id);

    CREATE TABLE IF NOT EXISTS key_config (
      model TEXT PRIMARY KEY,
      encrypted_key TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_meta (
      session_id TEXT PRIMARY KEY,
      ip TEXT,
      user_name TEXT,
      access_count INTEGER DEFAULT 0,
      flagged INTEGER DEFAULT 0,
      last_request_at TEXT,
      FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      nickname TEXT,
      is_banned INTEGER DEFAULT 0,
      ban_reason TEXT,
      banned_at TEXT,
      banned_by TEXT,
      last_login_at TEXT,
      login_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned);

    CREATE TABLE IF NOT EXISTS usage_log (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('chat','image_gen')),
      model TEXT NOT NULL,
      prompt_preview TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_usage_email ON usage_log(user_email);
    CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_log(created_at);
  `);
}

function seedData(database: Database.Database) {
  const hasDefault = database.prepare('SELECT 1 FROM category WHERE id = ?').get('default');
  if (!hasDefault) {
    database.prepare('INSERT INTO category (id, name) VALUES (?, ?, CURRENT_TIMESTAMP)').run('default', '默认分类');
  }

  const demoIds = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
  const existingDemo = database.prepare('SELECT id FROM gallery_item WHERE id IN (?, ?, ?, ?, ?, ?, ?, ?)').get(...demoIds);
  if (!existingDemo) {
    const stmt = database.prepare(
      'INSERT INTO gallery_item (id, type, url, thumbnail, title, category_id) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const samples: Array<{ id: string; type: 'image'; title: string; category: string }> = [
      { id: 'g1', type: 'image', title: '城市夜景', category: 'default' },
      { id: 'g2', type: 'image', title: '山川风光', category: 'default' },
      { id: 'g3', type: 'image', title: '科技图示', category: 'default' },
      { id: 'g4', type: 'image', title: '数据图表', category: 'default' },
      { id: 'g5', type: 'image', title: '建筑结构', category: 'default' },
      { id: 'g6', type: 'image', title: '自然纹理', category: 'default' },
      { id: 'g7', type: 'image', title: '抽象艺术', category: 'default' },
      { id: 'g8', type: 'image', title: '产品样图', category: 'default' },
    ];
    for (const s of samples) {
      const seed = encodeURIComponent(s.title);
      stmt.run(
        s.id,
        s.type,
        `https://picsum.photos/seed/${seed}/1200/800`,
        `https://picsum.photos/seed/${seed}/400/300`,
        s.title,
        s.category
      );
    }
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
