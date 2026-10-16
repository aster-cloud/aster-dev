import { describe, it, expect } from 'vitest';
import {
  compile,
  compileAndTypecheck,
  evaluate,
  initializeAllBundledLexicons,
  EN_US,
  ZH_CN,
  DE_DE,
  HI_IN,
  type Lexicon,
} from '@aster-cloud/aster-lang-ts/browser';
import { templates } from './playground-templates';
import type { Locale } from '@/i18n/config';

/**
 * 演练场模板守卫：每个模板须用其所属语言的 lexicon 编译、类型检查与治理检查全部干净，
 * 且 governance-verdict 模板用自带的 entry/context 求值得到预期结论——
 * 防止模板在演练场里一点「运行」就报错。
 */
const LEXICON: Record<Locale, Lexicon> = { en: EN_US, zh: ZH_CN, de: DE_DE, hi: HI_IN };

interface Diag {
  code?: string;
  message?: string;
}

function diagnostics(source: string, lexicon: Lexicon): Diag[] {
  const r = compileAndTypecheck(source, { lexicon }) as {
    parseErrors?: Diag[];
    loweringErrors?: Diag[];
    typeErrors?: Diag[];
  };
  return [...(r.parseErrors ?? []), ...(r.loweringErrors ?? []), ...(r.typeErrors ?? [])];
}

describe('演练场模板', () => {
  initializeAllBundledLexicons();

  const cases = (Object.keys(templates) as Locale[]).flatMap((locale) =>
    templates[locale].map((tpl) => ({ locale, tpl })),
  );

  it.each(cases)('$locale/$tpl.id 编译与检查无诊断', ({ locale, tpl }) => {
    expect(diagnostics(tpl.source, LEXICON[locale])).toEqual([]);
  });

  it.each(Object.keys(templates) as Locale[])('%s 有 governance-verdict 模板且求值为 ESCALATE', (locale) => {
    const tpl = templates[locale].find((t) => t.id === 'governance-verdict');
    expect(tpl).toBeDefined();
    const compiled = compile(tpl!.source, { lexicon: LEXICON[locale] });
    expect(compiled.success).toBe(true);
    const outcome = evaluate(compiled.core as never, tpl!.entry, JSON.parse(tpl!.context)) as {
      success: boolean;
      value?: { __type?: string; outcome?: string };
    };
    expect(outcome.success).toBe(true);
    expect(outcome.value).toMatchObject({ __type: 'Verdict', outcome: 'ESCALATE' });
  });
});
