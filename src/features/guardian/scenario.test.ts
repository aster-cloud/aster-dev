import { describe, expect, it } from 'vitest';
import { GUARD_SOURCE, STORY_BEATS, SUPPORT_BOT, SUSPENDED_BOT, toGuardRequest } from './scenario';

describe('scenario', () => {
  it('规则源声明标准守卫请求形状（Cedar 导出的前提）', () => {
    expect(GUARD_SOURCE).toContain(
      'Define GuardRequest has principal_id, principal_type, principal_roles, action, resource_type, resource_id, context, agent_model.',
    );
    expect(GUARD_SOURCE).toContain('@id("SUPPORT-001")');
  });

  it('工具名 → action，参数 → context（与 aster-guard MCP 代理一致），null 参数被去掉', () => {
    const req = toGuardRequest(SUPPORT_BOT, { tool: 'issue_refund', args: { order_id: 'ORD-1042', amount: 40 } });
    expect(req).toEqual({
      principal_id: 'support-bot', principal_type: 'agent', principal_roles: [], action: 'issue_refund',
      resource_type: 'order', resource_id: 'ORD-1042', context: { order_id: 'ORD-1042', amount: 40 }, agent_model: 'support-agent',
    });
  });

  it('剧情四拍：ALLOW / ESCALATE+拒绝 / REQUIRE_APPROVAL+批准 / 暂停主体', () => {
    expect(STORY_BEATS.map((b) => b.call.tool)).toEqual(['issue_refund', 'issue_refund', 'delete_customer_record', 'issue_refund']);
    expect(STORY_BEATS[1].approver).toEqual({ kind: 'reject', commentKey: 'story.beat2.rejectComment' });
    expect(STORY_BEATS[2].approver).toEqual({ kind: 'approve' });
    expect(STORY_BEATS[3].principal).toBe(SUSPENDED_BOT);
  });
});
