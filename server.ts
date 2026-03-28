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
if (!admin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
}

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
    const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
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
  });

  app.get('/api/posts', (req, res) => {
    const posts = db.prepare('SELECT * FROM posts ORDER BY date DESC').all();
    res.json(posts);
  });

  app.post('/api/posts', authenticate, (req, res) => {
    const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image } = req.body;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const result = db.prepare(`
      INSERT INTO posts (title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/posts/:id', authenticate, (req, res) => {
    const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published } = req.body;
    db.prepare(`
      UPDATE posts SET title_cn=?, title_en=?, excerpt_cn=?, excerpt_en=?, content_cn=?, content_en=?, category_cn=?, category_en=?, image=?, published=?
      WHERE id = ?
    `).run(title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/posts/:id', authenticate, (req, res) => {
    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
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
