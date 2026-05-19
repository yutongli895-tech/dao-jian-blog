export const onRequestPost: PagesFunction<{ MODELSCOPE_API_KEY: string }> = async (context) => {
  const { title, excerpt, content, category } =
    await context.request.json<{
      title: string;
      excerpt: string;
      content: string;
      category: string;
    }>();

  const apiKey = context.env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MODELSCOPE_API_KEY is missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const prompt = `
You are a professional translator and Daoist philosopher.
Translate the following Chinese blog post into fluent, elegant English.
Keep the tone philosophical, Zen-like, and academic.

Return JSON ONLY:

{
  "title": "...",
  "excerpt": "...",
  "content": "...",
  "category": "..."
}

Original:
Title: ${title}
Category: ${category}
Excerpt: ${excerpt}
Content: ${content}
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
            temperature: 0.5,
            max_length: 2500,
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("ModelScope error:", data);
      return new Response(
        JSON.stringify({ error: "ModelScope API error", detail: data }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ModelScope 返回在 output.text
    const text = data?.output?.text ?? "";
    const json = JSON.parse(text);

    return new Response(JSON.stringify(json), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
