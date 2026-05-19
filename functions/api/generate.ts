export const onRequestPost: PagesFunction<{ MODELSCOPE_API_KEY: string }> =
  async (context) => {

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
你必须严格按照 JSON 输出，不要解释，不要前缀，不要后缀。

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
    "https://api-inference.modelscope.cn/models/Qwen/Qwen2.5-72B-Instruct/predict",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt,
          history: [],
        },
        parameters: {
          temperature: 0.7,
          max_length: 3500,
        },
      }),
    }
  );

  const raw = await res.text();
  const parsed = JSON.parse(raw);
  const text = parsed?.output?.text ?? "";

  const json = JSON.parse(extractJSON(text));

  const article = {
    id: Date.now(),
    slug: slugify(title),
    title: json.title,
    excerpt: json.excerpt,
    content: json.content,
    category: json.category,
    date,
  };

  return new Response(JSON.stringify(article), {
    headers: { "Content-Type": "application/json" },
  });
};

function extractJSON(str: string): string {
  const start = str.indexOf("{");
  const end = str.lastIndexOf("}");
  if (start === -1 || end === -1) return str;
  return str.slice(start, end + 1);
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
