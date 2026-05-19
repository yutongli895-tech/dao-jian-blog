export const onRequestPost: PagesFunction<{
  DB: D1Database;
  MODELSCOPE_API_KEY: string;
}> = async (context) => {
  try {
    const { title, excerpt, content, category } =
      await context.request.json<{
        title?: string;
        excerpt?: string;
        content?: string;
        category?: string;
      }>();

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

    const prompt = `
You are a professional translator and Daoist philosopher.
Translate the following Chinese blog post into elegant English.
Keep the tone philosophical, Zen-like, and academic.

⚠️ Output STRICTLY valid JSON only.
⚠️ Do NOT explain.
⚠️ Do NOT add markdown.

Return fields (must strictly match):
{
  "title": "English title",
  "excerpt": "English excerpt",
  "content": "English content (Markdown + inline HTML)",
  "category": "Philosophy | Tech | Business | Cognition"
}

Original article:
Title: ${title}
Category: ${category}
Excerpt: ${excerpt}
Content: ${content}
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
            temperature: 0.4,
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

    return new Response(
      JSON.stringify({
        title: json.title ?? title,
        excerpt: json.excerpt ?? excerpt,
        content: json.content ?? content,
        category: json.category ?? "Philosophy",
      }),
      { headers: { "Content-Type": "application/json" } }
    );

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
