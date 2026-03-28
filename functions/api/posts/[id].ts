import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dao-secret-key');

async function authenticate(request: Request) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

export const onRequestPut: PagesFunction<{ DB: D1Database }> = async ({ request, env, params }) => {
  const user = await authenticate(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published } = await request.json() as any;
  
  await env.DB.prepare(`
    UPDATE posts SET title_cn=?, title_en=?, excerpt_cn=?, excerpt_en=?, content_cn=?, content_en=?, category_cn=?, category_en=?, image=?, published=?
    WHERE id = ?
  `).bind(title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, published, params.id).run();
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const onRequestDelete: PagesFunction<{ DB: D1Database }> = async ({ request, env, params }) => {
  const user = await authenticate(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(params.id).run();
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
