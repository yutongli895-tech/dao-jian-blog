import { authenticate, callAgnesAI, errorResponse, successResponse } from '../utils';

export async function onRequestPost(context: any) {
  // 认证
  const authResult = await authenticate(context);
  if (authResult instanceof Response) return authResult;

  try {
    const { title } = await context.request.json();

    const result = await callAgnesAI(
      context,
      `You are a "Daoist Philosopher & Deep Insight Analyst".
       Your task is to write a deep, insightful blog post in Chinese based on the given title.

       Requirements:
       1. Use a sophisticated, international editorial style (Grand Editorial).
       2. The "content" field MUST be in Markdown format but MUST include specific HTML structures:
          - Start with an abstract block (plain HTML):
            <div class="abstract-container">
              <div class="abstract-title">导读 / ABSTRACT</div>
              <div class="abstract-content-wrapper">
                <div class="abstract-drop-cap">[Title's First Character]</div>
                <div class="abstract-text">[A profound 1-2 sentence summary]</div>
              </div>
            </div>
          - Use level 2 headers (##) for sections.
          - Include exactly one Mermaid flowchart (graph TD or graph LR) explaining the logic. Keep node text concise (max 10 chars).
          - End with a golden sentence block (plain HTML):
            <div class="golden-sentence">
              <div class="golden-sentence-icon">道</div>
              [A final poetic conclusion sentence]
            </div>
       3. The "excerpt" field should be a plain text version of the abstract.
       4. Suggest a suitable category (e.g., 哲学, 科技, 商业, 认知).

       Return the result in valid JSON format with keys: title, excerpt, content, category.`,
      `Write a deep, insightful blog post based on this title: "${title}"`
    );

    return successResponse(result);
  } catch (error: any) {
    console.error('Generation error:', error.message);
    return errorResponse(error.message || 'Generation failed');
  }
}
