import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import dotenv from 'dotenv';
import cors from 'cors';
import { z, ZodError } from 'zod';

dotenv.config();

// ========================
// 环境变量校验
// ========================
const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 必须至少 32 个字符'),
  AGNES_API_KEY: z.string().min(1, 'AGNES_API_KEY 不能为空'),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD 必须至少 8 个字符'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGIN: z.string().optional(),
  PORT: z.string().optional(),
});

const env = envSchema.parse(process.env);
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========================
// Agnes AI 配置
// ========================
const AGNES_BASE_URL = process.env.AGNES_BASE_URL || 'https://api.agnes-2.0-flash.com/v1';
const AGNES_MODEL = process.env.AGNES_MODEL || 'Agnes-2.0-Flash';

// Agnes AI 调用函数（OpenAI 兼容格式）
async function callAgnesAI(systemPrompt: string, userContent: string) {
  const apiKeyString = env.AGNES_API_KEY;
  const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
  if (apiKeys.length === 0) throw new Error('No valid API Keys found');

  const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

  const res = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AGNES_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Agnes API error (${res.status}): ${errText}`);
  }

  const data = await res.json() as any;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Agnes API');

  return JSON.parse(text);
}

// ========================
// 数据库初始化
// ========================
const db = new Database('dao_insight.db');

function initDb() {
  db.exec(`
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
  `);

  const adminPassword = env.ADMIN_PASSWORD;
  const hash = bcrypt.hashSync(adminPassword, 10);
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');

  if (!admin) {
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hash);
  } else {
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hash, 'admin');
  }
}

initDb();

// ========================
// 请求校验 Schema
// ========================
const PostSchema = z.object({
  title_cn: z.string().min(1, '标题不能为空').max(200, '标题过长'),
  title_en: z.string().min(1, '英文标题不能为空').max(200, '英文标题过长'),
  excerpt_cn: z.string().min(1, '摘要不能为空').max(500, '摘要过长'),
  excerpt_en: z.string().min(1, '英文摘要不能为空').max(500, '英文摘要过长'),
  content_cn: z.string().min(1, '内容不能为空'),
  content_en: z.string().min(1, '英文内容不能为空'),
  category_cn: z.string().min(1, '分类不能为空').max(50),
  category_en: z.string().min(1, '英文分类不能为空').max(50),
  image: z.string().url('必须是有效的 URL'),
  published: z.number().int().min(0).max(1).optional(),
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const PostUpdateSchema = PostSchema.partial();

// ========================
// 类型定义
// ========================
interface AuthenticatedRequest extends express.Request {
  user?: { id: number; username: string };
}

// ========================
// 工具函数
// ========================
const queryDb = (sql: string, params: any[] = [], type: 'all' | 'get' | 'run' = 'get') => {
  const stmt = db.prepare(sql);
  if (type === 'all') return stmt.all(...params);
  if (type === 'get') return stmt.get(...params);
  if (type === 'run') return stmt.run(...params);
};

const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ========================
// 启动服务器
// ========================
async function startServer() {
  const app = express();

  // CORS 配置
  app.use(cors({
    origin: env.ALLOWED_ORIGIN || (env.NODE_ENV === 'development' ? '*' : false),
  }));
  app.use(express.json());

  // 认证中间件
  const authenticate = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      req.user = payload as { id: number; username: string };
      next();
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // ========================
  // API 路由
  // ========================

  // 登录
  app.post('/api/login', asyncHandler(async (req: express.Request, res: express.Response) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { username, password } = parsed.data;
    const user = queryDb('SELECT * FROM users WHERE username = ?', [username], 'get');

    if (user && bcrypt.compareSync(password, (user as any).password)) {
      const token = await new jose.SignJWT({ id: (user as any).id, username: (user as any).username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  }));

  // 获取文章列表（支持分页和搜索）
  app.get('/api/posts', asyncHandler(async (req: express.Request, res: express.Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let whereClause = 'WHERE published = 1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (title_cn LIKE ? OR title_en LIKE ? OR content_cn LIKE ? OR content_en LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const posts = queryDb(
      `SELECT * FROM posts ${whereClause} ORDER BY date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      'all'
    );

    const countResult = queryDb(
      `SELECT COUNT(*) as count FROM posts ${whereClause}`,
      params,
      'get'
    ) as any;

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      }
    });
  }));

  // 获取单篇文章
  app.get('/api/posts/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
    const post = queryDb('SELECT * FROM posts WHERE id = ?', [req.params.id], 'get');
    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  }));

  // 创建文章
  app.post('/api/posts', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const parsed = PostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image } = parsed.data;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');

    const result = queryDb(
      `INSERT INTO posts (title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date],
      'run'
    ) as any;

    res.json({ id: result.lastInsertRowid });
  }));

  // 更新文章
  app.put('/api/posts/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const parsed = PostUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.errors });
    }

    const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published } = parsed.data;

    queryDb(
      `UPDATE posts SET title_cn=?, title_en=?, excerpt_cn=?, excerpt_en=?, content_cn=?, content_en=?, category_cn=?, category_en=?, image=?, published=?
       WHERE id = ?`,
      [title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published, req.params.id],
      'run'
    );

    res.json({ success: true });
  }));

  // 删除文章
  app.delete('/api/posts/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    queryDb('DELETE FROM posts WHERE id = ?', [req.params.id], 'run');
    res.json({ success: true });
  }));

  // AI 翻译（使用 Agnes API）
  app.post('/api/translate', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { title, excerpt, content, category } = req.body;

      const result = await callAgnesAI(
        `You are a professional translator specializing in Chinese-to-English translation for a philosophical blog.
         Keep the tone professional and philosophical (DAO/Zen style).
         Return the result in valid JSON format with keys: title, excerpt, content, category.`,
        `Translate the following blog post content from Chinese to English.

Title: ${title}
Category: ${category}
Excerpt: ${excerpt}
Content: ${content}`
      );

      res.json(result);
    } catch (error: any) {
      console.error('Translation error:', error.message);
      res.status(500).json({ error: error.message || 'Translation failed' });
    }
  }));

  // AI 生成（使用 Agnes API）
  app.post('/api/generate', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { title } = req.body;

      const result = await callAgnesAI(
        `You are a "Daoist Philosopher & Deep Insight Analyst".
         Your task is to write a deep, insightful blog post in Chinese based on the given title.

         Requirements:
         1. Use a sophisticated, international editorial style (Grand Editorial).
         2. The "content" field MUST be in Markdown format but MUST include specific HTML structures:
            - Start with an abstract block (plain HTML):
              <div class="abstract-container">
                <div class="abstract-title">导读 / ABSTRACT</div>
                <div class="abstract-content-wrapper">
                  <div class="abstract-drop-cap">[Title's First Character]</div>
                  <div class="abstract-text">[A profound 1-2 sentence summary]</div>
                </div>
              </div>
            - Use level 2 headers (##) for sections.
            - Include exactly one Mermaid flowchart (graph TD or graph LR) explaining the logic. Keep node text concise (max 10 chars).
            - End with a golden sentence block (plain HTML):
              <div class="golden-sentence">
                <div class="golden-sentence-icon">道</div>
                [A final poetic conclusion sentence]
              </div>
         3. The "excerpt" field should be a plain text version of the abstract.
         4. Suggest a suitable category (e.g., 哲学, 科技, 商业, 认知).

         Return the result in valid JSON format with keys: title, excerpt, content, category.`,
        `Write a deep, insightful blog post based on this title: "${title}"`
      );

      res.json(result);
    } catch (error: any) {
      console.error('Generation error:', error.message);
      res.status(500).json({ error: error.message || 'Generation failed' });
    }
  }));

  // ========================
  // 全局错误处理
  // ========================
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err.stack);

    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }

    res.status(500).json({
      error: env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
  });

  // Vite 集成
  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist/index.html')));
  }

  const PORT = parseInt(env.PORT || '3000');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`AI Provider: Agnes (${AGNES_BASE_URL})`);
  });
}

startServer();
