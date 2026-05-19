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

    const apiKeyString = context.env.MODELSCOPE_API_KEY;
    if (!apiKeyString) {
      return new Response(
        JSON.stringify({ error: "MODELSCOPE_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKeys = apiKeyString
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);

    if (apiKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid API Keys found" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const systemPrompt = `
You are a "Daoist Philosopher & Deep Insight Analyst".
You MUST output strictly valid JSON only. Do NOT explain. Do NOT add markdown fences.
`;

    const userPrompt = `
Write a profound Chinese blog post titled "${title}".

Strict requirements:

1. Style: International editorial (Grand Editorial).
2. Format: Markdown + inline HTML (NO code blocks).
3. Content structure:
   - Start with an abstract block (plain HTML):
     <div class="abstract-container">
       <div class="abstract-title">导读 / ABSTRACT</div>
       <div class="abstract-content-wrapper">
         <div class="abstract-drop-cap">${title[0]}</div>
         <div class="abstract-text">[1–2 sentence summary]</div>
       </div>
     </div>

   - Use ## for section headers.
   - Include exactly ONE Mermaid flowchart (graph TD or LR). Each node ≤10 characters.
   - End with a golden sentence block (plain HTML):
     <div class="golden-sentence">
       <div class="golden-sentence-icon">道</div>
       [One poetic concluding sentence]
     </div>

4. Fields to return (JSON ONLY):
{
  "title": "文章主标题",
  "excerpt": "纯文本摘要（≤120字）",
  "content": "完整正文（Markdown + HTML）",
  "category": "哲学 | 科技 | 商业 | 认知"
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
          input: {
            prompt: userPrompt,
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

    return new Response(JSON.stringify(json), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
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
