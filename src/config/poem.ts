/**
 * 「源码即诗 / 源码即推理」demo 配置（迁移自 aster-lang-ts/examples 的命令行 demo）。
 *
 * 两个案例都把一段自然语言文本当作 Aster 源码——用关键词别名（ADR 0022）把结构词写成诗句
 * 领字/侦探叙事词，用字面量宏（IdentifierKind.LITERAL）把术语展开成字符串。别名+宏只在
 * canonicalize 阶段生效，Lexer/Parser/Core IR 不知其存在，故它们编译到货真价实的程序。
 *
 * - 静夜思：李白诗按原词序即源码，运行输出诗名「静夜思」。
 * - 斑点带子案：福尔摩斯推理即决策规则，喂入线索运行输出真凶。
 */
import { ZH_CN } from '@aster-cloud/aster-lang-ts/lexicons/zh-CN';
import type { Lexicon } from '@aster-cloud/aster-lang-ts/lexicons/types';
import { SemanticTokenKind as K } from '@aster-cloud/aster-lang-ts/token-kind';
import { vocabularyRegistry } from '@aster-cloud/aster-lang-ts/lexicons/identifiers/registry';
import { IdentifierKind } from '@aster-cloud/aster-lang-ts/lexicons/identifiers/types';

export type PoemDemoKey = 'jingyesi' | 'sherlock';

/** 静夜思方言：诗句领字 → 结构关键词；「思故乡」→ 字面量「静夜思」。 */
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

/** 注册静夜思字面量宏：思故乡 → 内容「静夜思」。幂等——重复注册同一 tenant 安全。 */
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

export const JINGYESI_SOURCE = '床前 明月光。\n疑是 地上霜，举头 望明月：\n  低头 思故乡。';

/** 福尔摩斯方言：侦探叙事词 → 结构关键词（then/else 非 SemanticTokenKind，canonical 保留规范拼写）。 */
export const SHERLOCK_DOMAIN = 'sherlock';
export const SHERLOCK_LEXICON: Lexicon = {
  ...ZH_CN,
  id: SHERLOCK_DOMAIN,
  name: '福尔摩斯',
  aliases: {
    [K.MODULE_DECL]: ['探案笔记'],
    [K.FUNC_TO]: ['推断'],
    [K.FUNC_GIVEN]: ['已知'],
    [K.IF]: ['若'],
    [K.RETURN]: ['凶手即'],
    [K.AND]: ['且'],
  },
};

export const SHERLOCK_SOURCE =
  '探案笔记 斑点带子案。\n\n'
  + '推断 揪出真凶 已知 铃绳通风口，保险箱藏毒蛇，唯继父可入密室，姐姐临终呼斑点带子，产出：\n'
  + '  若 铃绳通风口 且 保险箱藏毒蛇 then 凶手即 "继父罗伊洛特"\n'
  + '  else 若 唯继父可入密室 then 凶手即 "继父罗伊洛特"\n'
  + '  else 若 姐姐临终呼斑点带子 then 凶手即 "尚需查证：谁豢养毒蛇"\n'
  + '  else 凶手即 "疑点未清，尚难定论"。';

/** 福尔摩斯 demo 的案发线索场景（不同线索 → 不同真凶，展示真决策）。 */
export const SHERLOCK_SCENES: ReadonlyArray<{ key: string; clues: Record<string, boolean> }> = [
  { key: 'original', clues: { 铃绳通风口: true, 保险箱藏毒蛇: true, 唯继父可入密室: true, 姐姐临终呼斑点带子: true } },
  { key: 'roomOnly', clues: { 铃绳通风口: false, 保险箱藏毒蛇: false, 唯继父可入密室: true, 姐姐临终呼斑点带子: true } },
  { key: 'wordsOnly', clues: { 铃绳通风口: false, 保险箱藏毒蛇: false, 唯继父可入密室: false, 姐姐临终呼斑点带子: true } },
  { key: 'insufficient', clues: { 铃绳通风口: false, 保险箱藏毒蛇: false, 唯继父可入密室: false, 姐姐临终呼斑点带子: false } },
];
