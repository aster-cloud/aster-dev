/**
 * AI Guardian 演示的唯一场景定义：规则源、主体、工具调用 → 守卫请求、剧情节拍。
 *
 * 规则源必须是标准守卫请求形状且保持英文（Cedar 导出按英文字段名匹配）；改动规则文本后必须
 * 重新运行 `pnpm guardian:snapshots`，否则 snapshots.test.ts 失败。
 */
export const GUARD_MODULE = 'guard.support';
export const GUARD_ENTRY = 'decide';
export const RULE_ID = 'SUPPORT-001';

export const GUARD_SOURCE = `Module guard.support.

Define GuardRequest has principal_id, principal_type, principal_roles, action, resource_type, resource_id, context, agent_model.

@id("SUPPORT-001")
@control("EU_AI_ACT:ART14")
Rule decide given req as GuardRequest, produce Verdict:
  If List.contains(req.principal_roles, "suspended"):
    Return Verdict.deny("suspended principal").
  When req.action equals to "delete_customer_record", require approval by "Data Protection Officer" because "customer record deletion".
  If req.action equals to "issue_refund" and req.context.amount at least 10000:
    Return Verdict.escalate("large refund").
  Otherwise allow.
`;

export type ToolName = 'issue_refund' | 'delete_customer_record' | 'lookup_order';

export interface ToolCall {
  tool: ToolName;
  args: Record<string, string | number>;
}

export interface Principal {
  id: string;
  roles: string[];
}

export const SUPPORT_BOT: Principal = { id: 'support-bot', roles: [] };
export const SUSPENDED_BOT: Principal = { id: 'support-bot-eu', roles: ['suspended'] };
export const APPROVER = { id: 'dana', name: 'Dana' } as const;

export interface GuardRequest {
  principal_id: string;
  principal_type: string;
  principal_roles: string[];
  action: string;
  resource_type: string;
  resource_id: string;
  context: Record<string, string | number>;
  agent_model: string;
}

// 资源取自哪个参数：对应 aster-guard 的 --resource-from。
const RESOURCE_ARG: Record<ToolName, { arg: string; type: string }> = {
  issue_refund: { arg: 'order_id', type: 'order' },
  delete_customer_record: { arg: 'customer_id', type: 'customer' },
  lookup_order: { arg: 'order_id', type: 'order' },
};

export function toGuardRequest(principal: Principal, call: ToolCall): GuardRequest {
  const context = Object.fromEntries(Object.entries(call.args).filter(([, v]) => v !== null && v !== undefined));
  const resource = RESOURCE_ARG[call.tool];
  return {
    principal_id: principal.id,
    principal_type: 'agent',
    principal_roles: principal.roles,
    action: call.tool,
    resource_type: resource.type,
    resource_id: String(call.args[resource.arg] ?? ''),
    context,
    agent_model: 'support-agent',
  };
}

export type ApproverScript = { kind: 'approve' } | { kind: 'reject'; commentKey: string };

export interface StoryBeat {
  id: string;
  /** guardianDemo 命名空间下客户台词的消息键。 */
  customerKey: string;
  principal: Principal;
  call: ToolCall;
  approver?: ApproverScript;
}

export const STORY_BEATS: StoryBeat[] = [
  { id: 'beat1', customerKey: 'story.beat1.customer', principal: SUPPORT_BOT,
    call: { tool: 'issue_refund', args: { order_id: 'ORD-1042', amount: 40 } } },
  { id: 'beat2', customerKey: 'story.beat2.customer', principal: SUPPORT_BOT,
    call: { tool: 'issue_refund', args: { order_id: 'INV-77', amount: 12000 } },
    approver: { kind: 'reject', commentKey: 'story.beat2.rejectComment' } },
  { id: 'beat3', customerKey: 'story.beat3.customer', principal: SUPPORT_BOT,
    call: { tool: 'delete_customer_record', args: { customer_id: 'cust_8812' } },
    approver: { kind: 'approve' } },
  { id: 'beat4', customerKey: 'story.beat4.customer', principal: SUSPENDED_BOT,
    call: { tool: 'issue_refund', args: { order_id: 'ORD-2001', amount: 10 } } },
];
