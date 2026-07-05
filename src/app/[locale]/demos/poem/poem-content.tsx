'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { compile, evaluate } from '@aster-cloud/aster-lang-ts/browser';
import { Container, Stack, Card, CardBody } from '@/components/ui';
import {
  JINGYESI_LEXICON, JINGYESI_SOURCE, JINGYESI_DOMAIN, registerJingyesiVocab,
  SHERLOCK_LEXICON, SHERLOCK_SOURCE, SHERLOCK_DOMAIN, SHERLOCK_SCENES,
} from '@/config/poem';

/** 编译静夜思 → 运行入口 rule → 返回诗名。失败兜底不抛（demo 展示用）。 */
function runJingyesi(): { module: string; rule: string; output: string } | { error: string } {
  registerJingyesiVocab();
  const c = compile(JINGYESI_SOURCE, { lexicon: JINGYESI_LEXICON, domain: JINGYESI_DOMAIN, tenantId: JINGYESI_DOMAIN });
  if (!c.success || !c.core) return { error: (c.parseErrors ?? []).map((e) => e.message).join('; ') || 'compile failed' };
  const rule = c.core.decls?.[0]?.name ?? '';
  const ev = evaluate(c.core, rule, {});
  return { module: c.core.name ?? '', rule, output: ev.success ? String(ev.value) : `run failed: ${ev.error}` };
}

/** 编译福尔摩斯推理 → 各线索场景运行 → 返回真凶。 */
function runSherlock(): { module: string; rule: string; verdicts: { key: string; output: string }[] } | { error: string } {
  const c = compile(SHERLOCK_SOURCE, { lexicon: SHERLOCK_LEXICON, domain: SHERLOCK_DOMAIN, tenantId: SHERLOCK_DOMAIN });
  if (!c.success || !c.core) return { error: (c.parseErrors ?? []).map((e) => e.message).join('; ') || 'compile failed' };
  const rule = c.core.decls?.[0]?.name ?? '';
  const verdicts = SHERLOCK_SCENES.map((s) => {
    const ev = evaluate(c.core!, rule, s.clues);
    return { key: s.key, output: ev.success ? String(ev.value) : `run failed: ${ev.error}` };
  });
  return { module: c.core.name ?? '', rule, verdicts };
}

export default function PoemContent() {
  const t = useTranslations('poemPage');
  const jingyesi = useMemo(() => runJingyesi(), []);
  const sherlock = useMemo(() => runSherlock(), []);

  return (
    <main className="bg-bg">
      <Container className="py-12 sm:py-16">
        <Stack gap={2} className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('eyebrow')}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{t('title')}</h1>
          <p className="mx-auto max-w-2xl text-lg text-fg-muted">{t('subtitle')}</p>
        </Stack>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 静夜思：诗即源码 */}
          <Card>
            <CardBody className="flex flex-col gap-4 pt-6">
              <h2 className="font-display text-xl font-semibold text-fg">{t('jingyesi.title')}</h2>
              <p className="text-sm text-fg-muted">{t('jingyesi.description')}</p>
              <pre className="overflow-x-auto rounded-lg bg-bg-subtle p-4 text-sm leading-relaxed text-fg">
                <code>{JINGYESI_SOURCE}</code>
              </pre>
              {'error' in jingyesi ? (
                <p className="text-sm text-red-500">{t('compileError')}: {jingyesi.error}</p>
              ) : (
                <div className="rounded-lg border border-border bg-bg p-4">
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">
                    {t('compiledTo', { module: jingyesi.module, rule: jingyesi.rule })}
                  </p>
                  <p className="mt-2 text-fg">
                    {t('jingyesi.runLabel')}<span className="font-semibold text-primary"> {jingyesi.output}</span>
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* 福尔摩斯：推理即决策规则 */}
          <Card>
            <CardBody className="flex flex-col gap-4 pt-6">
              <h2 className="font-display text-xl font-semibold text-fg">{t('sherlock.title')}</h2>
              <p className="text-sm text-fg-muted">{t('sherlock.description')}</p>
              <pre className="overflow-x-auto rounded-lg bg-bg-subtle p-4 text-sm leading-relaxed text-fg">
                <code>{SHERLOCK_SOURCE}</code>
              </pre>
              {'error' in sherlock ? (
                <p className="text-sm text-red-500">{t('compileError')}: {sherlock.error}</p>
              ) : (
                <div className="rounded-lg border border-border bg-bg p-4">
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">
                    {t('compiledTo', { module: sherlock.module, rule: sherlock.rule })}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {sherlock.verdicts.map((v) => (
                      <li key={v.key} className="text-sm text-fg">
                        {t(`sherlock.scenes.${v.key}`)}
                        <span className="font-semibold text-primary"> → {v.output}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </Container>
    </main>
  );
}
