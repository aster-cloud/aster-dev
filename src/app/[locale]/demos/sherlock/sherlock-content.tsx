'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { compile, evaluate } from '@aster-cloud/aster-lang-ts/browser';
import { Card, CardBody } from '@/components/ui';
import { DemoPlaygroundLink } from '@/components/demo-playground-link';
import { toCanonical, toDisplay } from '@/lib/layout-map';
import { SHERLOCK_LAYOUT, SHERLOCK_LEXICON, SHERLOCK_DOMAIN, SHERLOCK_CLUES, SHERLOCK_PRESETS } from '@/config/sherlock';

/**
 * 编译一次：把 LayoutMap 的 canonical 编译成 Core IR。返回已编译的 core + 规则名，
 * 或编译错误。交互游戏只编译这一次，之后每次改线索仅重跑 evaluate（廉价）。
 */
function compileRule() {
  const canonical = toCanonical(SHERLOCK_LAYOUT);
  const display = toDisplay(SHERLOCK_LAYOUT);
  const c = compile(canonical, { lexicon: SHERLOCK_LEXICON, domain: SHERLOCK_DOMAIN, tenantId: SHERLOCK_DOMAIN });
  if (!c.success || !c.core) {
    return { canonical, display, error: (c.parseErrors ?? []).map((e) => e.message).join('; ') || 'compile failed' } as const;
  }
  return { canonical, display, core: c.core, rule: c.core.decls?.[0]?.name ?? '', module: c.core.name ?? '' } as const;
}

/** 初始线索状态 = 原案预设（全部为真）。 */
function initialClues(): Record<string, boolean> {
  const on = new Set(SHERLOCK_PRESETS[0]?.on ?? []);
  return Object.fromEntries(SHERLOCK_CLUES.map((c) => [c.id, on.has(c.id)]));
}

export default function SherlockContent() {
  const t = useTranslations('sherlockPage');
  // 编译只做一次；线索变化不重编译，只重跑 evaluate。
  const compiled = useMemo(() => compileRule(), []);
  const [clues, setClues] = useState<Record<string, boolean>>(initialClues);

  // 每次渲染用当前勾选的线索真运行规则，得出真凶（实时决策）。
  const verdict = useMemo(() => {
    if ('error' in compiled) return null;
    const ctx = Object.fromEntries(SHERLOCK_CLUES.map((c) => [c.field, clues[c.id] ?? false]));
    const ev = evaluate(compiled.core, compiled.rule, ctx);
    return ev.success ? String(ev.value) : `run failed: ${ev.error}`;
  }, [compiled, clues]);

  const toggle = (id: string) => setClues((prev) => ({ ...prev, [id]: !prev[id] }));
  const applyPreset = (on: readonly string[]) => {
    const set = new Set(on);
    setClues(Object.fromEntries(SHERLOCK_CLUES.map((c) => [c.id, set.has(c.id)])));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      {/* 标题区 */}
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('eyebrow')}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{t('title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-fg-muted">{t('subtitle')}</p>
      </div>

      {'error' in compiled ? (
        <Card>
          <CardBody className="pt-6">
            <p className="text-sm text-red-500">{t('compileError')}: {compiled.error}</p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* 探案台：勾选线索 → 实时判决 */}
          <section className="mb-8">
            <Card>
              <CardBody className="flex flex-col gap-4 pt-6">
                <div>
                  <h2 className="font-display text-xl font-semibold text-fg">{t('boardTitle')}</h2>
                  <p className="mt-1 text-sm text-fg-muted">{t('boardHint')}</p>
                </div>

                {/* 线索开关 */}
                <ul className="flex flex-col gap-2">
                  {SHERLOCK_CLUES.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-bg-subtle px-4 py-3 transition-colors hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/5">
                        <input
                          type="checkbox"
                          checked={clues[c.id] ?? false}
                          onChange={() => toggle(c.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm text-fg">{t(`clues.${c.id}`)}</span>
                      </label>
                    </li>
                  ))}
                </ul>

                {/* 实时判决 */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">{t('verdictLabel')}</p>
                  <p className="mt-1 font-display text-lg font-semibold text-primary sm:text-xl">🔍 {verdict}</p>
                </div>

                {/* 预设组合 */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-fg-subtle">{t('presetsLabel')}</p>
                  <div className="flex flex-wrap gap-2">
                    {SHERLOCK_PRESETS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyPreset(p.on)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-primary hover:text-primary"
                      >
                        {t(`presets.${p.key}`)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => applyPreset([])}
                      className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-fg-subtle transition-colors hover:border-fg-muted hover:text-fg-muted"
                    >
                      {t('clearAll')}
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </section>

          {/* 规则本身：显示视图（推理独白）↔ 编译视图（canonical 决策链） */}
          <h2 className="mb-3 text-center font-display text-lg font-semibold text-fg">{t('ruleTitle')}</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardBody className="flex flex-col gap-3 pt-6">
                <h3 className="font-display text-base font-semibold text-fg">{t('displayView')}</h3>
                <p className="text-sm text-fg-muted">{t('displayHint')}</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-bg-subtle p-4 text-base leading-loose text-fg">
                  <code>{compiled.display}</code>
                </pre>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex flex-col gap-3 pt-6">
                <h3 className="font-display text-base font-semibold text-fg">{t('canonicalView')}</h3>
                <p className="text-sm text-fg-muted">{t('canonicalHint')}</p>
                <pre className="overflow-x-auto rounded-lg bg-bg-subtle p-4 text-sm leading-relaxed text-fg">
                  <code>{compiled.canonical}</code>
                </pre>
              </CardBody>
            </Card>
          </div>

          <p className="mt-4 text-center text-sm text-fg-subtle">
            {t('decoupleNote')} · {t('compiledTo', { module: compiled.module, rule: compiled.rule })}
          </p>
        </>
      )}

      <DemoPlaygroundLink />
    </div>
  );
}
