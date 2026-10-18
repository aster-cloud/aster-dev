import { describe, expect, it } from 'vitest';
import { blockedMessage, blockedReason, type Translate } from './blocked';
import { createEngine } from './engine';
import { guardianReducer, initialState, type GuardianState } from './machine';
import { GUARD_SOURCE, SUPPORT_BOT, SUSPENDED_BOT, toGuardRequest, type Principal, type ToolCall } from './scenario';

// 伪翻译：agent.blocked 按真实英文模板插值，其余键原样返回，便于断言来源。
const t: Translate = (key, values) =>
  key === 'agent.blocked' ? `Blocked by Aster Guard: ${values?.reason} (decision ${values?.decisionId})` : key;

const engine = createEngine(GUARD_SOURCE);

function requested(state: GuardianState, principal: Principal, call: ToolCall, at = 1_000): GuardianState {
  const decision = engine.decide(toGuardRequest(principal, call));
  return guardianReducer(state, { type: 'request', principal, call, decision, at });
}

const bigRefund: ToolCall = { tool: 'issue_refund', args: { order_id: 'INV-77', amount: 12000 } };

describe('blockedReason / blockedMessage（对齐 aster-guard proxy.ts 的 blocked()）', () => {
  it('驳回后代理收到的仍是裁决理由，而不是审批人说明', () => {
    const pending = requested(initialState, SUPPORT_BOT, bigRefund);
    const s = guardianReducer(pending, { type: 'reject', approvalId: 'apr-1', approver: 'dana', comment: 'Invoice not delivered yet', at: 2_000 });
    expect(s.steps[0].status).toBe('rejected');
    expect(blockedMessage(s.steps[0], t)).toBe('Blocked by Aster Guard: large refund (decision dec-1)');
  });

  it('过期后错误行保留裁决理由', () => {
    const pending = requested(initialState, SUPPORT_BOT, bigRefund);
    const s = guardianReducer(pending, { type: 'expire', approvalId: 'apr-1', at: 2_000 });
    expect(s.steps[0].status).toBe('expired');
    expect(blockedReason(s.steps[0], t)).toBe('large refund');
  });

  it('守卫直接拒绝取 reason', () => {
    const s = requested(initialState, SUSPENDED_BOT, { tool: 'issue_refund', args: { order_id: 'ORD-2001', amount: 10 } });
    expect(blockedMessage(s.steps[0], t)).toBe('Blocked by Aster Guard: suspended principal (decision dec-1)');
  });

  it('没有 reason 时取 reasonCode 文案（fail-closed）', () => {
    const s = requested(initialState, SUPPORT_BOT, { tool: 'issue_refund', args: { order_id: 'ORD-1' } });
    expect(s.steps[0].decision).toMatchObject({ reason: null, reasonCode: 'evaluation_failed' });
    expect(blockedReason(s.steps[0], t)).toBe('reasonCode.evaluation_failed');
  });
});
