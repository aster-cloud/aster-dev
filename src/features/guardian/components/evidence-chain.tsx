'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import type { EvidenceBlock } from '../evidence';

const SHORT_LEN = 8;

/** 事件类型的短名：决策 / 审批；未知类型原样显示。 */
function useEventLabel() {
  const t = useTranslations('guardianDemo.evidence');
  return (eventType: string) => {
    if (eventType === 'ACTION_GUARD_DECISION') return t('decision');
    if (eventType === 'ACTION_GUARD_APPROVAL') return t('approval');
    return eventType;
  };
}

function Block({ block, label }: { block: EvidenceBlock; label: string }) {
  const prev = block.prevHash ? block.prevHash.slice(0, SHORT_LEN) : '∅';
  return (
    <li className="min-w-0 rounded-md border border-border bg-muted p-2 text-xs">
      <div className="font-semibold">
        #{block.index} {label}
      </div>
      <div className="mt-1 break-all font-mono text-fg-muted">
        {prev} → {block.hash.slice(0, SHORT_LEN)}
      </div>
    </li>
  );
}

/** 证据哈希链：aria-live 容器让屏幕阅读器播报新增的块。 */
export function EvidenceChain({ chain, layout }: { chain: EvidenceBlock[]; layout: 'row' | 'column' }) {
  const t = useTranslations('guardianDemo.evidence');
  const label = useEventLabel();
  return (
    <section aria-label={t('title')}>
      <h3 className="mb-2 text-sm font-semibold">{t('title')}</h3>
      {chain.length === 0 && <p className="text-sm text-fg-muted">{t('empty')}</p>}
      <ol
        aria-live="polite"
        className={cn('gap-2', layout === 'row' ? 'flex flex-row overflow-x-auto' : 'flex flex-col')}
      >
        {chain.map((b) => (
          <Block key={b.index} block={b} label={label(b.fields.eventType)} />
        ))}
      </ol>
    </section>
  );
}
