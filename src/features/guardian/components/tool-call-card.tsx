'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import type { Step } from '../machine';
import { BLOCKED_STATUSES, blockedMessage } from '../blocked';
import { VerdictBadge } from './verdict-badge';

/**
 * 被拦截步骤的说明：先是代理收到的工具错误（与 aster-guard 一致，原因恒为裁决理由），
 * 驳回时另起一行给出审批人说明，过期时另起一行给出「已过期 — 拒绝」状态。
 */
export function BlockedNote({ step }: { step: Step }) {
  const t = useTranslations('guardianDemo');
  return (
    <>
      <span className="text-danger">{blockedMessage(step, t)}</span>
      {step.status === 'rejected' && step.comment && (
        <span className="text-fg-muted">{t('agent.reviewerComment', { comment: step.comment })}</span>
      )}
      {step.status === 'expired' && <span className="text-fg-muted">{t('status.expired')}</span>}
    </>
  );
}

/** 智能体变体的状态行：挂起或被拦截时说明原因，其余不显示。 */
function AgentNote({ step }: { step: Step }) {
  const t = useTranslations('guardianDemo');
  if (step.status === 'pending') return <p className="text-xs text-warning">{t('agent.held')}</p>;
  if (!BLOCKED_STATUSES.has(step.status)) return null;
  return (
    <p className="flex flex-col gap-0.5 text-xs">
      <BlockedNote step={step} />
    </p>
  );
}

/** 工具调用卡片：工具名、参数 JSON、裁决徽章；pipeline 变体另显示执行状态。 */
export function ToolCallCard({ step, variant }: { step: Step; variant: 'pipeline' | 'agent' }) {
  const t = useTranslations('guardianDemo');
  return (
    <article className={cn('flex flex-col gap-2 rounded-md border border-border p-3', variant === 'agent' && 'bg-muted')}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{t(`tools.${step.call.tool}`)}</div>
          <code className="break-all font-mono text-xs text-fg-muted">
            {step.call.tool}({JSON.stringify(step.call.args)})
          </code>
        </div>
        <VerdictBadge outcome={step.decision.outcome} reasonCode={step.decision.reasonCode} />
      </header>
      {variant === 'pipeline' ? (
        <p className="text-xs text-fg-muted">{t(`status.${step.status}`)}</p>
      ) : (
        <AgentNote step={step} />
      )}
    </article>
  );
}
