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

  const prompt = `
你是一个道家哲学家与现代思想评论者。
请写一篇关于《${title}》的深度文章。

要求：
- 风格：国际社论（Grand Editorial）
- 语言：简体中文
- 格式：Markdown + 内联 HTML
- 包含：摘要、章节、金句
- 不要返回 JSON，只返回文章内容
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
        parameters: { temperature: 0.7, max_length: 3500 },
      }),
    }
  );

  const raw = await res.text();
  const parsed = JSON.parse(raw);
  const aiText = parsed?.output?.text ?? "";

  const article = {
    id: Date.now(),
    slug: slugify(title),
    title,
    excerpt: aiText.slice(0, 120).replace(/\n/g, " ") + "…",
    content: aiText,
    category: "论道",
    date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
  };

  return new Response(JSON.stringify(article), {
    headers: { "Content-Type": "application/json" },
  });
};

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]/g, "").slice(0, 80);
}
