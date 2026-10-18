import type { AuditFields } from './evidence';
import { javaInstant } from './evidence';
import type { Decision } from './engine';
import { GUARD_ENTRY, GUARD_MODULE, RULE_ID, type Principal, type ToolCall } from './scenario';

/**
 * 守卫演示状态机（纯 reducer）：请求 → 裁决 → 审批 / 拒绝 / 过期 → 执行或阻断，并按 aster-api 的
 * 事件形状产出证据事件（哈希由 use-guardian 异步计算，reducer 保持同步可测）。
 *
 * 与生产一致的约束：请求方不能自批；拒绝须附说明；过期视为 DENY 且由 SYSTEM 记证据；
 * 已结束的审批再次操作为无操作。
 */
export const DEMO_APPROVAL_TTL_MS = 60_000;

export type StepStatus = 'executed' | 'blocked' | 'pending' | 'approved' | 'rejected' | 'expired';
export type MachineError = 'self_approval' | 'comment_required' | 'not_pending' | null;

export interface Step {
  id: string;
  decisionId: string;
  approvalId: string | null;
  principal: Principal;
  call: ToolCall;
  decision: Decision;
  status: StepStatus;
  requiredRole: string | null;
  requestedAt: number;
  expiresAt: number | null;
  decidedBy: string | null;
  comment: string | null;
}

export interface GuardianState {
  steps: Step[];
  events: Omit<AuditFields, 'prevHash'>[];
  seq: number;
  error: MachineError;
}

export type GuardianAction =
  | { type: 'request'; principal: Principal; call: ToolCall; decision: Decision; at: number }
  | { type: 'approve'; approvalId: string; approver: string; at: number }
  | { type: 'reject'; approvalId: string; approver: string; comment: string; at: number }
  | { type: 'tick'; at: number }
  | { type: 'expire'; approvalId: string; at: number }
  | { type: 'reset' };

export const initialState: GuardianState = { steps: [], events: [], seq: 0, error: null };

const NEEDS_APPROVAL = new Set(['REQUIRE_APPROVAL', 'ESCALATE']);

function decisionEvent(step: Step): Omit<AuditFields, 'prevHash'> {
  const d = step.decision;
  return {
    eventType: 'ACTION_GUARD_DECISION',
    timestamp: javaInstant(step.requestedAt),
    tenantId: 'demo',
    performedBy: step.principal.id,
    policyModule: GUARD_MODULE,
    policyFunction: GUARD_ENTRY,
    toVersion: 1,
    success: d.outcome === 'ALLOW',
    reason: d.reasonCode,
    metadata: JSON.stringify({
      decisionId: step.decisionId, outcome: d.outcome, reason: d.reason, ruleId: RULE_ID,
      actionName: step.call.tool, approvalId: step.approvalId,
    }),
  };
}

function approvalEvent(step: Step, outcome: 'APPROVED' | 'REJECTED' | 'EXPIRED', at: number): Omit<AuditFields, 'prevHash'> {
  return {
    eventType: 'ACTION_GUARD_APPROVAL',
    timestamp: javaInstant(at),
    tenantId: 'demo',
    performedBy: step.decidedBy ?? 'SYSTEM',
    success: outcome === 'APPROVED',
    metadata: JSON.stringify({
      decisionId: step.decisionId, approvalId: step.approvalId, outcome,
      decidedBy: step.decidedBy, requiredRole: step.requiredRole, comment: step.comment,
    }),
  };
}

function request(state: GuardianState, a: Extract<GuardianAction, { type: 'request' }>): GuardianState {
  const seq = state.seq + 1;
  const pending = NEEDS_APPROVAL.has(a.decision.outcome);
  const step: Step = {
    id: `step-${seq}`, decisionId: `dec-${seq}`, approvalId: pending ? `apr-${seq}` : null,
    principal: a.principal, call: a.call, decision: a.decision,
    status: pending ? 'pending' : a.decision.outcome === 'ALLOW' ? 'executed' : 'blocked',
    requiredRole: pending ? a.decision.role : null, requestedAt: a.at,
    expiresAt: pending ? a.at + DEMO_APPROVAL_TTL_MS : null, decidedBy: null, comment: null,
  };
  return { steps: [...state.steps, step], events: [...state.events, decisionEvent(step)], seq, error: null };
}

/** 结束一个待审批项；不在待审批状态时为无操作并标记 not_pending。 */
function settle(state: GuardianState, approvalId: string, at: number, patch: Pick<Step, 'status' | 'decidedBy' | 'comment'>): GuardianState {
  const target = state.steps.find((s) => s.approvalId === approvalId);
  if (!target || target.status !== 'pending') return { ...state, error: 'not_pending' };
  const done: Step = { ...target, ...patch };
  const outcome = patch.status === 'approved' ? 'APPROVED' : patch.status === 'rejected' ? 'REJECTED' : 'EXPIRED';
  return {
    ...state,
    steps: state.steps.map((s) => (s.id === done.id ? done : s)),
    events: [...state.events, approvalEvent(done, outcome, at)],
    error: null,
  };
}

function guardApprover(state: GuardianState, approvalId: string, approver: string): MachineError {
  const target = state.steps.find((s) => s.approvalId === approvalId);
  return target && target.principal.id === approver ? 'self_approval' : null;
}

export function guardianReducer(state: GuardianState, action: GuardianAction): GuardianState {
  switch (action.type) {
    case 'request':
      return request(state, action);
    case 'approve': {
      const error = guardApprover(state, action.approvalId, action.approver);
      if (error) return { ...state, error };
      return settle(state, action.approvalId, action.at, { status: 'approved', decidedBy: action.approver, comment: null });
    }
    case 'reject': {
      const error = guardApprover(state, action.approvalId, action.approver);
      if (error) return { ...state, error };
      if (action.comment.trim() === '') return { ...state, error: 'comment_required' };
      return settle(state, action.approvalId, action.at, { status: 'rejected', decidedBy: action.approver, comment: action.comment.trim() });
    }
    case 'expire':
      return settle(state, action.approvalId, action.at, { status: 'expired', decidedBy: null, comment: null });
    case 'tick':
      return state.steps
        .filter((s) => s.status === 'pending' && s.expiresAt !== null && action.at >= s.expiresAt)
        .reduce((acc, s) => settle(acc, s.approvalId!, action.at, { status: 'expired', decidedBy: null, comment: null }), state);
    case 'reset':
      return initialState;
  }
}
