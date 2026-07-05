/**
 * 静夜思 + 斑点带子案 demo 的 LayoutMap 不变式回归测试（Codex 审建议）。
 *
 * 钉住：① toCanonical(LAYOUT) 可编译运行、输出符合预期 ② display 是期望排版
 * （静夜思=无空格原诗四句；不含隐藏的 canonical 空格）③ 真决策（斑点带子案不同线索不同真凶）。
 */
import { describe, it, expect } from 'vitest';
import { compile, evaluate } from '@aster-cloud/aster-lang-ts/browser';
import { toCanonical, toDisplay } from '../lib/layout-map';
import { JINGYESI_LAYOUT, JINGYESI_LEXICON, JINGYESI_DOMAIN, registerJingyesiVocab } from './jingyesi';
import { SHERLOCK_LAYOUT, SHERLOCK_LEXICON, SHERLOCK_DOMAIN, SHERLOCK_CLUES, SHERLOCK_PRESETS } from './sherlock';

/** 把预设的 on(id 列表) 转成喂给引擎的 clue context {field: bool}——与探案台组件同一路径。 */
function presetContext(key: string): Record<string, boolean> {
  const on = new Set(SHERLOCK_PRESETS.find((p) => p.key === key)!.on);
  return Object.fromEntries(SHERLOCK_CLUES.map((c) => [c.field, on.has(c.id)]));
}

describe('静夜思 demo（LayoutMap）', () => {
  it('canonical 编译运行 → 输出诗名「静夜思」（字面量宏）', () => {
    registerJingyesiVocab();
    const c = compile(toCanonical(JINGYESI_LAYOUT), { lexicon: JINGYESI_LEXICON, domain: JINGYESI_DOMAIN, tenantId: JINGYESI_DOMAIN });
    expect(c.success, JSON.stringify(c.parseErrors)).toBe(true);
    const ev = evaluate(c.core!, c.core!.decls[0].name, {});
    expect(ev.success).toBe(true);
    expect(ev.value).toBe('静夜思');
  });

  it('display 是无空格的李白原诗工整四句', () => {
    expect(toDisplay(JINGYESI_LAYOUT)).toBe('床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。');
  });
});

describe('斑点带子案 demo（LayoutMap）', () => {
  it('canonical 编译成决策规则', () => {
    const c = compile(toCanonical(SHERLOCK_LAYOUT), { lexicon: SHERLOCK_LEXICON, domain: SHERLOCK_DOMAIN, tenantId: SHERLOCK_DOMAIN });
    expect(c.success, JSON.stringify(c.parseErrors)).toBe(true);
    expect(c.core!.name).toBe('斑点带子案');
    expect(c.core!.decls[0].name).toBe('揪出真凶');
  });

  it('真决策：不同线索组合导出不同真凶（探案台预设路径）', () => {
    const c = compile(toCanonical(SHERLOCK_LAYOUT), { lexicon: SHERLOCK_LEXICON, domain: SHERLOCK_DOMAIN, tenantId: SHERLOCK_DOMAIN });
    const rule = c.core!.decls[0].name;
    const out = (key: string) => {
      const ev = evaluate(c.core!, rule, presetContext(key));
      return ev.success ? String(ev.value) : `fail:${ev.error}`;
    };
    expect(out('original')).toBe('继父罗伊洛特');
    expect(out('roomOnly')).toBe('继父罗伊洛特');
    expect(out('wordsOnly')).toBe('尚需查证：谁豢养毒蛇');
    expect(out('insufficient')).toBe('疑点未清，尚难定论');
    // 至少三种不同结论 → 线索真的驱动决策翻转
    expect(new Set([out('original'), out('wordsOnly'), out('insufficient')]).size).toBe(3);
  });

  it('display 是推理独白（无残留语法 then/else）', () => {
    const d = toDisplay(SHERLOCK_LAYOUT);
    expect(/\bthen\b|\belse\b/.test(d)).toBe(false);
    expect(d.includes('则真凶必是')).toBe(true);
    expect(d.includes('继父罗伊洛特')).toBe(true);
  });
});
