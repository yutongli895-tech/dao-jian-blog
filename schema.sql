-- =====================
-- dao-jian-blog 数据库结构
-- =====================

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_cn TEXT NOT NULL,
  title_en TEXT NOT NULL,
  excerpt_cn TEXT NOT NULL,
  excerpt_en TEXT NOT NULL,
  content_cn TEXT NOT NULL,
  content_en TEXT NOT NULL,
  category_cn TEXT NOT NULL,
  category_en TEXT NOT NULL,
  image TEXT NOT NULL,
  date TEXT NOT NULL,
  published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 注意：管理员用户通过 server.ts 启动时自动创建/更新
-- 密码由环境变量 ADMIN_PASSWORD 控制，不在此处硬编码

-- =====================
-- 索引优化
-- =====================

CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_cn ON posts(category_cn);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
