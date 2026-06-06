# 道剑博客 (Dao Jian Blog)

一个基于 **React 19 + Vite + Express + SQLite + Agnes AI** 的现代博客系统，支持中英文双语、AI 辅助写作与翻译。

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![AI Provider](https://img.shields.io/badge/AI-Agnes_2.0_Flash-orange)

---

## ✨ 功能特性

- 📝 **双语博客系统** — 每篇文章支持中文和英文内容
- 🤖 **AI 辅助写作** — 基于 **Agnes 2.0 Flash** 一键生成文章内容
- 🌐 **AI 翻译** — 一键将中文内容翻译为英文（保持道/禅风格）
- 🔐 **管理员后台** — 安全的登录系统，支持 JWT 认证
- 📱 **响应式设计** — 基于 Tailwind CSS，完美适配移动端
- 🎨 **现代 UI** — 精美的排版和动画效果
- 🔍 **搜索功能** — 支持文章搜索和分页
- ☁️ **Cloudflare Pages 部署** — 支持 Serverless 部署

---

## 🛠 技术栈

### 前端
- **React 19** — 最新版 React
- **React Router DOM** — 路由管理
- **Tailwind CSS 4** — 样式框架
- **Framer Motion** — 动画库
- **React Markdown** — Markdown 渲染
- **Mermaid** — 流程图支持

### 后端
- **Express** — Web 框架
- **better-sqlite3** — SQLite 数据库（本地开发）
- **Cloudflare D1** — 生产环境数据库（Cloudflare Pages）
- **bcryptjs** — 密码加密
- **jose** — JWT 认证
- **zod** — 请求参数校验

### AI 服务
- **Agnes 2.0 Flash** — OpenAI 兼容格式的 AI 模型
  - Base URL: `https://api.agnes-2.0-flash.com/v1`
  - 认证: Bearer Token
  - 响应格式: JSON Object

---

## 📦 安装

### 前置要求

- **Node.js** >= 22.21.1
- **npm** >= 10.0.0
- （可选）**Wrangler CLI** — 用于 Cloudflare Pages 本地开发
- **Agnes API Key** — 从 Agnes 平台获取

### 步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/yutongli895-tech/dao-jian-blog.git
   cd dao-jian-blog
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填写必要的环境变量
   ```

4. **生成 JWT_SECRET**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   # 将输出复制到 .env 的 JWT_SECRET
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

6. **访问应用**
   - 前端: http://localhost:3000
   - 管理员登录: http://localhost:3000/login
   - 默认用户名: `admin`
   - 默认密码: 在 `.env` 中设置的 `ADMIN_PASSWORD`

---

## ⚙️ 环境变量

创建 `.env` 文件并配置以下变量：

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `JWT_SECRET` | JWT 签名密钥（至少 32 字符） | `your-super-secret-key...` |
| `AGNES_API_KEY` | Agnes API Key（支持多个用逗号分隔） | `key1,key2` |
| `ADMIN_PASSWORD` | 管理员密码（至少 8 字符） | `your-secure-password` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务器端口 | `3000` |
| `ALLOWED_ORIGIN` | CORS 允许的源 | `*` (开发环境) |
| `AGNES_BASE_URL` | Agnes API 地址 | `https://api.agnes-2.0-flash.com/v1` |
| `AGNES_MODEL` | Agnes 模型名称 | `Agnes-2.0-Flash` |

---

## 🚀 构建与部署

### 本地构建

```bash
# 构建前端
npm run build

# 启动生产服务器
npm start
```

### Cloudflare Pages 部署

1. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **配置 `wrangler.toml`**
   - 修改 `database_id` 为你的 D1 数据库 ID
   - 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 创建 D1 数据库

3. **设置环境变量**
   - 在 Cloudflare Pages 项目设置中添加环境变量
   - 敏感变量使用 **Secrets**

4. **部署**
   ```bash
   wrangler pages deploy dist --project-name=dao-jian-blog
   ```

---

## 📁 项目结构

```
dao-jian-blog/
├── functions/              # Cloudflare Pages Functions (API 路由)
│   ├── utils.ts           # 工具函数（认证、数据库、AI 调用）
│   └── api/
│       ├── login.ts       # 登录接口
│       ├── posts.ts       # 文章列表 / 创建文章
│       ├── posts/
│       │   └── [id].ts   # 单篇文章操作
│       ├── translate.ts   # AI 翻译（Agnes API）
│       └── generate.ts   # AI 生成（Agnes API）
├── src/
│   ├── components/        # React 组件
│   │   ├── AdminDashboard.tsx  # 管理后台
│   │   ├── BlogCard.tsx       # 文章卡片
│   │   ├── BlogPost.tsx       # 文章详情
│   │   └── ...
│   ├── App.tsx           # 主应用组件
│   └── main.tsx         # 入口文件
├── server.ts             # Express 服务器（本地开发）
├── wrangler.toml        # Wrangler 配置
├── vite.config.ts        # Vite 配置
└── package.json
```

---

## 🔧 API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 管理员登录 |

### 文章

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts?page=1&limit=10&search=keyword` | 获取文章列表（支持分页和搜索） |
| GET | `/api/posts/:id` | 获取单篇文章 |
| POST | `/api/posts` | 创建文章（需要认证） |
| PUT | `/api/posts/:id` | 更新文章（需要认证） |
| DELETE | `/api/posts/:id` | 删除文章（需要认证） |

### AI 功能（Agnes 2.0 Flash）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/translate` | AI 翻译（需要认证） |
| POST | `/api/generate` | AI 生成内容（需要认证） |

---

## 🔄 从 Gemini 迁移到 Agnes

本项目已从 Google Gemini AI 迁移到 **Agnes 2.0 Flash**。

### 主要变更：

1. **移除依赖**: 不再需要 `@google/genai`
2. **API 格式**: 使用 OpenAI 兼容格式（`/v1/chat/completions`）
3. **认证方式**: Bearer Token（与 Gemini 不同）
4. **响应格式**: JSON Object（通过 `response_format` 控制）

### 配置变更：

```diff
- GEMINI_API_KEY=your-gemini-key
+ AGNES_API_KEY=your-agnes-key
+ AGNES_BASE_URL=https://api.agnes-2.0-flash.com/v1
+ AGNES_MODEL=Agnes-2.0-Flash
```

---

## 📝 开发指南

### 添加新功能

1. **后端 API**（本地开发）
   - 在 `server.ts` 中添加路由
   - 使用 `PostSchema.safeParse()` 校验请求
   - 使用 `authenticate` 中间件保护路由
   - 使用 `callAgnesAI()` 调用 AI 功能

2. **后端 API**（Cloudflare Pages）
   - 在 `functions/api/` 中创建新文件
   - 导出 `onRequestGet`, `onRequestPost` 等函数
   - 使用 `authenticate()` 进行认证
   - 使用 `callAgnesAI(context, ...)` 调用 AI 功能

3. **前端组件**
   - 在 `src/components/` 中创建新组件
   - 使用 `useState`, `useEffect` 管理状态
   - 使用 `lucide-react` 添加图标

### 数据库迁移

```bash
# 本地开发
sqlite3 dao_insight.db < schema.sql

# Cloudflare D1
wrangler d1 execute dao-insight-db --file=schema.sql
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Agnes 2.0 Flash](https://api.agnes-2.0-flash.com/) — AI 能力提供方
- [Cloudflare Pages](https://pages.cloudflare.com/)

---

## 📧 联系方式

- GitHub: [@yutongli895-tech](https://github.com/yutongli895-tech)
- 项目地址: https://github.com/yutongli895-tech/dao-jian-blog

---

** Built with ❤️ and Dao (道) **
