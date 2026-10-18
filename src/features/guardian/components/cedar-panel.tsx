'use client';

import { useTranslations } from 'next-intl';
import cedar from '../snapshots/cedar.json';
import { isBuiltInSource } from '../cedar-source';

/** 展示内置规则的 Cedar 导出快照；规则被编辑后标注快照不随编辑变化。 */
export function CedarPanel({ source }: { source: string }) {
  const t = useTranslations('guardianDemo.cedar');
  return (
    <section aria-label={t('title')} className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t('title')}</h3>
      {!isBuiltInSource(source) && (
        <p role="note" className="rounded-md bg-warning/15 px-3 py-2 text-xs text-warning">
          {t('builtInNote')}
        </p>
      )}
      <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed">
        <code>{cedar.policies}</code>
      </pre>
      <p className="text-xs text-fg-muted">{t('probes', { agreed: cedar.probes.agreed, count: cedar.probes.count })}</p>
    </section>
  );
}
