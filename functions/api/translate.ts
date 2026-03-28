import { GoogleGenAI, Type } from "@google/genai";

export const onRequestPost: PagesFunction<{ DB: D1Database; GEMINI_API_KEY: string }> = async (context) => {
  try {
    const { title, excerpt, content, category } = await context.request.json() as any;
    const apiKeyString = context.env.GEMINI_API_KEY;

    if (!apiKeyString) {
      return new Response(JSON.stringify({ error: "Gemini API Key not configured on server" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle multiple keys separated by commas
    const apiKeys = apiKeyString.split(',').map(k => k.trim()).filter(Boolean);
    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: "No valid API Keys found" }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Randomly select one key
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following blog post content from Chinese to English. 
      Keep the tone professional and philosophical (DAO/Zen style).
      Return the result in JSON format with keys: title, excerpt, content, category.
      
      Title: ${title}
      Category: ${category}
      Excerpt: ${excerpt}
      Content: ${content}`,
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
