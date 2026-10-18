'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import type { Outcome, ReasonCode } from '../engine';

const TONE: Record<Outcome, string> = {
  ALLOW: 'bg-success/15 text-success',
  DENY: 'bg-danger/15 text-danger',
  REQUIRE_APPROVAL: 'bg-warning/15 text-warning',
  ESCALATE: 'bg-primary/15 text-primary',
};

/** 裁决徽章：颜色之外始终有文字，失败原因以小字补充。 */
export function VerdictBadge({ outcome, reasonCode }: { outcome: Outcome; reasonCode?: ReasonCode | null }) {
  const t = useTranslations('guardianDemo');
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', TONE[outcome])}>{t(`verdict.${outcome}`)}</span>
      {reasonCode && <span className="text-xs text-fg-muted">{t(`reasonCode.${reasonCode}`)}</span>}
    </span>
  );
}
