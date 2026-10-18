import { describe, expect, it } from 'vitest';
import { createEngine } from './engine';
import { previewDecision } from './preview';
import { guardianReducer, initialState, type Step } from './machine';
import { GUARD_SOURCE, SUPPORT_BOT, toGuardRequest, type ToolCall } from './scenario';

function stepFor(call: ToolCall): Step {
  const engine = createEngine(GUARD_SOURCE);
  const decision = engine.decide(toGuardRequest(SUPPORT_BOT, call));
  const state = guardianReducer(initialState, { type: 'request', principal: SUPPORT_BOT, call, decision, at: 1000 });
  return state.steps[0];
}

const refund = (amount: number): ToolCall => ({ tool: 'issue_refund', args: { order_id: 'ORD-1', amount } });

describe('previewDecision', () => {
  it('没有请求时无预览', () => {
    expect(previewDecision(createEngine(GUARD_SOURCE), undefined)).toBeNull();
  });

  it('内置规则下与记录裁决一致且非预览', () => {
    const step = stepFor(refund(40));
    const p = previewDecision(createEngine(GUARD_SOURCE), step)!;
    expect(p.decision.outcome).toBe(step.decision.outcome);
    expect(p.live).toBe(false);
  });

  it('与 Cedar 面板同一判定：仅行尾空白不同仍视为内置规则', () => {
    const step = stepFor(refund(40));
    const padded = createEngine(GUARD_SOURCE.replace(/\n/g, '  \n'));
    expect(previewDecision(padded, step)!.live).toBe(false);
  });

  it('把 10000 改成 5000 后 6000 的退款预览为 ESCALATE', () => {
    const step = stepFor(refund(6000));
    expect(step.decision.outcome).toBe('ALLOW');
    const edited = createEngine(GUARD_SOURCE.replace('10000', '5000'));
    const p = previewDecision(edited, step)!;
    expect(p.decision.outcome).toBe('ESCALATE');
    expect(p.live).toBe(true);
  });

  it('规则改坏后预览沿用最近一次可用规则', () => {
    const step = stepFor(refund(6000));
    const good = createEngine(GUARD_SOURCE.replace('10000', '5000'));
    const broken = createEngine(GUARD_SOURCE.replace('Otherwise allow.', 'Otherwise allw.'), good);
    expect(broken.diagnostics.length).toBeGreaterThan(0);
    expect(previewDecision(broken, step)!.decision.outcome).toBe('ESCALATE');
  });
});
