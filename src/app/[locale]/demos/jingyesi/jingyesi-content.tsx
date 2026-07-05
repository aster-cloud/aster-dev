'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { compile, evaluate } from '@aster-cloud/aster-lang-ts/browser';
import { Container, Stack, Card, CardBody } from '@/components/ui';
import { DemoPlaygroundLink } from '@/components/demo-playground-link';
import { toCanonical, toDisplay } from '@/lib/layout-map';
import { JINGYESI_LAYOUT, JINGYESI_LEXICON, JINGYESI_DOMAIN, registerJingyesiVocab } from '@/config/jingyesi';

function run() {
  const canonical = toCanonical(JINGYESI_LAYOUT);
  const display = toDisplay(JINGYESI_LAYOUT);
  registerJingyesiVocab();
  const c = compile(canonical, { lexicon: JINGYESI_LEXICON, domain: JINGYESI_DOMAIN, tenantId: JINGYESI_DOMAIN });
  if (!c.success || !c.core) {
    return { canonical, display, error: (c.parseErrors ?? []).map((e) => e.message).join('; ') || 'compile failed' };
  }
  const rule = c.core.decls?.[0]?.name ?? '';
  const ev = evaluate(c.core, rule, {});
  return { canonical, display, module: c.core.name ?? '', rule, output: ev.success ? String(ev.value) : `run failed: ${ev.error}` };
}

export default function JingyesiContent() {
  const t = useTranslations('jingyesiPage');
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
          {/* 显示视图：李白原诗工整四句 */}
          <Card>
            <CardBody className="flex flex-col gap-3 pt-6">
              <h2 className="font-display text-xl font-semibold text-fg">{t('displayView')}</h2>
              <p className="text-sm text-fg-muted">{t('displayHint')}</p>
              <pre className="overflow-x-auto rounded-lg bg-bg-subtle p-4 text-base leading-loose text-fg">
                <code>{r.display}</code>
              </pre>
            </CardBody>
          </Card>

          {/* 编译视图：受语法约束的 canonical（编译真源） */}
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
            <CardBody className="pt-6 text-center">
              {'error' in r ? (
                <p className="text-sm text-red-500">{t('compileError')}: {r.error}</p>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">
                    {t('compiledTo', { module: r.module, rule: r.rule })}
                  </p>
                  <p className="mt-2 text-lg text-fg">
                    {t('runLabel')}<span className="font-semibold text-primary"> {r.output}</span>
                  </p>
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
