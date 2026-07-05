/**
 * 《静夜思》demo 配置——「源码即诗」。
 *
 * 李白《静夜思》按原词序即 Aster 源码：诗句领字做关键词别名（ADR 0022），末句「思故乡」用
 * 字面量宏（IdentifierKind.LITERAL）展开成「静夜思」。运行输出诗名。
 *
 * LayoutMap（显示/编译解耦）：canonical（受 Aster 语法约束的排版，编译真源）↔ display
 * （李白原诗工整四句）。同一段程序两种排版，编译走 canonical。
 */
import { ZH_CN } from '@aster-cloud/aster-lang-ts/lexicons/zh-CN';
import type { Lexicon } from '@aster-cloud/aster-lang-ts/lexicons/types';
import { SemanticTokenKind as K } from '@aster-cloud/aster-lang-ts/token-kind';
import { vocabularyRegistry } from '@aster-cloud/aster-lang-ts/lexicons/identifiers/registry';
import { IdentifierKind } from '@aster-cloud/aster-lang-ts/lexicons/identifiers/types';
import type { LayoutSpan } from '@/lib/layout-map';

export const JINGYESI_DOMAIN = 'jingyesi';

export const JINGYESI_LEXICON: Lexicon = {
  ...ZH_CN,
  id: JINGYESI_DOMAIN,
  name: '静夜思',
  aliases: {
    [K.MODULE_DECL]: ['床前'],
    [K.FUNC_TO]: ['疑是'],
    [K.FUNC_PRODUCE]: ['举头'],
    [K.RETURN]: ['低头'],
  },
};

/** 注册静夜思字面量宏：思故乡 → 内容「静夜思」。幂等。 */
export function registerJingyesiVocab(): void {
  vocabularyRegistry.registerCustom(JINGYESI_DOMAIN, {
    id: JINGYESI_DOMAIN,
    name: '静夜思',
    locale: JINGYESI_DOMAIN,
    version: '1.0.0',
    structs: [],
    fields: [],
    functions: [],
    enumValues: [],
    literals: [{ localized: '思故乡', canonical: '静夜思', kind: IdentifierKind.LITERAL }],
  });
}

/**
 * LayoutMap：canonical（诗句迁就 Aster 语法：`。`结束语句、`：`开块、缩进入块）↔
 * display（李白原诗工整四句，结构标点在显示层还原为原诗标点）。
 * toCanonical(JINGYESI_LAYOUT) 即编译真源。
 */
// 每句领字（别名关键词，如「床前」）与后续标识符间在 canonical 里需空格分隔（语法必需），
// 但原诗无空格——故把词间空格拆成隐藏结构 span（canonical=' '、display=''），让 display 是
// 真正工整的原诗「床前明月光」，canonical 仍是可编译的「床前 明月光」（Codex 审 Medium）。
const SP: LayoutSpan = { canonical: ' ', display: '' };
export const JINGYESI_LAYOUT: readonly LayoutSpan[] = [
  { text: '床前' }, SP, { text: '明月光' },
  { canonical: '。\n', display: '，\n' },
  { text: '疑是' }, SP, { text: '地上霜' },
  { canonical: '，', display: '。\n' },
  { text: '举头' }, SP, { text: '望明月' },
  { canonical: '：\n  ', display: '，\n' },
  { text: '低头' }, SP, { text: '思故乡' },
  { canonical: '。', display: '。' },
];
