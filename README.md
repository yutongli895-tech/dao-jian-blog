# 道剑博客 (Dao Jian Blog)

一个基于 **React 19 + Vite + Express + SQLite + 多服务商 AI** 的现代博客系统，支持中英文双语、AI 辅助写作与翻译。

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![AI Provider](https://img.shields.io/badge/AI-3_Providers-orange)

---

## ✨ 功能特性

- 📝 **双语博客系统** — 每篇文章支持中文和英文内容
- 🤖 **AI 辅助写作** — 一键生成文章内容，支持多家服务商切换（魔搭 / 商汤 / InferX）
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

### AI 服务（三家并存，可切换，全配则互为降级）

| 服务商 | Base URL | 默认模型 | 密钥变量 |
|---|---|---|---|
| 魔搭 ModelScope | `https://api-inference.modelscope.cn/v1` | `deepseek-ai/DeepSeek-V4-Flash` | `AI_API_KEY` |
| 商汤日日新 | `https://token.sensenova.cn/v1` | `sensenova-6.8-flash-lite` | `SENSENOVA_API_KEY` |
| InferX | `https://model.inferx.net/endpoints/v1` | `deepseek-v4.1-flash-1017-basic` | `INFERX_API_KEY` |

三家均为 OpenAI 兼容格式（`/chat/completions` + Bearer Token）。
**配几家就能用几家**：只配一把就是单上游，配多把则按上表顺序自动降级。

---

## 📦 安装

### 前置要求

- **Node.js** >= 22.21.1
- **npm** >= 10.0.0
- （可选）**Wrangler CLI** — 用于 Cloudflare Pages 本地开发
- **AI API Key** — 至少一把：魔搭 / 商汤日日新 / InferX（见下方「环境变量」）

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
| `ADMIN_PASSWORD` | 管理员密码（至少 8 字符） | `your-secure-password` |

### AI 密钥（至少配一把）

| 变量名 | 服务商 | 说明 |
|--------|--------|------|
| `AI_API_KEY` | 魔搭 ModelScope | 支持逗号分隔多个 Key 轮询 |
| `SENSENOVA_API_KEY` | 商汤日日新 | 别名 `SENSETIME_API_KEY` / `SENSENOVA_KEY` 也认 |
| `INFERX_API_KEY` | InferX | 仅文本模型 |

> 变量名记不清不要紧：代码内置别名解析，`/api/ai-status` 会回报**实际命中的变量名**（`keySource`）。

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务器端口 | `3000` |
| `ALLOWED_ORIGIN` | CORS 允许的源 | `*` (开发环境) |
| `AI_MODEL` | 魔搭模型覆盖 | `deepseek-ai/DeepSeek-V4-Flash` |
| `SENSENOVA_MODEL` | 商汤模型覆盖 | `sensenova-6.8-flash-lite` |
| `INFERX_MODEL` | InferX 模型覆盖 | `deepseek-v4.1-flash-1017-basic` |

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
│       ├── translate.ts   # AI 翻译
│       ├── generate.ts   # AI 生成
│       └── ai-status.ts  # AI 服务商自检
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

### AI 功能（三家可切换 + 自动降级）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/translate` | AI 翻译（需要认证，body 可带 `provider`） |
| POST | `/api/generate` | AI 生成内容（需要认证，body 可带 `provider`） |
| GET | `/api/ai-status` | 各家密钥绑定情况（不消耗额度） |
| GET | `/api/ai-status?probe=1` | 逐家发最小请求验证真能用（需要认证，消耗额度） |

`provider` 取值：`modelscope` / `sensenova` / `inferx`。
不传则按「魔搭 → 商汤 → InferX」顺序自动降级；传了则只用指定那家（尊重选择，不偷偷换）。
响应里会回显 `providerLabel` / `model`，告诉你是哪家生成的。

---

## 🔄 AI 服务商演进

`Gemini` → `Agnes 2.0 Flash` → `ModelScope` → **多服务商并存**。

现在不再绑死单一供应商：三家 OpenAI 兼容上游同时在册，按密钥绑定情况自动取舍，
任何一家 429/超时都会自动换下一家（单家 24s 超时、总预算 27s，适配 Cloudflare Pages 的 30s 请求上限）。

配置变更：

```diff
- AGNES_API_KEY=your-agnes-key
- AGNES_BASE_URL=https://api.agnes-2.0-flash.com/v1
- AGNES_MODEL=Agnes-2.0-Flash
+ AI_API_KEY=your-modelscope-key
+ SENSENOVA_API_KEY=your-sensenova-key
+ INFERX_API_KEY=your-inferx-key
```

---

## 📝 开发指南

### 添加新功能

1. **后端 API**（本地开发）
   - 在 `server.ts` 中添加路由
   - 使用 `PostSchema.safeParse()` 校验请求
   - 使用 `authenticate` 中间件保护路由
   - 使用 `callAI()` 调用 AI 功能

2. **后端 API**（Cloudflare Pages）
   - 在 `functions/api/` 中创建新文件
   - 导出 `onRequestGet`, `onRequestPost` 等函数
   - 使用 `authenticate()` 进行认证
   - 使用 `callAI(context, system, user, provider?)` 调用 AI 功能
     （返回 `{ data, provider, providerLabel, model, tried }`；旧名 `callAgnesAI` 仍可用，只返回 `data`）

### 改完 AI 相关代码，跑一遍回归

```bash
npx tsx scripts/verify-ai-chain.ts   # 桩件替换 fetch，零网络，32 项断言
```

覆盖：各家请求体差异（关思考 / JSON 格式）、失败降级、指定 provider 不换家、
markdown 围栏剥离、密钥别名解析、全未配置的报错文案。

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
- [魔搭 ModelScope](https://modelscope.cn/) / [商汤日日新](https://www.sensenova.cn/) / [InferX](https://model.inferx.net/) — AI 能力提供方
- [Cloudflare Pages](https://pages.cloudflare.com/)

---

## 📧 联系方式

- GitHub: [@yutongli895-tech](https://github.com/yutongli895-tech)
- 项目地址: https://github.com/yutongli895-tech/dao-jian-blog

---

** Built with ❤️ and Dao (道) **
