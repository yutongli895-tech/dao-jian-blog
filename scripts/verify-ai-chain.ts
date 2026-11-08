// 零网络回归：桩件替换 fetch，验证多服务商降级链
// 直接 import 线上同一份 functions/utils.ts，不另抄逻辑
import { callAI, listProvidersStatus, resolveKey, PROVIDERS } from '../functions/utils.ts';

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, extra?: any) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}`, extra === undefined ? '' : JSON.stringify(extra));
  }
}

type Call = { url: string; body: any; auth: string };
let calls: Call[] = [];

function stubFetch(handler: (call: Call) => { status?: number; json?: any; text?: string }) {
  calls = [];
  (globalThis as any).fetch = async (url: string, init: any) => {
    const call: Call = { url, body: JSON.parse(init.body), auth: init.headers.Authorization };
    calls.push(call);
    const r = handler(call);
    const status = r.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => r.text ?? JSON.stringify(r.json ?? {}),
      json: async () => r.json ?? {},
    };
  };
}

const chatOk = (content: string) => ({
  json: { choices: [{ message: { content } }] },
});

const envOf = (o: Record<string, string>) => ({ env: o });

async function main() {
  console.log('\n[1] 只配商汤：请求体应带 reasoning_effort:none，且不带 response_format');
  stubFetch(() => chatOk('{"title":"甲","excerpt":"乙","content":"丙","category":"哲学"}'));
  let r = await callAI(envOf({ SENSENOVA_API_KEY: 'sk-test' }), 'sys', 'user');
  ok('命中 sensenova', r.provider === 'sensenova', r.provider);
  ok('模型 id 正确', r.model === 'sensenova-6.8-flash-lite', r.model);
  ok('调用 1 次', calls.length === 1, calls.length);
  ok('URL 打到 token.sensenova.cn/v1/chat/completions', calls[0].url === 'https://token.sensenova.cn/v1/chat/completions', calls[0].url);
  ok('带 reasoning_effort:none', calls[0].body.reasoning_effort === 'none', calls[0].body.reasoning_effort);
  ok('不带 response_format', calls[0].body.response_format === undefined);
  ok('解析出 title', r.data.title === '甲', r.data);

  console.log('\n[2] 魔搭：应带 enable_thinking:false + response_format');
  stubFetch(() => chatOk('{"title":"魔","excerpt":"a","content":"b","category":"科技"}'));
  r = await callAI(envOf({ AI_API_KEY: 'ms-test' }), 'sys', 'user');
  ok('命中 modelscope', r.provider === 'modelscope', r.provider);
  ok('带 enable_thinking:false', calls[0].body.enable_thinking === false);
  ok('带 chat_template_kwargs.enable_thinking', calls[0].body.chat_template_kwargs?.enable_thinking === false);
  ok('带 response_format=json_object', calls[0].body.response_format?.type === 'json_object');

  console.log('\n[3] 魔搭 500 → 自动降级到商汤');
  stubFetch((c) =>
    c.url.includes('modelscope')
      ? { status: 500, text: 'upstream boom' }
      : chatOk('{"title":"降级成功","excerpt":"e","content":"c","category":"哲学"}')
  );
  r = await callAI(envOf({ AI_API_KEY: 'a', SENSENOVA_API_KEY: 'b' }), 'sys', 'user');
  ok('最终由 sensenova 完成', r.provider === 'sensenova', r.provider);
  ok('试了 2 家', r.tried.length === 2, r.tried);
  ok('第一家失败有原因', r.tried[0].ok === false && /HTTP 500/.test(r.tried[0].error || ''), r.tried[0]);
  ok('拿到正文', r.data.title === '降级成功');

  console.log('\n[4] 三家全挂 → 抛错，错误信息逐家写明原因');
  stubFetch(() => ({ status: 429, text: 'rate limited' }));
  let threw = '';
  try {
    await callAI(envOf({ AI_API_KEY: 'a', SENSENOVA_API_KEY: 'b', INFERX_API_KEY: 'c' }), 'sys', 'user');
  } catch (e: any) {
    threw = e.message;
  }
  ok('抛出异常', !!threw);
  ok('三家都被试过', calls.length === 3, calls.length);
  ok('错误里含 429', /429/.test(threw), threw);
  ok('错误里含三家 id', /modelscope/.test(threw) && /sensenova/.test(threw) && /inferx/.test(threw), threw);

  console.log('\n[5] 指定 provider → 只试这一家，不偷偷换家');
  stubFetch((c) =>
    c.url.includes('sensenova') ? { status: 503, text: 'down' } : chatOk('{"title":"不该到这里"}')
  );
  threw = '';
  try {
    await callAI(envOf({ AI_API_KEY: 'a', SENSENOVA_API_KEY: 'b' }), 'sys', 'user', 'sensenova');
  } catch (e: any) {
    threw = e.message;
  }
  ok('只调用 1 次', calls.length === 1, calls.length);
  ok('确实抛错', !!threw, threw);

  console.log('\n[6] 密钥别名：SENSETIME_API_KEY 也能命中商汤');
  const hit = resolveKey({ SENSETIME_API_KEY: 'alias' }, PROVIDERS.find((p) => p.id === 'sensenova')!.keyEnv);
  ok('别名命中', hit?.name === 'SENSETIME_API_KEY', hit);

  console.log('\n[7] 模型返回 markdown 围栏 → 仍能解析成 JSON');
  stubFetch(() => chatOk('```json\n{"title":"围栏","excerpt":"e","content":"c","category":"哲学"}\n```'));
  r = await callAI(envOf({ INFERX_API_KEY: 'x' }), 'sys', 'user');
  ok('剥掉围栏后解析成功', r.data.title === '围栏', r.data);
  ok('没有被降级成 raw', r.data.raw === undefined, r.data);

  console.log('\n[8] 返回纯文本（非 JSON）→ 退化为 {raw}，不崩');
  stubFetch(() => chatOk('OK'));
  r = await callAI(envOf({ INFERX_API_KEY: 'x' }), 'sys', 'user');
  ok('得到 raw 兜底', r.data.raw === 'OK', r.data);

  console.log('\n[9] 全未配置 → 抛错并说明缺哪把密钥');
  stubFetch(() => chatOk('x'));
  threw = '';
  try {
    await callAI(envOf({}), 'sys', 'user');
  } catch (e: any) {
    threw = e.message;
  }
  ok('没有发起任何请求', calls.length === 0, calls.length);
  ok('错误提到 AI_API_KEY', /AI_API_KEY/.test(threw), threw);

  console.log('\n[10] 多家已配 → 默认顺序为 魔搭→商汤→InferX；自定义模型名生效');
  stubFetch(() => chatOk('{"title":"t"}'));
  r = await callAI(envOf({ AI_API_KEY: 'a', SENSENOVA_API_KEY: 'b', INFERX_API_KEY: 'c', INFERX_MODEL: 'custom-model-9' }), 'sys', 'user', 'inferx');
  ok('inferx 用自定义模型名', calls[0].body.model === 'custom-model-9', calls[0].body.model);

  console.log('\n[11] listProvidersStatus：只报绑定与否 + 命中的变量名');
  const st = listProvidersStatus({ SENSETIME_API_KEY: 'z' });
  ok('三家都有条目', st.length === 3, st.length);
  ok('只有商汤 configured', st.filter((s) => s.configured).length === 1 && st[1].configured, st);
  ok('keySource 是命中的变量名', st[1].keySource === 'SENSETIME_API_KEY', st[1].keySource);
  ok('未配的 keySource 为 null', st[0].keySource === null, st[0].keySource);

  console.log(`\n===== 结果：PASS ${pass} / FAIL ${fail} =====`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('测试脚本自身出错：', e);
  process.exit(1);
});
