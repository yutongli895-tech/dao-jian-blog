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

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM posts ORDER BY date DESC').all();
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const user = await authenticate(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image } = await request.json() as any;
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
  
  const result = await env.DB.prepare(`
    INSERT INTO posts (title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(title_cn, title_en, excerpt_cn, excerpt_en, content_cn, content_en, category_cn, category_en, image, date).run();
  
  return new Response(JSON.stringify({ id: result.meta.last_row_id }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
