/**
 * messages-loader 测试：修复 `MISSING_MESSAGE: playground` 的回归守卫。
 *
 * 根因：后端 /api/v1/messages 服务的是 aster-cloud 的界面文案，**不含本文档站特有的
 * namespace**（playground/devSite/devNav/docsNav/devFooter）。loader 此前直接用后端响应
 * 替换内嵌副本 → dev namespace 整个消失 → next-intl 报 MISSING_MESSAGE。
 *
 * 修复：内嵌副本是权威基底，后端只能 deep-merge 叠加。本测试钉住该行为。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadMessages } from './messages-loader';

describe('messages-loader（dev 站 namespace 保留）', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('后端响应不含 playground（cloud 文案）→ 内嵌 playground 仍保留', async () => {
    // 模拟后端返回 cloud 的文案树（无 playground/devSite 等 dev namespace）。
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ common: { signIn: '登录' }, dashboard: {} }), { status: 200 })
    ) as unknown as typeof fetch;

    const msgs = await loadMessages('zh');
    // dev 特有 namespace 必须来自内嵌、不被后端响应冲掉。
    expect(msgs).toHaveProperty('playground');
    expect((msgs.playground as Record<string, unknown>).title).toBeTruthy();
    // 后端对共有 key 的覆盖仍生效。
    expect((msgs.common as Record<string, unknown>).signIn).toBe('登录');
  });

  it('后端 fetch 失败 → 纯内嵌（fail-open，playground 在）', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const msgs = await loadMessages('zh');
    expect(msgs).toHaveProperty('playground');
  });

  it('后端 404 → 纯内嵌（playground 在）', async () => {
    global.fetch = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    const msgs = await loadMessages('en');
    expect(msgs).toHaveProperty('playground');
  });
});
