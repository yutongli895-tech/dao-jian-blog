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

// ========================
// AI 服务商清单
// ========================
// 每家一把独立 Key（环境变量），互为降级。keyEnv 支持多个别名，
// 因为控制台里到底叫 SENSENOVA_API_KEY 还是 SENSETIME_API_KEY 常常记不清，
// 别名解析 + 把「实际命中的变量名」回报出去，是排查「明明配了却报未配置」的唯一手段。
//
// thinkingOff 三档（各家关「思考」的写法不一样，写错就白等十几秒甚至报 400）：
//   modelscope = enable_thinking:false + chat_template_kwargs
//   sensenova  = reasoning_effort:"none"
//   none       = 不处理

export type ThinkingStyle = 'modelscope' | 'sensenova' | 'none';

export interface ProviderDef {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  keyEnv: string[];
  thinkingOff: ThinkingStyle;
  supportsJsonFormat: boolean;
  modelEnv?: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'modelscope',
    label: '魔搭 ModelScope',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    model: 'deepseek-ai/DeepSeek-V4-Flash',
    keyEnv: ['AI_API_KEY', 'MODELSCOPE_API_KEY', 'MODELSCOPE_KEY', 'MODELSCOPE_TOKEN'],
    thinkingOff: 'modelscope',
    supportsJsonFormat: true,
    modelEnv: 'AI_MODEL',
  },
  {
    id: 'sensenova',
    label: '商汤日日新',
    baseUrl: 'https://token.sensenova.cn/v1',
    model: 'sensenova-6.8-flash-lite',
    keyEnv: ['SENSENOVA_API_KEY', 'SENSENOVA_KEY', 'SENSETIME_API_KEY', 'SENSE_NOVA_API_KEY'],
    thinkingOff: 'sensenova',
    supportsJsonFormat: false,
    modelEnv: 'SENSENOVA_MODEL',
  },
  {
    id: 'inferx',
    label: 'InferX',
    baseUrl: 'https://model.inferx.net/endpoints/v1',
    model: 'deepseek-v4.1-flash-1017-basic',
    keyEnv: ['INFERX_API_KEY', 'INFERX_KEY'],
    thinkingOff: 'modelscope',
    supportsJsonFormat: false,
    modelEnv: 'INFERX_MODEL',
  },
];

// 别名解析：返回命中的第一个非空环境变量
export function resolveKey(env: any, names: string[]): { value: string; name: string } | null {
  for (const name of names) {
    const raw = env?.[name];
    if (typeof raw === 'string' && raw.trim()) {
      return { value: raw.trim(), name };
    }
  }
  return null;
}

export function getProvider(id?: string): ProviderDef | undefined {
  if (!id) return undefined;
  return PROVIDERS.find((p) => p.id === id);
}

export function listProvidersStatus(env: any) {
  return PROVIDERS.map((p) => {
    const hit = resolveKey(env, p.keyEnv);
    return {
      id: p.id,
      label: p.label,
      model: (p.modelEnv && env?.[p.modelEnv]) || p.model,
      configured: !!hit,
      keySource: hit?.name || null,
    };
  });
}

function applyThinkingOff(body: any, style: ThinkingStyle) {
  if (style === 'modelscope') {
    body.enable_thinking = false;
    body.chat_template_kwargs = { ...(body.chat_template_kwargs || {}), enable_thinking: false };
  } else if (style === 'sensenova') {
    body.reasoning_effort = 'none';
  }
  return body;
}

// 从模型回复里抠 JSON：先去 markdown 围栏，再退到首尾大括号
function parseModelJson(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fallthrough */
      }
    }
    return { raw: text };
  }
}

export interface AiCallResult {
  data: any;
  provider: string;
  providerLabel: string;
  model: string;
  tried: { provider: string; ok: boolean; error?: string }[];
}

// 单家请求超时 24s、总预算 27s：Cloudflare Pages Functions 请求上限 30s，
// 留 3s 给网络与 JSON 解析。预算不足时不再发起新的一家，直接把失败原因写明。
const PER_PROVIDER_TIMEOUT_MS = 24000;
const TOTAL_BUDGET_MS = 27000;

async function callOne(
  provider: ProviderDef,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: any = applyThinkingOff(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      },
      provider.thinkingOff
    );

    if (provider.supportsJsonFormat) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as any;
    const text = data.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      throw new Error('上游返回空内容');
    }
    return parseModelJson(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 调用 AI（多服务商 + 自动降级）
 * @param preferred 指定的服务商 id，未指定则按 PROVIDERS 顺序（魔搭 → 商汤 → InferX）
 */
export async function callAI(
  context: any,
  systemPrompt: string,
  userContent: string,
  preferred?: string
): Promise<AiCallResult> {
  const env = context.env || {};

  // 指定了服务商就只试它（用户明确选择时不该偷偷换家），否则全家降级
  const chain: ProviderDef[] = [];
  const want = getProvider(preferred);
  if (want) {
    chain.push(want);
  } else {
    chain.push(...PROVIDERS);
  }

  const tried: AiCallResult['tried'] = [];
  const startedAt = Date.now();

  for (const provider of chain) {
    const hit = resolveKey(env, provider.keyEnv);
    if (!hit) {
      tried.push({ provider: provider.id, ok: false, error: `未配置密钥（${provider.keyEnv[0]}）` });
      continue;
    }

    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    // 剩余预算不够一次像样的请求，就先不发了，把话说清楚
    if (remaining < 6000) {
      tried.push({ provider: provider.id, ok: false, error: `总耗时预算不足（剩 ${Math.max(0, remaining)}ms）` });
      continue;
    }

    // 一把 Key 里允许逗号分隔多个，随机轮询分摊额度
    const keys = hit.value.split(',').map((k: string) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      tried.push({ provider: provider.id, ok: false, error: '密钥为空' });
      continue;
    }
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const model = (provider.modelEnv && env?.[provider.modelEnv]) || provider.model;

    try {
      const data = await callOne(
        provider,
        apiKey,
        model,
        systemPrompt,
        userContent,
        Math.min(PER_PROVIDER_TIMEOUT_MS, remaining)
      );
      tried.push({ provider: provider.id, ok: true });
      return { data, provider: provider.id, providerLabel: provider.label, model, tried };
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? `超时（>${Math.min(PER_PROVIDER_TIMEOUT_MS, remaining)}ms）` : e?.message || String(e);
      tried.push({ provider: provider.id, ok: false, error: msg });
      console.error(`[AI] ${provider.id} 失败：${msg}`);
    }
  }

  const detail = tried.map((t) => `${t.provider}: ${t.ok ? 'ok' : t.error}`).join('；');
  throw new Error(`所有 AI 服务商均不可用 —— ${detail}`);
}

// 兼容旧函数名（原代码里叫 callAgnesAI），返回纯数据
export async function callAgnesAI(context: any, systemPrompt: string, userContent: string) {
  const result = await callAI(context, systemPrompt, userContent);
  return result.data;
}
