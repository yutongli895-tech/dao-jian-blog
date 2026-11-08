import { authenticate, listProvidersStatus, callAI, PROVIDERS, resolveKey } from '../utils';

/**
 * AI 服务商自检
 *
 *   GET /api/ai-status            → 只看密钥绑定情况（不消耗额度，无需登录，方便自查）
 *   GET /api/ai-status?probe=1    → 逐家发一个最小请求，验证密钥真的能用（需登录）
 */
export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const probe = url.searchParams.get('probe') === '1';

  const providers = listProvidersStatus(context.env);
  const configured = providers.filter((p) => p.configured);

  const base: any = {
    ok: providers.some((p) => p.configured),
    providers,
    defaultProvider: configured[0]?.id || null,
    warnings: [] as string[],
  };

  if (providers.every((p) => !p.configured)) {
    base.warnings.push('所有服务商的密钥都未绑定：请在 Cloudflare 控制台添加 AI_API_KEY / SENSENOVA_API_KEY / INFERX_API_KEY 任意一把 Secret。');
  }

  if (!probe) return json(base);

  // 探测会真实消耗额度，必须登录
  const authResult = await authenticate(context);
  if (authResult instanceof Response) return authResult;

  const results: any[] = [];
  for (const p of PROVIDERS) {
    const hit = resolveKey(context.env, p.keyEnv);
    if (!hit) {
      results.push({ id: p.id, label: p.label, status: 'unconfigured' });
      continue;
    }
    const t0 = Date.now();
    try {
      const r = await callAI(
        context,
        'You are a health check. Reply with exactly: OK',
        'Reply with exactly: OK',
        p.id
      );
      const text = typeof r.data?.raw === 'string' ? r.data.raw : JSON.stringify(r.data);
      results.push({
        id: p.id,
        label: p.label,
        status: 'ok',
        model: r.model,
        ms: Date.now() - t0,
        sample: text.slice(0, 80),
      });
    } catch (e: any) {
      results.push({
        id: p.id,
        label: p.label,
        status: 'failed',
        ms: Date.now() - t0,
        error: String(e?.message || e).slice(0, 300),
      });
    }
  }

  return json({ ...base, probe: true, results });
}

function json(data: any) {
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
