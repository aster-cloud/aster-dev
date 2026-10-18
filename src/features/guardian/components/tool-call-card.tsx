'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import type { Step } from '../machine';
import { VerdictBadge } from './verdict-badge';

const BLOCKED_STATUSES = new Set(['blocked', 'rejected', 'expired']);

/** 智能体变体的状态行：挂起或被拦截时说明原因，其余不显示。 */
function AgentNote({ step }: { step: Step }) {
  const t = useTranslations('guardianDemo');
  if (step.status === 'pending') return <p className="text-xs text-warning">{t('agent.held')}</p>;
  if (!BLOCKED_STATUSES.has(step.status)) return null;
  const reason = step.decision.reason ?? (step.decision.reasonCode ? t(`reasonCode.${step.decision.reasonCode}`) : '');
  return <p className="text-xs text-danger">{t('agent.blocked', { reason, decisionId: step.decisionId })}</p>;
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
