'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * demo 页底部的「去 playground 写自己的规则」反向链接——与 playground 的 demo 探索区
 * 一起构成 demos↔playground 双向连通。文案走 demoBackToPlayground（四语）。
 */
export function DemoPlaygroundLink() {
  const t = useTranslations();
  return (
    <div className="mt-8 text-center">
      <Link
        href="/playground"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-subtle px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-bg"
      >
        <span aria-hidden>✎</span>
        {t('demoBackToPlayground')}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
