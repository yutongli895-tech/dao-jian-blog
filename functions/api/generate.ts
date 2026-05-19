import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();
app.use(cors());

// 工具函数：安全解析 JSON
function safeParseJSON(str: string): any {
  try {
    const cleaned = str
      .replace(/^[\s\S]*?\{/, "{")
      .replace(/\}[\s\S]*$/, "}");
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

// 工具函数：规范化分类
function normalizeCategory(cat?: string): string {
  if (!cat) return "论道";
  if (cat.includes("悟")) return "悟道";
  if (cat.includes("经") || cat.includes("典")) return "经典";
  if (cat.includes("生") || cat.includes("活")) return "生活";
  return "论道";
}

// 工具函数：生成 slug
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 生成文章接口
app.post("/api/generate", async (c) => {
  const payload = await c.req.json();
  const { title, category } = payload;

  const apiKey = c.env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MODELSCOPE_API_KEY missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const date = new Date().toISOString().split("T")[0].replace(/-/g, ".");

  // 🔥 重点：强化 Prompt，要求“长文 + 哲学结构 + 图表 + 金句”
  const prompt = `
You are a master Daoist philosopher and long-form content writer.
Write a profound, in-depth Chinese article based on the following title and category.

📌 Requirements:
- Article length: 1500–2500 words.
- Structure: Use clear sections with philosophical headings (e.g., “本体论”, “战略层面”, “认知升维”).
- Include at least one Mermaid diagram (flowchart) to visualize the core logic.
- End with a “Golden Sentence” — a short, powerful quote that encapsulates the article’s essence.
- Tone: Zen-like, academic, poetic, and deeply reflective.
- Output format: Markdown + inline HTML (for diagrams and emphasis).

⚠️ Output STRICTLY valid JSON only. Do NOT explain. Do NOT add markdown.

Return fields:
{
  "title": "Chinese title",
  "excerpt": "Short abstract (≤120 chars)",
  "content": "Full article in Markdown + inline HTML",
  "category": "论道 | 悟道 | 经典 | 生活"
}

Title: ${title}
Category: ${category}
`;

  try {
    const res = await fetch(
      "https://api-inference.modelscope.cn/models/Qwen/Qwen2.5-72B-Instruct/predict",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { prompt, history: [] },
          parameters: {
            temperature: 0.7, // 提高一点创造性
            max_length: 4000,
          },
        }),
      }
    );

    const raw = await res.text();
    let aiText = "";

    try {
      const parsed = JSON.parse(raw);
      aiText = parsed?.output?.text ?? "";
    } catch {
      aiText = raw;
    }

    const json = safeParseJSON(aiText);

    const article = {
      id: Date.now(),
      slug: slugify(title),
      title: json.title ?? title,
      excerpt: json.excerpt ?? "探索万物之源的现代回响。",
      content: json.content ?? `${title} 的内容正在生成中。`,
      category: normalizeCategory(json.category),
      date,
    };

    return new Response(JSON.stringify(article), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// 翻译接口（已对齐）
app.post("/api/translate", async (c) => {
  const payload = await c.req.json();
  const { title, excerpt, content, category } = payload;

  const apiKey = c.env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MODELSCOPE_API_KEY missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const prompt = `
You are a professional translator and Daoist philosopher.
Translate the following Chinese blog post into elegant English.
Keep the tone philosophical, Zen-like, and academic.

📌 Requirements:
- Translate ALL content: title, excerpt, body, category.
- Preserve structure: headings, Mermaid diagrams (as code blocks), Golden Sentences.
- Output format: Markdown + inline HTML.
- Category mapping: 论道 → Philosophy, 悟道 → Enlightenment, 经典 → Classics, 生活 → Life.

⚠️ Output STRICTLY valid JSON only. Do NOT explain.

Return fields:
{
  "title": "English title",
  "excerpt": "English excerpt",
  "content": "English content (Markdown + inline HTML)",
  "category": "Philosophy | Enlightenment | Classics | Life"
}

Original article:
Title: ${title}
Category: ${category}
Excerpt: ${excerpt}
Content: ${content}
`;

  try {
    const res = await fetch(
      "https://api-inference.modelscope.cn/models/Qwen/Qwen2.5-72B-Instruct/predict",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { prompt, history: [] },
          parameters: {
            temperature: 0.4,
            max_length: 4000,
          },
        }),
      }
    );

    const raw = await res.text();
    let aiText = "";

    try {
      const parsed = JSON.parse(raw);
      aiText = parsed?.output?.text ?? "";
    } catch {
      aiText = raw;
    }

    const json = safeParseJSON(aiText);

    return new Response(
      JSON.stringify({
        title: json.title ?? title,
        excerpt: json.excerpt ?? excerpt,
        content: json.content ?? content,
        category: json.category ?? "Philosophy",
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

export default app;
