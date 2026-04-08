import { GoogleGenAI, Type } from "@google/genai";

export const onRequestPost: PagesFunction<{ DB: D1Database; GEMINI_API_KEY: string }> = async (context) => {
  try {
    const { title } = await context.request.json() as any;
    const apiKeyString = context.env.GEMINI_API_KEY;

    if (!apiKeyString) {
      return new Response(JSON.stringify({ error: "Gemini API Key not configured on server" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: "No valid API Keys found" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a "Daoist Philosopher & Deep Insight Analyst". 
      Your task is to write a deep, insightful blog post in Chinese based on the title: "${title}".
      
      Requirements for the "content" field:
      1. Use a sophisticated, international editorial style (Grand Editorial).
      2. The content MUST be in Markdown format but MUST include specific HTML structures for layout:
         - Start with an abstract block:
           <div class="abstract-container">
             <div class="abstract-title">导读 / ABSTRACT</div>
             <div class="abstract-content-wrapper">
               <div class="abstract-drop-cap">[Title's First Character]</div>
               <div class="abstract-text">[A profound 1-2 sentence summary]</div>
             </div>
           </div>
         - Use level 2 headers (##) for sections.
         - Include exactly one Mermaid flowchart (graph TD or graph LR) explaining the logic. Keep node text concise (max 10 chars).
         - End with a golden sentence block:
           <div class="golden-sentence">
             <div class="golden-sentence-icon">道</div>
             [A final poetic conclusion sentence]
           </div>
      3. The "excerpt" field should be a plain text version of the abstract.
      4. Suggest a suitable category (e.g., 哲学, 科技, 商业, 认知).
      
      Return the result in JSON format with keys: title, excerpt, content, category.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            excerpt: { type: Type.STRING },
            content: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["title", "excerpt", "content", "category"]
        }
      }
    });

    return new Response(response.text, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
