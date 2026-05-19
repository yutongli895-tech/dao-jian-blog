import slugify from "slugify";

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

  const today = new Date();
  const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  const prompt = `
你是一个道家哲学家与现代思想评论者。
请严格按照 JSON 输出，不要解释，不要前缀。

标题：${title}

返回字段：
{
  "title": "文章主标题",
  "excerpt": "首页卡片显示的摘要（≤120字）",
  "content": "完整正文（Markdown + 内联 HTML）",
  "category": "论道 | 悟道 | 经典 | 生活"
}
`;

  try {
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
            max_length: 3000,
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
      slug: slugify(title, { lower: true, strict: true }),
      title: json.title,
      excerpt: json.excerpt,
      content: json.content,
      category: json.category,
      date,
    };

    return new Response(JSON.stringify(article), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Generate failed",
        message: String(e),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

function extractJSON(str: string): string {
  const start = str.indexOf("{");
  const end = str.lastIndexOf("}");
  if (start === -1 || end === -1) return str;
  return str.slice(start, end + 1);
}
