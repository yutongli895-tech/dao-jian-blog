export const onRequestPost: PagesFunction<{ MODELSCOPE_API_KEY: string }> =
  async (context) => {

  const payload = await context.request.json<any>();

  const apiKey = context.env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MODELSCOPE_API_KEY missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const prompt = `
请将以下中文文章翻译成英文，保持道家哲思语气。
只输出 JSON，不要解释。

原文：
${JSON.stringify(payload, null, 2)}
`;

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
          temperature: 0.3,
          max_length: 3000,
        },
      }),
    }
  );

  const text = await res.text();
  const parsed = JSON.parse(text);
  const output = parsed?.output?.text ?? "";

  const json = JSON.parse(extractJSON(output));

  return new Response(JSON.stringify(json), {
    headers: { "Content-Type": "application/json" },
  });
};
