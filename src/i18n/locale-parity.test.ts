/**
 * locale 消息键集 parity 守门（防翻译漂移 / 键缺失复发）。
 *
 * 背景（单源漂移审计）：aster-dev 此前无 locale-parity CI（cloud 有 check:locales:strict），
 * hi.json 曾漂移到 ~29% 覆盖（缺 55 键 + 76 键未译）。本测试锁定：
 *   - 所有 locale（zh/de/hi）消息键集与 en backbone 完全一致（核心守门）
 *   - hi 额外断言：无「值==英文源」未译残留 + 文本为 Devanagari（防 Hinglish 罗马化退化）
 */
import { describe, it, expect } from 'vitest';
import en from '../../messages/en.json';
import zh from '../../messages/zh.json';
import de from '../../messages/de.json';
import hi from '../../messages/hi.json';

type MessageTree = { [k: string]: string | MessageTree };

function flatten(obj: MessageTree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      for (const [ck, cv] of flatten(v, key)) out.set(ck, cv);
    } else {
      out.set(key, v as string);
    }
  }
  return out;
}

// 专有名词/技术 loan-word 允许与英文源相同（不算未译）：多种语言中 Playground/Demos/
// Syntax/Pause/Flush 等直接借用英文。这里针对 hi（本次补齐、需防 Hinglish/未译复发）的
// 未译检查列出豁免；de/zh 已成熟，只做键集 parity（值级 loan-word 判定跨语言假阳性高）。
const HI_PROPER_NOUN_ALLOWLIST = new Set<string>([
  'devFooter.cloud', // "Aster Cloud"
]);

const enFlat = flatten(en as MessageTree);
const LOCALES: Array<[string, MessageTree]> = [
  ['zh', zh as MessageTree],
  ['de', de as MessageTree],
  ['hi', hi as MessageTree],
];

describe('locale 消息键集 parity（vs en backbone）', () => {
  // 所有 locale：键集必须与 en 一致（防键缺失/漂移——这是核心守门）。
  for (const [name, tree] of LOCALES) {
    it(`${name} 键集与 en 完全一致（无缺失/多余）`, () => {
      const flat = flatten(tree);
      const missing = [...enFlat.keys()].filter(k => !flat.has(k));
      const extra = [...flat.keys()].filter(k => !enFlat.has(k));
      expect(missing, `${name} 缺失键: ${missing.join(', ')}`).toEqual([]);
      expect(extra, `${name} 多余键: ${extra.join(', ')}`).toEqual([]);
    });
  }

  // hi：本次从 ~29% 补齐至 100%，额外守「无未译残留（值==英文源）」防 Hinglish/退化复发。
  // de/zh 已成熟且含合法英文 loan-word（Playground/Syntax/Pause 等），值级判定假阳性高，不做此检查。
  it('hi 无未译残留（值 == 英文源，专名除外）', () => {
    const flat = flatten(hi as MessageTree);
    const untranslated = [...enFlat.entries()]
      .filter(([k, v]) => flat.get(k) === v && !HI_PROPER_NOUN_ALLOWLIST.has(k))
      .map(([k]) => k);
    expect(untranslated, `hi 未译键（值同英文）: ${untranslated.join(', ')}`).toEqual([]);
  });

  // hi：文本必须为 Devanagari（防 romanized Hinglish，如 "Niti source"/"Playground mein"）。
  // 剥掉 ICU 占位符 + 允许的技术/专有 token 后，剩余文本应含天城文且无残留拉丁词。
  it('hi 值为 Devanagari（防 Hinglish 罗马化）', () => {
    // 允许保留原文的技术/专有 token（大小写不敏感整词匹配）。
    const ALLOWED_LATIN_TOKENS = new Set(
      ['Aster', 'Lang', 'Cloud', 'DSL', 'AI', 'IR', 'API', 'LayoutMap', 'CNL', 'Next', 'js',
       'Next.js', 'inline', 'if', 'JSON', 'UI', 'SEO', 'CLI', 'SDK', 'HTTP', 'URL', 'ID', 'GmbH'].map(t => t.toLowerCase()),
    );
    const flat = flatten(hi as MessageTree);
    const violations: string[] = [];
    for (const [k, v] of flat) {
      if (HI_PROPER_NOUN_ALLOWLIST.has(k)) continue;
      // 剥 ICU 占位符 {x} 与标点/数字/空白，抽取拉丁词。
      const stripped = v.replace(/\{[^}]*\}/g, ' ');
      const latinWords = stripped.match(/[A-Za-z][A-Za-z.]*/g) ?? [];
      const disallowed = latinWords.filter(w => !ALLOWED_LATIN_TOKENS.has(w.replace(/\.$/, '').toLowerCase()));
      const hasDevanagari = /[ऀ-ॿ]/.test(v);
      if (disallowed.length > 0) {
        violations.push(`${k}: 残留拉丁词 [${disallowed.join(', ')}]（疑似 Hinglish/未译）`);
      } else if (!hasDevanagari) {
        violations.push(`${k}: 无 Devanagari（值="${v}"）`);
      }
    }
    expect(violations, `hi 非 Devanagari 值:\n${violations.join('\n')}`).toEqual([]);
  });
});
