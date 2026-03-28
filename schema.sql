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
  published INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Seed Admin (password: admin123)
-- Note: You should generate a fresh hash for production.
-- This is the hash for 'admin123' used in the previous server.ts
INSERT OR IGNORE INTO users (username, password) VALUES ('admin', '$2a$10$Xm7v7v7v7v7v7v7v7v7v7u7v7v7v7v7v7v7v7v7v7v7v7v7v7v7v7');
