export const onRequestPost: PagesFunction<{ MODELSCOPE_API_KEY: string }> =
  async (context) => {

  try {
    const { title } = await context.request.json<{ title?: string }>();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Missing title" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = context.env.MODELSCOPE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "MODELSCOPE_API_KEY missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, ".");

    const prompt = `
你是一个道家哲学家与现代思想评论者。
请严格按照 JSON 输出，不要解释，不要前缀。

标题：${title}

返回字段（必须严格遵守）：
{
  "title": "文章主标题",
  "excerpt": "首页卡片摘要（≤120字）",
  "content": "完整正文（Markdown + 内联 HTML）",
  "category": "论道 | 悟道 | 经典 | 生活"
}
`;

    const res = await fetch(
      "https://api-inference.modelscope.cn/models/ZhipuAI/GLM-5.1/predict",
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
            max_length: 3200,
          },
        }),
      }
    );

    const raw = await res.text();
    const parsed = JSON.parse(raw);
    const text = parsed?.output?.text ?? "";

    const json = safeParseJSON(text);

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
      JSON.stringify({
        error: "Generate failed",
        message: e.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * ✅ 永不崩溃的 JSON 解析器
 */
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
