import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('dao_insight.db');
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dao-secret-key');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_cn TEXT,
    title_en TEXT,
    excerpt_cn TEXT,
    excerpt_en TEXT,
    content_cn TEXT,
    content_en TEXT,
    category_cn TEXT,
    category_en TEXT,
    image TEXT,
    date TEXT,
    published INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );
`);

// Seed Admin
const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
if (!admin) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
} else if (process.env.ADMIN_PASSWORD) {
  // Update password if environment variable is set
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hash, 'admin');
}

// Database helper to handle both local SQLite and Cloudflare D1
const queryDb = async (req: any, sql: string, params: any[] = [], type: 'all' | 'get' | 'run' = 'get') => {
  // Check if we are running on Cloudflare (D1 is usually on req.env.DB or process.env.DB)
  // Note: In Cloudflare Pages Functions, the env is often passed in the request context
  const cloudflareDb = (req as any).env?.DB || (process as any).env?.DB;

  if (cloudflareDb) {
    // Cloudflare D1 Logic
    const stmt = cloudflareDb.prepare(sql).bind(...params);
    if (type === 'all') {
      const { results } = await stmt.all();
      return results;
    }
    if (type === 'get') return await stmt.first();
    if (type === 'run') return await stmt.run();
  } else {
    // Local SQLite Logic (better-sqlite3)
    const stmt = db.prepare(sql);
    if (type === 'all') return stmt.all(...params);
    if (type === 'get') return stmt.get(...params);
    if (type === 'run') return stmt.run(...params);
  }
};

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      req.user = payload;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API Routes
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const user: any = await queryDb(req, 'SELECT * FROM users WHERE username = ?', [username], 'get');
      if (user && bcrypt.compareSync(password, user.password)) {
        const token = await new jose.SignJWT({ id: user.id, username: user.username })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(JWT_SECRET);
        res.json({ token });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Login error' });
    }
  });

  app.get('/api/posts', async (req, res) => {
    try {
      const posts = await queryDb(req, 'SELECT * FROM posts ORDER BY date DESC', [], 'all');
      res.json(posts);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/posts/:id', async (req, res) => {
    try {
      const post = await queryDb(req, 'SELECT * FROM posts WHERE id = ?', [req.params.id], 'get');
      if (post) {
        res.json(post);
      } else {
        res.status(404).json({ error: 'Post not found' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/posts', authenticate, async (req, res) => {
    const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image } = req.body;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    try {
      const result: any = await queryDb(req, `
        INSERT INTO posts (title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date], 'run');
      res.json({ id: result?.lastInsertRowid || result?.meta?.last_row_id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  app.put('/api/posts/:id', authenticate, async (req, res) => {
    const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published } = req.body;
    try {
      await queryDb(req, `
        UPDATE posts SET title_cn=?, title_en=?, excerpt_cn=?, excerpt_en=?, content_cn=?, content_en=?, category_cn=?, category_en=?, image=?, published=?
        WHERE id = ?
      `, [title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published, req.params.id], 'run');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update post' });
    }
  });

  app.delete('/api/posts/:id', authenticate, async (req, res) => {
    try {
      await queryDb(req, 'DELETE FROM posts WHERE id = ?', [req.params.id], 'run');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  app.post('/api/translate', authenticate, async (req, res) => {
    try {
      const { title, excerpt, content, category } = req.body;
      const apiKeyString = process.env.GEMINI_API_KEY;
      if (!apiKeyString) return res.status(500).json({ error: 'API Key not configured' });

      // Handle multiple keys separated by commas
      const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
      if (apiKeys.length === 0) return res.status(500).json({ error: 'No valid API Keys found' });
      
      // Randomly select one key
      const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following blog post content from Chinese to English. 
        Keep the tone professional and philosophical (DAO/Zen style).
        Return the result in JSON format with keys: title, excerpt, content, category.
        
        Title: ${title}
        Category: ${category}
        Excerpt: ${excerpt}
        Content: ${content}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              excerpt: { type: Type.STRING },
              content: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["title", "excerpt", "content", "category"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/generate', authenticate, async (req, res) => {
    try {
      const { title } = req.body;
      const apiKeyString = process.env.GEMINI_API_KEY;
      if (!apiKeyString) return res.status(500).json({ error: 'API Key not configured' });

      const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
      const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a "Daoist Philosopher & Deep Insight Analyst". 
        Your task is to write a deep, insightful blog post in Chinese based on the title: "${title}".
        
        Requirements:
        1. Use a sophisticated, international editorial style (Grand Editorial).
        2. The content MUST be in Markdown format.
        3. Include at least 3-4 sections, each starting with a level 2 header (##).
        4. Include exactly one Mermaid flowchart (graph TD or graph LR) that explains the core logic of the article.
        5. The summary (excerpt) should be profound and poetic.
        6. Suggest a suitable category (e.g., 哲学, 科技, 商业, 认知).
        
        Return the result in JSON format with keys: title, excerpt, content, category.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              excerpt: { type: Type.STRING },
              content: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["title", "excerpt", "content", "category"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist/index.html')));
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
