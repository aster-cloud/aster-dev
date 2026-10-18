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
      <div aria-hidden="true" className="mt-1 break-all font-mono text-fg-muted">
        {prev} → {block.hash.slice(0, SHORT_LEN)}
      </div>
    </li>
  );
}

/** 紧凑标签：一行内的「#N 类型 哈希」，用于剧情视图底部。 */
function Chip({ block, label }: { block: EvidenceBlock; label: string }) {
  return (
    <li className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap rounded-md border border-border bg-muted px-2 py-1 text-xs">
      <span className="font-semibold">
        #{block.index} {label}
      </span>
      <span aria-hidden="true" className="font-mono text-fg-muted">
        {block.hash.slice(0, SHORT_LEN)}
      </span>
    </li>
  );
}

interface EvidenceChainProps {
  chain: EvidenceBlock[];
  /** column：纵向完整块；chips：单行标签，超出时横向滚动。 */
  layout: 'chips' | 'column';
  /** 是否自带 aria-live 播报；页面已有统一播报区时传 false，避免两个播报区重叠。 */
  announce?: boolean;
}

/** 证据哈希链：新增块只播报「#N 决策 / 审批」，哈希串对读屏隐藏。 */
export function EvidenceChain({ chain, layout, announce = true }: EvidenceChainProps) {
  const t = useTranslations('guardianDemo.evidence');
  const label = useEventLabel();
  const chips = layout === 'chips';
  const Item = chips ? Chip : Block;
  return (
    <section aria-label={t('title')} className={cn(chips && 'flex min-w-0 items-center gap-2')}>
      <h3 className={cn('font-semibold', chips ? 'shrink-0 text-xs' : 'mb-2 text-sm')}>{t('title')}</h3>
      {chain.length === 0 && <p className={cn('text-fg-muted', chips ? 'text-xs' : 'text-sm')}>{t('empty')}</p>}
      <ol
        aria-live={announce ? 'polite' : undefined}
        className={cn('gap-2', chips ? 'flex min-w-0 flex-row overflow-x-auto pb-1' : 'flex flex-col')}
      >
        {chain.map((b) => (
          <Item key={b.index} block={b} label={label(b.fields.eventType)} />
        ))}
      </ol>
    </section>
  );
}
