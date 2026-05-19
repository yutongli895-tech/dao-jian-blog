export const onRequestPost: PagesFunction<{ MODELSCOPE_API_KEY: string }> = async (context) => {
  const { title } = await context.request.json<{ title: string }>();

  const apiKey = context.env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "MODELSCOPE_API_KEY is missing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const prompt = `
You are a Daoist Philosopher & Deep Insight Analyst.
Write a profound Chinese blog post titled "${title}".

Requirements:
1. Style: International editorial (Grand Editorial).
2. Format: Markdown + inline HTML (NO code blocks).
3. Structure:
   - Abstract (HTML div)
   - ## Sections
   - ONE Mermaid flowchart (graph TD/LR, ≤10 chars per node)
   - Golden sentence block (HTML div)
4. Return JSON ONLY:
{
  "title": "...",
  "excerpt": "Plain text abstract",
  "content": "Full article in Markdown+HTML",
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

    const data = await res.json();

    if (!res.ok) {
      console.error("ModelScope error:", data);
      return new Response(
        JSON.stringify({ error: "ModelScope API error", detail: data }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

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
