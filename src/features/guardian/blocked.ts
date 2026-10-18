import type { Step } from './machine';

/** next-intl 翻译函数的最小形状：纯函数可用伪实现测试。 */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** 代理拿到工具错误的终态：守卫直接拒绝、审批人驳回、审批过期。 */
export const BLOCKED_STATUSES: ReadonlySet<Step['status']> = new Set(['blocked', 'rejected', 'expired']);

/**
 * 工具错误里的原因：与 aster-guard 代理一致取裁决的 reason，没有则取 reasonCode 文案。
 * 驳回与过期不改变原因——aster-api 的审批结果保留原裁决理由，审批人说明另行展示。
 */
export function blockedReason(step: Step, t: Translate): string {
  const { reason, reasonCode } = step.decision;
  return reason ?? (reasonCode ? t(`reasonCode.${reasonCode}`) : t('status.blocked'));
}

/** 代理收到的工具错误全文：`Blocked by Aster Guard: <reason> (decision <id>)`。 */
export function blockedMessage(step: Step, t: Translate): string {
  return t('agent.blocked', { reason: blockedReason(step, t), decisionId: step.decisionId });
}
