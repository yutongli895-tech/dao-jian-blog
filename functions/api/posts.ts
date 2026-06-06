import { authenticate, queryDb, errorResponse, successResponse } from '../utils';

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE published = 1';
    let params: any[] = [];

    if (search) {
      whereClause += ' AND (title_cn LIKE ? OR title_en LIKE ? OR content_cn LIKE ? OR content_en LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const postsResult = await queryDb(context,
      `SELECT * FROM posts ${whereClause} ORDER BY date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      'all'
    ) as any;
    const posts = postsResult.results || [];

    const countResult = await queryDb(context,
      `SELECT COUNT(*) as count FROM posts ${whereClause}`,
      params,
      'get'
    ) as any;

    return new Response(JSON.stringify({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total: countResult?.count || 0,
          totalPages: Math.ceil((countResult?.count || 0) / limit),
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

export async function onRequestPost(context: any) {
  // 认证
  const authResult = await authenticate(context);
  if (authResult instanceof Response) return authResult;

  try {
    const body = await context.request.json();
    const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published } = body;

    // 验证必填字段
    if (!title_cn || !title_en || !content_cn || !content_en) {
      return errorResponse('Missing required fields', 400);
    }

    const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');

    const result = await queryDb(context,
      `INSERT INTO posts (title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image || '', date, published || 1],
      'run'
    ) as any;

    return successResponse({ id: result.meta?.last_row_id });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
