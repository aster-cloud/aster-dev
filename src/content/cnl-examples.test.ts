/**
 * 文档 CNL 示例验证器（回归守卫）。
 *
 * 背景：文档站的 ```aster 代码块若用了引擎不接受的语法（如不存在的 `followed by`
 * 文本拼接运算符、小写 `return`/内联 `if/then/else`），用户在 [演练场](/playground)
 * 里照抄就会编译失败——"你的第一条规则跑不起来"。旧站有此类检查，本站迁移时遗漏，
 * 导致一批门面示例（含 Quickstart 的第一条规则）静默损坏。
 *
 * 本测试用与生产后端同版本的 `@aster-cloud/aster-lang-ts` 引擎，把 content/** 下每个
 * ```aster 代码块逐个编译；任一块编译失败即测试失败。每个块尝试全部已注册 lexicon
 * （en/zh/de/hi），只要有一种语言能编译干净即视为通过——因为同一块可能用任一语言的
 * 关键词编写（多语言演示页会并列展示同一规则的不同语种版本）。
 *
 * <p>★**光编译过不算数**（issue #29）：`compile()` **不校验被调函数是否存在**——
 * 源码写 `Maybe.notARealThing(1)` 一样返回 `success: true`、零诊断，只有 `evaluate`
 * 才报 `Undefined function`。也就是说「示例里写个根本不存在的函数，守卫照样绿」。
 * 这个缺口已经真实漏过问题：`Map.get` 文档描述 1.0.26 语义时站点仍 pin 1.0.23，
 * 读者照抄得到的是**静默错答案**而非报错。
 *
 * 故本测试分两层：
 *   1. 每个块必须能编译（原有行为）
 *   2. 块内**每条规则**都要真跑一次 `evaluate`，断言不出现 `Undefined function`
 *
 * <p>第 2 层为何只断言 `Undefined function` 而不要求 `success`：入参是由 schema
 * **合成**的占位值（`generateInputValues`），并非示例作者的本意，因此合法示例也会
 * 因数据不合适而失败——实测 52 条规则里有 8 条属此类（空日期串 → `Date.InvalidISODate`、
 * List 形参被合成成标量 → `List.sum: expected List`）。把这些也判失败会让守卫变得吵闹，
 * 最终被人关掉。收窄到"函数是否存在"，是**当前能稳定断言的最强命题**。
 *
 * <p>有些示例依赖测试无从知晓的外部状态（如字面量宏需要先 `registerCustom` 词汇表，
 * 且编译时要传 `domain`/`tenantId`）。在这类块**上方**加一行
 * `{@literal <!-- aster-example: compile-only -->}` 即可跳过第 2 层，只做编译检查。
 * 该注释不会渲染到页面上。
 *
 * 仅检查 ```aster 块。形式语法（EBNF）等非源码块请用 ```ebnf 等其它语言标签，本测试
 * 不会尝试编译它们。
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compile,
  evaluate,
  extractSchema,
  generateInputValues,
  initializeAllBundledLexicons,
  EN_US,
  ZH_CN,
  DE_DE,
  HI_IN,
  type Lexicon,
} from '@aster-cloud/aster-lang-ts/browser';

// content/ 在仓库根；本文件位于 src/content/，故上溯两级。
const CONTENT_ROOT = fileURLToPath(new URL('../../content', import.meta.url));

// 已注册 lexicon：与后端 /api/v1/lexicons 的官方集对齐。逐块尝试，任一编译干净即通过。
const LEXICONS: ReadonlyArray<readonly [string, Lexicon]> = [
  ['en-US', EN_US],
  ['zh-CN', ZH_CN],
  ['de-DE', DE_DE],
  ['hi-IN', HI_IN],
];

/** 块上方出现此标记时跳过求值层（该示例依赖测试无从构造的外部状态）。 */
const COMPILE_ONLY_MARKER = '<!-- aster-example: compile-only -->';

interface AsterBlock {
  /** 相对 content/ 的文件路径，便于定位。 */
  file: string;
  /** 文件内第几个 ```aster 块（从 1 起）。 */
  index: number;
  /** 块内源码（已去尾部空白）。 */
  source: string;
  /** 是否只做编译检查、跳过求值层。 */
  compileOnly: boolean;
}

