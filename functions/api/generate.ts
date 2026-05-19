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
你是一个道家哲学家。
请严格输出 JSON，不要解释。

标题：${title}

返回：
{
  "title": "...",
  "excerpt": "...",
  "content": "...",
  "category": "哲学 | 科技 | 商业 | 认知"
}
`;

  try {
    const url =
      "https://api-inference.modelscope.cn/models/ZhipuAI/GLM-5.1/predict";

    const res = await fetch(url, {
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
          max_length: 2500,
        },
      }),
    });

    const raw = await res.text();

    return new Response(
      JSON.stringify({
        step: "ModelScope response",
        status: res.status,
        ok: res.ok,
        raw,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Fetch failed",
        message: String(e),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
