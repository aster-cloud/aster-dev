'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { compile, evaluate } from '@aster-cloud/aster-lang-ts/browser';
import { Container, Stack, Card, CardBody } from '@/components/ui';
import { DemoPlaygroundLink } from '@/components/demo-playground-link';
import { toCanonical, toDisplay } from '@/lib/layout-map';
import { SHERLOCK_LAYOUT, SHERLOCK_LEXICON, SHERLOCK_DOMAIN, SHERLOCK_SCENES } from '@/config/sherlock';

function run() {
  const canonical = toCanonical(SHERLOCK_LAYOUT);
  const display = toDisplay(SHERLOCK_LAYOUT);
  const c = compile(canonical, { lexicon: SHERLOCK_LEXICON, domain: SHERLOCK_DOMAIN, tenantId: SHERLOCK_DOMAIN });
  if (!c.success || !c.core) {
    return { canonical, display, error: (c.parseErrors ?? []).map((e) => e.message).join('; ') || 'compile failed' };
  }
  const rule = c.core.decls?.[0]?.name ?? '';
  const core = c.core;
  const verdicts = SHERLOCK_SCENES.map((s) => {
    const ev = evaluate(core, rule, s.clues);
    return { key: s.key, output: ev.success ? String(ev.value) : `run failed: ${ev.error}` };
  });
  return { canonical, display, module: c.core.name ?? '', rule, verdicts };
}

export default function SherlockContent() {
  const t = useTranslations('sherlockPage');
  const r = useMemo(() => run(), []);

  return (
    <main className="bg-bg">
      <Container className="py-12 sm:py-16">
        <Stack gap={2} className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('eyebrow')}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{t('title')}</h1>
          <p className="mx-auto max-w-2xl text-lg text-fg-muted">{t('subtitle')}</p>
        </Stack>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 显示视图：福尔摩斯推理独白 */}
          <Card>
            <CardBody className="flex flex-col gap-3 pt-6">
              <h2 className="font-display text-xl font-semibold text-fg">{t('displayView')}</h2>
              <p className="text-sm text-fg-muted">{t('displayHint')}</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-bg-subtle p-4 text-base leading-loose text-fg">
                <code>{r.display}</code>
              </pre>
            </CardBody>
          </Card>

          {/* 编译视图：缩进决策链 canonical（编译真源） */}
          <Card>
            <CardBody className="flex flex-col gap-3 pt-6">
              <h2 className="font-display text-xl font-semibold text-fg">{t('canonicalView')}</h2>
              <p className="text-sm text-fg-muted">{t('canonicalHint')}</p>
              <pre className="overflow-x-auto rounded-lg bg-bg-subtle p-4 text-sm leading-relaxed text-fg">
                <code>{r.canonical}</code>
              </pre>
            </CardBody>
          </Card>
        </div>

        <p className="mt-4 text-center text-sm text-fg-subtle">{t('decoupleNote')}</p>

        <div className="mt-6">
          <Card>
            <CardBody className="pt-6">
              {'error' in r ? (
                <p className="text-sm text-red-500">{t('compileError')}: {r.error}</p>
              ) : (
                <>
                  <p className="text-center text-xs uppercase tracking-wide text-fg-subtle">
                    {t('compiledTo', { module: r.module, rule: r.rule })}
                  </p>
                  <ul className="mx-auto mt-3 max-w-xl space-y-2">
                    {r.verdicts.map((v) => (
                      <li key={v.key} className="flex flex-col gap-0.5 border-b border-border pb-2 text-sm sm:flex-row sm:items-baseline sm:justify-between">
                        <span className="text-fg-muted">{t(`scenes.${v.key}`)}</span>
                        <span className="font-semibold text-primary">→ {v.output}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <DemoPlaygroundLink />
      </Container>
    </main>
  );
}
