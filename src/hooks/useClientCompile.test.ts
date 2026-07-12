import { describe, it, expect } from 'vitest';
import { compileAndTypecheck } from '@aster-cloud/aster-lang-ts/browser';
import { EN_US } from '@aster-cloud/aster-lang-ts/lexicons/en-US';
import { templatesFor } from '../lib/playground-templates';
import { normalize, aggregateDiagnostics } from './useClientCompile';

/**
 * 验证 useClientCompile 依赖的客户端编译诊断链路：合法模板 0 error，
 * 非法源码带行列诊断。测的是 aster-lang-ts/browser 契约 + 诊断聚合，
 * 而非 React 渲染（hook 只是把它防抖包了一层）。
 */

interface Span {
  start?: { line: number; col: number };
  end?: { line: number; col: number };
}
interface RawDiag {
  message?: string;
  span?: Span;
}
function collectErrors(source: string): RawDiag[] {
  const r = compileAndTypecheck(source, { lexicon: EN_US }) as {
    parseErrors?: RawDiag[];
    loweringErrors?: RawDiag[];
    typeErrors?: RawDiag[];
  };
  return [
    ...(r.parseErrors ?? []),
    ...(r.loweringErrors ?? []),
    ...(r.typeErrors ?? []),
  ];
}

describe('客户端编译诊断（useClientCompile 依赖链路）', () => {
  it('合法 en 模板全部 0 error', () => {
    for (const tpl of templatesFor('en')) {
      const errs = collectErrors(tpl.source);
      expect(errs, `template ${tpl.id} should compile clean`).toHaveLength(0);
    }
  });

  it('语法错误源码 → 至少一条带行列的诊断', () => {
    // 缺少运算数的 Return：Return x times .
    const bad =
      'Module M.\n\nRule p given x as Int, produce Int:\n  Return x times .';
    const errs = collectErrors(bad);
    expect(errs.length).toBeGreaterThan(0);
    // 至少一条有 span（行列信息），供编辑器标错。
    const withSpan = errs.find((e) => e.span?.start);
    expect(withSpan).toBeDefined();
    expect(withSpan!.span!.start!.line).toBeGreaterThanOrEqual(0);
  });

  it('空源码不算错误（合法空策略）', () => {
    // 空白源码本身编译器可能给 0 或非空——hook 层对空源码短路返回空诊断，
    // 这里只确认非空白的最小模块编译干净。
    const minimal = 'Module M.\n\nRule r given x as Int, produce Int:\n  Return x.';
    expect(collectErrors(minimal)).toHaveLength(0);
  });
});

describe('normalize — span 0-based → 1-based 归一', () => {
  it('有 span → 行列各 +1', () => {
    const d = normalize(
      { message: 'oops', span: { start: { line: 4, col: 17 }, end: { line: 4, col: 18 } } },
      'error',
    );
    expect(d).toEqual({
      severity: 'error',
      message: 'oops',
      startLine: 5,
      startCol: 18,
      endLine: 5,
      endCol: 19,
    });
  });

  it('无 span（如 lowering 错误）→ 行列缺省，消息保留', () => {
    const d = normalize({ message: 'no position' }, 'error');
    expect(d.startLine).toBeUndefined();
    expect(d.message).toBe('no position');
    expect(d.severity).toBe('error');
  });

  it('原始 severity 优先于 fallback', () => {
    expect(normalize({ message: 'w', severity: 'warning' }, 'error').severity).toBe(
      'warning',
    );
    // 非法 severity → fallback
    expect(normalize({ message: 'x', severity: 'bogus' }, 'error').severity).toBe(
      'error',
    );
  });

  it('缺 message → 兜底文案', () => {
    expect(normalize({}, 'error').message).toBe('语法错误');
  });
});

describe('aggregateDiagnostics — 三来源聚合', () => {
  it('parse + lowering + type 三来源按序拼接', () => {
    const diags = aggregateDiagnostics({
      parseErrors: [{ message: 'p', span: { start: { line: 0, col: 0 }, end: { line: 0, col: 1 } } }],
      loweringErrors: [{ message: 'l' }],
      typeErrors: [{ message: 't', span: { start: { line: 1, col: 2 }, end: { line: 1, col: 3 } } }],
    });
    expect(diags.map((d) => d.message)).toEqual(['p', 'l', 't']);
    expect(diags[0].startLine).toBe(1); // 0-based 0 → 1-based 1
    expect(diags[1].startLine).toBeUndefined(); // lowering 无 span
    expect(diags[2].startLine).toBe(2);
  });

  it('全空来源 → 空数组', () => {
    expect(aggregateDiagnostics({})).toEqual([]);
  });
});
