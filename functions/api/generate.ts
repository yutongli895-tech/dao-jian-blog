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
请严格按照 JSON 输出，不要解释，不要前缀。

标题：${title}

返回字段：
{
  "title": "...",
  "excerpt": "纯文本摘要",
  "content": "Markdown + 内联 HTML",
  "category": "哲学 | 科技 | 商业 | 认知"
}
`;

  try {
    const res = await fetch(
      "https://api-inference.modelscope.cn/ZhipuAI/GLM-5.1/predict",
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
            max_length: 3000,
          },
        }),
      }
    );

    const raw = await res.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return new Response(
        JSON.stringify({
          error: "ModelScope returned non-JSON",
          raw,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const text = parsed?.output?.text ?? "";

    if (!text) {
      return new Response(
        JSON.stringify({
          error: "Empty model output",
          parsed,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const json = JSON.parse(extractJSON(text));

    return new Response(JSON.stringify(json), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Internal error",
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
