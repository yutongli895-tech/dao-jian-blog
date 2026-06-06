import { authenticate, callAgnesAI, errorResponse, successResponse } from '../utils';

export async function onRequestPost(context: any) {
  // 认证
  const authResult = await authenticate(context);
  if (authResult instanceof Response) return authResult;

  try {
    const { title, excerpt, content, category } = await context.request.json();

    const result = await callAgnesAI(
      context,
      `You are a professional translator specializing in Chinese-to-English translation for a philosophical blog.
       Keep the tone professional and philosophical (DAO/Zen style).
       Return the result in valid JSON format with keys: title, excerpt, content, category.`,
      `Translate the following blog post content from Chinese to English.

Title: ${title}
Category: ${category}
Excerpt: ${excerpt}
Content: ${content}`
    );

    return successResponse(result);
  } catch (error: any) {
    console.error('Translation error:', error.message);
    return errorResponse(error.message || 'Translation failed');
  }
}
