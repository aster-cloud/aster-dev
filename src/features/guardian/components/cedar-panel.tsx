'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import cedar from '../snapshots/cedar.json';
import { isBuiltInSource } from '../cedar-source';

/**
 * 展示内置规则的 Cedar 导出快照；规则被编辑后标注快照不随编辑变化。
 * fill：占满父级剩余高度，代码框在内部滚动（剧情视图结尾的固定高度区域）。
 */
export function CedarPanel({ source, fill = false }: { source: string; fill?: boolean }) {
  const t = useTranslations('guardianDemo.cedar');
  return (
    <section aria-label={t('title')} className={cn('flex flex-col gap-2', fill && 'min-h-0 flex-1')}>
      <h3 className="text-sm font-semibold">{t('title')}</h3>
      {!isBuiltInSource(source) && (
        <p role="note" className="rounded-md bg-warning/15 px-3 py-2 text-xs text-warning">
          {t('builtInNote')}
        </p>
      )}
      {/* 可滚动区域可获得焦点，键盘用户也能滚动代码框。 */}
      <pre
        tabIndex={fill ? 0 : undefined}
        className={cn(
          'rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed',
          fill ? 'min-h-0 flex-1 overflow-auto' : 'overflow-x-auto',
        )}
      >
        <code>{cedar.policies}</code>
      </pre>
      <p className="text-xs text-fg-muted">{t('probes', { agreed: cedar.probes.agreed, count: cedar.probes.count })}</p>
    </section>
  );
}
