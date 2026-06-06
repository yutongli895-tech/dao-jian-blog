import * as jose from 'jose';

// 认证中间件
export async function authenticate(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const JWT_SECRET = new TextEncoder().encode(context.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 数据库辅助函数
export function queryDb(context: any, sql: string, params: any[] = [], type: 'all' | 'get' | 'run' = 'get') {
  const db = context.env.DB;
  if (!db) throw new Error('D1 database not bound');

  const stmt = db.prepare(sql);

  if (type === 'all') {
    return stmt.bind(...params).all();
  }
  if (type === 'get') {
    return stmt.bind(...params).first();
  }
  if (type === 'run') {
    return stmt.bind(...params).run();
  }
}

// 统一错误响应
export function errorResponse(message: string, status: number = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 统一成功响应
export function successResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Agnes AI 调用函数（OpenAI 兼容格式）
export async function callAgnesAI(context: any, systemPrompt: string, userContent: string) {
  const baseUrl = context.env.AGNES_BASE_URL || 'https://api.agnes-2.0-flash.com/v1';
  const model = context.env.AGNES_MODEL || 'Agnes-2.0-Flash';

  const apiKeyString = context.env.AGNES_API_KEY;
  if (!apiKeyString) throw new Error('AGNES_API_KEY not configured');

  const apiKeys = apiKeyString.split(',').map((k: string) => k.trim()).filter(Boolean);
  if (apiKeys.length === 0) throw new Error('No valid API Keys found');

  const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Agnes API error (${res.status}): ${errText}`);
  }

  const data = await res.json() as any;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Agnes API');

  return JSON.parse(text);
}