/** 递归收集 content/ 下所有 .mdx 文件的绝对路径。 */
function collectMdx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...collectMdx(p));
    else if (entry.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/** 抽取一个文件里所有 ```aster 代码块。 */
function extractAsterBlocks(absPath: string): AsterBlock[] {
  const text = readFileSync(absPath, 'utf8');
  const file = relative(CONTENT_ROOT, absPath);
  const re = /```aster\n([\s\S]*?)```/g;
  const blocks: AsterBlock[] = [];
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(text)) !== null) {
    index += 1;
    // 标记须紧邻块上方（允许中间只有空白），避免文件里任意位置的一个标记
    // 意外豁免掉全部块。
    const before = text.slice(0, match.index);
    const compileOnly = new RegExp(
      `${COMPILE_ONLY_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
    ).test(before);
    blocks.push({ file, index, source: match[1].replace(/\s+$/, ''), compileOnly });
  }
  return blocks;
}

/** 尝试用每种 lexicon 编译；返回成功的 locale id + 编译产物，或全部失败时的错误清单。 */
function compileInAnyLexicon(
  source: string,
):
  | { ok: true; locale: string; lexicon: Lexicon; core: unknown }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  for (const [id, lexicon] of LEXICONS) {
    const result = compile(source, { lexicon });
    if (result.success) return { ok: true, locale: id, lexicon, core: result.core };
    const msgs = (result.parseErrors ?? []).map((e) => e.message).join('; ');
    errors.push(`${id}: ${msgs || '编译失败（无诊断）'}`);
  }
  return { ok: false, errors };
}

/**
 * 求值块内每条规则，收集「函数不存在」类错误。
 *
 * <p>入参由 schema 合成（`generateInputValues`），仅用于让规则体真正执行到——
 * `evaluate` 会在跑函数体**之前**校验必填参数，若传空对象则一律停在
 * `Missing required parameter`，函数体里的未定义调用永远暴露不出来。
 */
function undefinedFunctionErrors(
  source: string,
  lexicon: Lexicon,
  core: unknown,
): string[] {
  const found: string[] = [];
  const decls =
    (core as { decls?: Array<{ kind?: string; name?: string }> } | null)?.decls ?? [];
  for (const decl of decls) {
    if (decl.kind !== 'Func' || !decl.name) continue;
    let inputs: Record<string, unknown> = {};
    try {
      const schema = extractSchema(source, { lexicon, functionName: decl.name });
      inputs = generateInputValues(schema.parameters ?? []) as Record<string, unknown>;
    } catch {
      // schema 抽取失败不阻断——用空入参兜底，最坏情况是这条规则没被真正跑到。
    }
    const outcome = evaluate(core as never, decl.name, inputs) as {
      success: boolean;
      error?: string;
    };
    if (!outcome.success && /Undefined function/.test(outcome.error ?? '')) {
      found.push(`${decl.name}: ${outcome.error}`);
    }
  }
  return found;
}

describe('文档 CNL 示例可编译', () => {
  initializeAllBundledLexicons();

  const blocks = collectMdx(CONTENT_ROOT).flatMap(extractAsterBlocks);

  it('content/ 下存在 ```aster 示例（防止 glob 失效后静默全过）', () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  it.each(blocks)('$file 第 $index 个 aster 块编译通过', ({ source }) => {
    const outcome = compileInAnyLexicon(source);
    if (!outcome.ok) {
      // 失败时把源码与各语言错误一并打印，方便直接定位修复。
      throw new Error(
        `示例无法在任何已注册语言中编译：\n${source}\n\n` +
          outcome.errors.map((e) => `  - ${e}`).join('\n'),
      );
    }
    expect(outcome.ok).toBe(true);
  });

  const evaluated = blocks.filter((b) => !b.compileOnly);

  it('存在需要求值的块（防止全被 compile-only 豁免后静默失效）', () => {
    expect(evaluated.length).toBeGreaterThan(0);
  });

  it.each(evaluated)(
    '$file 第 $index 个 aster 块所调用的函数都存在',
    ({ source }) => {
      const outcome = compileInAnyLexicon(source);
      if (!outcome.ok) return; // 编译失败已由上一条用例报出，此处不重复报错
      const missing = undefinedFunctionErrors(source, outcome.lexicon, outcome.core);
      if (missing.length > 0) {
        throw new Error(
          `示例调用了引擎里不存在的函数（compile 不校验这一点，只有 evaluate 会报）：\n` +
            `${source}\n\n` +
            missing.map((m) => `  - ${m}`).join('\n'),
        );
      }
      expect(missing).toEqual([]);
    },
  );
});
