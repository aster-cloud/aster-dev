/**
 * 《斑点带子案》demo 配置——「源码即推理」。
 *
 * 福尔摩斯的推断写成 Aster 决策规则：侦探叙事词做关键词别名（ADR 0022），inline-if 决策链。
 * 喂入案发线索，运行输出真凶。
 *
 * LayoutMap（显示/编译解耦）：canonical（缩进决策链 + 连接词 then/否则，编译真源）↔ display
 * （福尔摩斯推理独白，then/否则 渲染成「——则真凶必是」等叙事连接词）。编译走 canonical。
 */
import { ZH_CN } from '@aster-cloud/aster-lang-ts/lexicons/zh-CN';
import type { Lexicon } from '@aster-cloud/aster-lang-ts/lexicons/types';
import { SemanticTokenKind as K } from '@aster-cloud/aster-lang-ts/token-kind';
import type { LayoutSpan } from '@/lib/layout-map';

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

/**
 * LayoutMap：canonical（`探案笔记`/`推断`别名 + inline-if 缩进决策链 + 连接词 then/否则）↔
 * display（福尔摩斯推理独白，then→「——则真凶必是」、否则 若→「纵此/假使」等）。
 *
 * 连接词说明（inline-if）：
 * - `否则`（else）：走已有的 OTHERWISE 语义词——两个引擎的 inline-if 都接受 `otherwise` 作
 *   else 同义词，zh-CN 词法包已把 OTHERWISE 映射成「否则」，故 canonical 直接用中文「否则」。
 * - `then`：无对应 SemanticTokenKind，两个引擎都硬编码英文匹配（TS isKeyword('then')、Java
 *   AsterLexer THEN 硬 token），无法别名，故 canonical 保留英文 `then`（中文化需改语言引擎）。
 * display 把两者都渲染成叙事连接词。toCanonical(SHERLOCK_LAYOUT) 即编译真源。
 */
export const SHERLOCK_LAYOUT: readonly LayoutSpan[] = [
  { canonical: '探案笔记 ', display: '《' },
  { text: '斑点带子案' },
  { canonical: '。\n\n', display: '》\n\n' },
  { canonical: '推断 揪出真凶 已知 ', display: '要揪出真凶，已知这几处疑点：' },
  { text: '铃绳通风口' },
  { canonical: '，', display: '、' },
  { text: '保险箱藏毒蛇' },
  { canonical: '，', display: '、' },
  { text: '唯继父可入密室' },
  { canonical: '，', display: '、' },
  { text: '姐姐临终呼斑点带子' },
  { canonical: '，产出：\n  ', display: '。\n\n  ' },
  { text: '若 铃绳通风口 且 保险箱藏毒蛇' },
  { canonical: ' then 凶手即 ', display: '——则真凶必是' },
  { text: '"继父罗伊洛特"' },
  { canonical: '\n  否则 若 ', display: '。\n  纵此不足为凭，然' },
  { text: '唯继父可入密室' },
  { canonical: ' then 凶手即 ', display: '，亦足以断定凶手乃' },
  { text: '"继父罗伊洛特"' },
  { canonical: '\n  否则 若 ', display: '。\n  假使仅凭' },
  { text: '姐姐临终呼斑点带子' },
  { canonical: ' then 凶手即 ', display: '一句遗言，则只能锁定' },
  { text: '"尚需查证：谁豢养毒蛇"' },
  { canonical: '\n  否则 凶手即 ', display: '。\n  否则，只得承认' },
  { text: '"疑点未清，尚难定论"' },
  { canonical: '。', display: '。' },
];

/**
 * 探案台的四条线索。`id` 是稳定标识（给 i18n label + React key），`field` 是喂给引擎
 * evaluate 的 clue 变量名（须与 CNL 规则里的中文别名逐字一致）。交互游戏让用户勾选任意
 * 组合，实时把 { field: bool } 喂给同一条已编译规则，看真凶如何翻转。
 */
export const SHERLOCK_CLUES: ReadonlyArray<{ id: string; field: string }> = [
  { id: 'bellRope', field: '铃绳通风口' },
  { id: 'safeSnake', field: '保险箱藏毒蛇' },
  { id: 'onlyStepfather', field: '唯继父可入密室' },
  { id: 'dyingWords', field: '姐姐临终呼斑点带子' },
];

/** 预设线索组合（快捷按钮，一键填入探案台）。值按 SHERLOCK_CLUES 的 id 顺序排列。 */
export const SHERLOCK_PRESETS: ReadonlyArray<{ key: string; on: readonly string[] }> = [
  { key: 'original', on: ['bellRope', 'safeSnake', 'onlyStepfather', 'dyingWords'] },
  { key: 'roomOnly', on: ['onlyStepfather'] },
  { key: 'wordsOnly', on: ['dyingWords'] },
  { key: 'insufficient', on: [] },
];
