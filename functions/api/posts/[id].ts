import * as jose from 'jose';

async function authenticate(request: Request, env: { JWT_SECRET?: string }) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  if (!token) return null;
  const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET || 'dao-secret-key');
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return null;
  }
}

export const onRequestPut: PagesFunction<{ DB: D1Database; JWT_SECRET?: string }> = async ({ request, env, params }) => {
  const user = await authenticate(request, env);
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

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env, params }) => {
  const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(params.id).first();
  if (post) {
    return new Response(JSON.stringify(post), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({ error: 'Post not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestDelete: PagesFunction<{ DB: D1Database; JWT_SECRET?: string }> = async ({ request, env, params }) => {
  const user = await authenticate(request, env);
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
