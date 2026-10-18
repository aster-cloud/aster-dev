import { describe, expect, it } from 'vitest';
import { createEngine, findRuleLine } from './engine';
import { GUARD_SOURCE, SUPPORT_BOT, SUSPENDED_BOT, toGuardRequest } from './scenario';

const engine = createEngine(GUARD_SOURCE);
const refund = (amount: number, bot = SUPPORT_BOT) =>
  engine.decide(toGuardRequest(bot, { tool: 'issue_refund', args: { order_id: 'ORD-1', amount } }));

describe('engine.decide（真实 aster-lang-ts 浏览器引擎）', () => {
  it('编译无诊断', () => expect(engine.diagnostics).toEqual([]));

  it('小额退款 → ALLOW，命中 Otherwise 行', () => {
    const d = refund(40);
    expect(d).toMatchObject({ outcome: 'ALLOW', reason: null, reasonCode: null });
    expect(GUARD_SOURCE.split('\n')[d.ruleLine! - 1]).toContain('Otherwise allow.');
  });

  it('金额边界：9999 ALLOW，10000 ESCALATE（at least 含等号）', () => {
    expect(refund(9999).outcome).toBe('ALLOW');
    expect(refund(10000)).toMatchObject({ outcome: 'ESCALATE', reason: 'large refund', role: null });
  });

  it('删除客户记录（context 无 amount）→ REQUIRE_APPROVAL by DPO', () => {
    const d = engine.decide(toGuardRequest(SUPPORT_BOT, { tool: 'delete_customer_record', args: { customer_id: 'cust_8812' } }));
    expect(d).toMatchObject({ outcome: 'REQUIRE_APPROVAL', role: 'Data Protection Officer', reason: 'customer record deletion' });
    expect(GUARD_SOURCE.split('\n')[d.ruleLine! - 1]).toContain('"customer record deletion"');
  });

  it('暂停主体 → DENY，无论动作', () => {
    expect(refund(10, SUSPENDED_BOT)).toMatchObject({ outcome: 'DENY', reason: 'suspended principal' });
    const del = engine.decide(toGuardRequest(SUSPENDED_BOT, { tool: 'delete_customer_record', args: { customer_id: 'c' } }));
    expect(del.outcome).toBe('DENY');
  });

  it('退款缺少 amount → 评估出错 → DENY evaluation_failed（与生产 fail-closed 一致）', () => {
    const d = engine.decide(toGuardRequest(SUPPORT_BOT, { tool: 'issue_refund', args: { order_id: 'ORD-1' } }));
    expect(d).toMatchObject({ outcome: 'DENY', reasonCode: 'evaluation_failed', ruleLine: null });
  });
});

describe('createEngine 容错', () => {
  it('编译失败时保留上一个可用规则，并给出带行号的诊断', () => {
    const broken = createEngine(GUARD_SOURCE.replace('Otherwise allow.', 'Otherwise allw.'), engine);
    expect(broken.diagnostics.length).toBeGreaterThan(0);
    expect(broken.diagnostics[0].line).toBeGreaterThan(0);
    expect(broken.decide(toGuardRequest(SUPPORT_BOT, { tool: 'issue_refund', args: { order_id: 'o', amount: 40 } })).outcome).toBe('ALLOW');
  });

  it('首次即编译失败且无上一个规则 → 一律 DENY evaluation_failed', () => {
    const none = createEngine('Module x.\nnot a rule');
    expect(none.diagnostics.length).toBeGreaterThan(0);
    expect(none.decide(toGuardRequest(SUPPORT_BOT, { tool: 'lookup_order', args: { order_id: 'o' } })).reasonCode).toBe('evaluation_failed');
  });
});

describe('findRuleLine', () => {
  it('找不到对应理由时返回 null（用户改写规则后不误标）', () => {
    expect(findRuleLine(GUARD_SOURCE, 'DENY', 'no such reason')).toBeNull();
  });
});
