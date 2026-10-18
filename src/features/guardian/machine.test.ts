import { describe, expect, it } from 'vitest';
import type { Decision } from './engine';
import { DEMO_APPROVAL_TTL_MS, guardianReducer, initialState, type GuardianAction, type GuardianState } from './machine';
import { SUPPORT_BOT } from './scenario';

const T0 = Date.UTC(2026, 9, 18, 9, 0, 0);
const allow: Decision = { outcome: 'ALLOW', reason: null, role: null, reasonCode: null, ruleLine: 13 };
const needsDpo: Decision = { outcome: 'REQUIRE_APPROVAL', reason: 'customer record deletion', role: 'Data Protection Officer', reasonCode: null, ruleLine: 10 };
const escalate: Decision = { outcome: 'ESCALATE', reason: 'large refund', role: null, reasonCode: null, ruleLine: 11 };
const run = (actions: GuardianAction[], from: GuardianState = initialState) => actions.reduce(guardianReducer, from);
const del = { tool: 'delete_customer_record' as const, args: { customer_id: 'cust_8812' } };

describe('guardianReducer', () => {
  it('ALLOW → 立即执行，1 个决策证据（success=true）', () => {
    const s = run([{ type: 'request', principal: SUPPORT_BOT, call: { tool: 'issue_refund', args: { order_id: 'o', amount: 40 } }, decision: allow, at: T0 }]);
    expect(s.steps[0].status).toBe('executed');
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ eventType: 'ACTION_GUARD_DECISION', success: true, performedBy: 'support-bot', tenantId: 'demo', timestamp: '2026-10-18T09:00:00Z' });
  });

  it('REQUIRE_APPROVAL → 待审批，带角色与过期时间', () => {
    const s = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    expect(s.steps[0]).toMatchObject({ status: 'pending', requiredRole: 'Data Protection Officer', expiresAt: T0 + DEMO_APPROVAL_TTL_MS });
    expect(s.events[0].success).toBe(false);
  });

  it('批准 → approved，追加审批证据（success=true，performedBy=审批人）', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'approve', approvalId: s1.steps[0].approvalId!, approver: 'dana', at: T0 + 5000 });
    expect(s2.steps[0]).toMatchObject({ status: 'approved', decidedBy: 'dana' });
    expect(s2.events[1]).toMatchObject({ eventType: 'ACTION_GUARD_APPROVAL', success: true, performedBy: 'dana' });
  });

  it('请求方不能审批自己的请求', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'approve', approvalId: s1.steps[0].approvalId!, approver: 'support-bot', at: T0 + 1000 });
    expect(s2.error).toBe('self_approval');
    expect(s2.steps[0].status).toBe('pending');
    expect(s2.events).toHaveLength(1);
  });

  it('拒绝必须附说明；附说明后 rejected，审批证据 success=false', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: { tool: 'issue_refund', args: { order_id: 'INV-77', amount: 12000 } }, decision: escalate, at: T0 }]);
    const id = s1.steps[0].approvalId!;
    const noComment = guardianReducer(s1, { type: 'reject', approvalId: id, approver: 'dana', comment: '  ', at: T0 + 1000 });
    expect(noComment.error).toBe('comment_required');
    expect(noComment.events).toHaveLength(1);
    const ok = guardianReducer(s1, { type: 'reject', approvalId: id, approver: 'dana', comment: 'invoice not delivered yet', at: T0 + 1000 });
    expect(ok.steps[0]).toMatchObject({ status: 'rejected', comment: 'invoice not delivered yet' });
    expect(ok.events[1]).toMatchObject({ eventType: 'ACTION_GUARD_APPROVAL', success: false });
  });

  it('过期 → expired（按 DENY 处理），审批证据由 SYSTEM 发起', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'tick', at: T0 + DEMO_APPROVAL_TTL_MS + 1000 });
    expect(s2.steps[0].status).toBe('expired');
    expect(s2.events[1]).toMatchObject({ eventType: 'ACTION_GUARD_APPROVAL', performedBy: 'SYSTEM', success: false });
  });

  it('重复 / 过期后的审批为无操作，不追加第二个证据块', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const id = s1.steps[0].approvalId!;
    const once = guardianReducer(s1, { type: 'approve', approvalId: id, approver: 'dana', at: T0 + 1000 });
    const twice = guardianReducer(once, { type: 'approve', approvalId: id, approver: 'dana', at: T0 + 2000 });
    expect(twice.events).toHaveLength(2);
    expect(twice.error).toBe('not_pending');
    const expired = guardianReducer(guardianReducer(s1, { type: 'expire', approvalId: id, at: T0 + 3000 }), { type: 'approve', approvalId: id, approver: 'dana', at: T0 + 4000 });
    expect(expired.steps[0].status).toBe('expired');
    expect(expired.events).toHaveLength(2);
  });

  it('恰好在截止时刻审批（未 tick）仍然有效', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'approve', approvalId: s1.steps[0].approvalId!, approver: 'dana', at: T0 + DEMO_APPROVAL_TTL_MS });
    expect(s2.steps[0].status).toBe('approved');
  });

  it('截止后审批（未 tick）惰性过期：SYSTEM 记证据、not_pending', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'approve', approvalId: s1.steps[0].approvalId!, approver: 'dana', at: T0 + DEMO_APPROVAL_TTL_MS + 1 });
    expect(s2.steps[0].status).toBe('expired');
    expect(s2.events).toHaveLength(2);
    expect(s2.events[1]).toMatchObject({ eventType: 'ACTION_GUARD_APPROVAL', performedBy: 'SYSTEM', success: false });
    expect(s2.error).toBe('not_pending');
  });

  it('截止后拒绝（附说明，未 tick）同样惰性过期', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'reject', approvalId: s1.steps[0].approvalId!, approver: 'dana', comment: 'too late', at: T0 + DEMO_APPROVAL_TTL_MS + 1 });
    expect(s2.steps[0].status).toBe('expired');
    expect(s2.events).toHaveLength(2);
    expect(s2.events[1]).toMatchObject({ performedBy: 'SYSTEM', success: false });
    expect(s2.error).toBe('not_pending');
  });

  it('DENY / evaluation_failed → blocked，决策证据 reason 记录 reasonCode', () => {
    const s = run([{ type: 'request', principal: SUPPORT_BOT, call: { tool: 'issue_refund', args: { order_id: 'o' } },
      decision: { outcome: 'DENY', reason: null, role: null, reasonCode: 'evaluation_failed', ruleLine: null }, at: T0 }]);
    expect(s.steps[0].status).toBe('blocked');
    expect(s.events[0]).toMatchObject({ success: false, reason: 'evaluation_failed' });
  });

  it('reset 回到初始状态', () => {
    const s = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }, { type: 'reset' }]);
    expect(s).toEqual(initialState);
  });
});
