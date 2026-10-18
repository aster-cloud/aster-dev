'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import { APPROVER } from '../scenario';
import type { Step } from '../machine';

interface ApproverPanelProps {
  steps: Step[];
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string, comment: string) => void;
  onExpire: (approvalId: string) => void;
  now: number;
  compact?: boolean;
}

const BTN = 'rounded-md border border-border px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50';

function Countdown({ expiresAt, now }: { expiresAt: number | null; now: number }) {
  const t = useTranslations('guardianDemo.approver');
  if (expiresAt === null) return null;
  return <span className="text-xs text-warning">{t('expiresIn', { seconds: Math.max(0, Math.ceil((expiresAt - now) / 1000)) })}</span>;
}

/** 单个待审批项：批准 / 驳回（须填说明）/ 任其过期。 */
function PendingItem({ step, now, compact, onApprove, onReject, onExpire }: Omit<ApproverPanelProps, 'steps'> & { step: Step }) {
  const t = useTranslations('guardianDemo');
  const [comment, setComment] = useState('');
  const approvalId = step.approvalId ?? '';
  const missing = comment.trim() === '';
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{t(`tools.${step.call.tool}`)}</span>
        <Countdown expiresAt={step.expiresAt} now={now} />
      </div>
      {!compact && <code className="break-all font-mono text-xs text-fg-muted">{JSON.stringify(step.call.args)}</code>}
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('approver.commentPlaceholder')}
        aria-label={t('approver.commentPlaceholder')}
        className="rounded-md border border-border bg-muted px-2 py-1 text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={cn(BTN, 'bg-success/15 text-success')} onClick={() => onApprove(approvalId)}>
          {t('approver.approve')}
        </button>
        <button type="button" className={cn(BTN, 'bg-danger/15 text-danger')} disabled={missing} onClick={() => onReject(approvalId, comment.trim())}>
          {t('approver.reject')}
        </button>
        <button type="button" className={BTN} onClick={() => onExpire(approvalId)}>
          {t('approver.expire')}
        </button>
        {missing && <span className="text-xs text-fg-muted">{t('approver.commentRequired')}</span>}
      </div>
    </li>
  );
}

/** 审批人面板：恒以 Dana 身份操作，只列出仍在等待的步骤。 */
export function ApproverPanel(props: ApproverPanelProps) {
  const t = useTranslations('guardianDemo.approver');
  const pending = props.steps.filter((s) => s.status === 'pending');
  return (
    <section aria-label={t('title', { name: APPROVER.name })} className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t('title', { name: APPROVER.name })}</h3>
      <p className="text-xs text-fg-muted">
        {t('role')} · {t('ttlNote')}
      </p>
      {pending.length === 0 && <p className="text-sm text-fg-muted">{t('empty')}</p>}
      <ul className="flex flex-col gap-2">
        {pending.map((s) => (
          <PendingItem key={s.id} {...props} step={s} />
        ))}
      </ul>
    </section>
  );
}
