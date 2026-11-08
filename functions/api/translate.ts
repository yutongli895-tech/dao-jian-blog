import { authenticate, callAI, errorResponse, successResponse } from '../utils';

export async function onRequestPost(context: any) {
  // 认证
  const authResult = await authenticate(context);
  if (authResult instanceof Response) return authResult;

  try {
    const { title, excerpt, content, category, provider } = await context.request.json();

    const result = await callAI(
      context,
      `You are a professional translator specializing in Chinese-to-English translation for a philosophical blog.
       Keep the tone professional and philosophical (DAO/Zen style).
       Preserve all Markdown and HTML structures exactly as they are — only translate the human-readable text inside them.
       Return the result in valid JSON format with keys: title, excerpt, content, category.
       Output ONLY the raw JSON object — no markdown code fences, no extra commentary.`,
      `Translate the following blog post content from Chinese to English.

Title: ${title}
Category: ${category}
Excerpt: ${excerpt}
Content: ${content}`,
      provider
    );

    return successResponse({
      ...result.data,
      provider: result.provider,
      providerLabel: result.providerLabel,
      model: result.model,
    });
  } catch (error: any) {
    console.error('Translation error:', error.message);
    return errorResponse(error.message || 'Translation failed');
  }
}
