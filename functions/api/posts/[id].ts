import { authenticate, queryDb, errorResponse, successResponse } from '../../utils';

export async function onRequestGet(context: any) {
  try {
    const id = context.params.id;
    const post = await queryDb(context, 'SELECT * FROM posts WHERE id = ?', [id], 'get');

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    return successResponse(post);
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

export async function onRequestPut(context: any) {
  // 认证
  const authResult = await authenticate(context);
  if (authResult instanceof Response) return authResult;

  try {
    const id = context.params.id;
    const body = await context.request.json();
    const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published } = body;

    await queryDb(context,
      `UPDATE posts SET title_cn=?, title_en=?, excerpt_cn=?, excerpt_en=?, content_cn=?, content_en=?, category_cn=?, category_en=?, image=?, published=?
       WHERE id = ?`,
      [title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published, id],
      'run'
    );

    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

export async function onRequestDelete(context: any) {
  // 认证
  const authResult = await authenticate(context);
  if (authResult instanceof Response) return authResult;

  try {
    const id = context.params.id;
    await queryDb(context, 'DELETE FROM posts WHERE id = ?', [id], 'run');
    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
