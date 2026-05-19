export const onRequestPost: PagesFunction<{
  DB: D1Database;
  MODELSCOPE_API_KEY: string;
}> = async (context) => {
  try {
    const { title } = await context.request.json<{ title?: string }>();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Missing title" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKeyString = context.env.MODELSCOPE_API_KEY;
    if (!apiKeyString) {
      return new Response(
        JSON.stringify({ error: "MODELSCOPE_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKeys = apiKeyString
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid API Keys found" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, ".");

    const prompt = `
你是一个道家哲学家与现代思想评论者（Daoist Philosopher & Deep Insight Analyst）。
你必须严格按照 JSON 输出，不要解释，不要前缀，不要后缀。

标题：${title}

要求（必须严格遵守）：
1. 风格：国际社论（Grand Editorial）。
2. 正文格式：Markdown + 内联 HTML。
3. 正文结构必须包含：
   - 开头：Abstract HTML 容器（不要包裹在代码块中）
     <div class="abstract-container">
       <div class="abstract-title">导读 / ABSTRACT</div>
       <div class="abstract-content-wrapper">
         <div class="abstract-drop-cap">${title[0]}</div>
         <div class="abstract-text">[1–2 句深刻摘要]</div>
       </div>
     </div>
   - 使用 ## 作为章节标题
   - 恰好一张 Mermaid 流程图（graph TD 或 LR，节点文本 ≤10 字）
   - 结尾：Golden Sentence HTML 容器
     <div class="golden-sentence">
       <div class="golden-sentence-icon">道</div>
       [一句诗性结语]
     </div>

返回字段（JSON）：
{
  "title": "文章主标题",
  "excerpt": "纯文本摘要（≤120字）",
  "content": "完整正文（Markdown + HTML）",
  "category": "论道 | 悟道 | 经典 | 生活"
}
`;

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
            temperature: 0.7,
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
      content: json.content ?? `<p>${title} 的内容正在生成中。</p>`,
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
};

/* ---------- 工具函数 ---------- */

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

function normalizeCategory(cat?: string): string {
  if (!cat) return "论道";
  if (cat.includes("悟")) return "悟道";
  if (cat.includes("经") || cat.includes("典")) return "经典";
  if (cat.includes("生") || cat.includes("活")) return "生活";
  return "论道";
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
