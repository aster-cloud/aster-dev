'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Container, Stack, cn } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { StageView } from '@/features/guardian/views/stage';

const VIEWS = ['stage', 'agent'] as const;
type ViewKey = (typeof VIEWS)[number];

/** 两个视图的切换链接：以 ?view= 区分，aria-current 标记当前视图。 */
function ViewSwitch({ current }: { current: ViewKey }) {
  const t = useTranslations('guardianDemo.views');
  return (
    <nav aria-label={t('label')} className="flex gap-2">
      {VIEWS.map((v) => (
        <Link
          key={v}
          href={v === 'stage' ? '/demos/guardian' : `/demos/guardian?view=${v}`}
          aria-current={current === v ? 'page' : undefined}
          className={cn(
            'rounded-md border border-border px-3 py-1.5 text-sm font-semibold',
            current === v ? 'bg-primary/15 text-primary' : 'text-fg-muted hover:bg-muted',
          )}
        >
          {t(v)}
        </Link>
      ))}
    </nav>
  );
}

/** 读取查询参数选择视图；Task 9 之前 agent 视图同样渲染舞台沙盒。 */
function ViewSwitcher() {
  const view: ViewKey = useSearchParams().get('view') === 'agent' ? 'agent' : 'stage';
  return (
    <>
      <ViewSwitch current={view} />
      <StageView />
    </>
  );
}

export function GuardianContent({ locale }: { locale: string }) {
  const t = useTranslations('guardianDemo');
  return (
    <Container className="py-12 sm:py-16" data-locale={locale}>
      <Stack gap={2} className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('eyebrow')}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto max-w-2xl text-lg text-fg-muted">{t('subtitle')}</p>
      </Stack>
      <div className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <ViewSwitcher />
        </Suspense>
      </div>
    </Container>
  );
}
