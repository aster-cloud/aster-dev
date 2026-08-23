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
 *   2. **静态遍历 Core IR** 收集全部 `Call` 节点，逐个确认被调函数在引擎里存在
 *
 * <p>★第 2 层曾写成"合成入参跑一遍 evaluate 看报错"，被对抗性审查证伪：
 * 求值只覆盖**入参恰好走到的那条路径**，69 处注入变异有 32 处漏检（46.4%），
 * 含 Quickstart 的门面规则。三种漏法都实证过——If 分支未覆盖、Match 臂未命中、
 * 前置调用先抛异常导致后续调用根本没被解析。
 * 改为遍历 IR 后与执行路径**无关**，覆盖率 100%，且不再需要合成入参，
 * 那批"数据不合适"的噪音（`Date.InvalidISODate` 等）随之消失。
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

interface AsterBlock {
  /** 相对 content/ 的文件路径，便于定位。 */
  file: string;
  /** 文件内第几个 ```aster 块（从 1 起）。 */
  index: number;
  /** 块内源码（已去尾部空白）。 */
  source: string;
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
    blocks.push({ file, index, source: match[1].replace(/\s+$/, '') });
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

/** 从 Core IR 里递归收集所有 `Call` 节点的被调名 + 源码位置。 */
function collectCalls(core: unknown): Array<{ name: string; line?: number }> {
  const out: Array<{ name: string; line?: number }> = [];
  const seen = new Set<unknown>();
  (function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    if (seen.has(node)) return; // 防御 IR 里可能的共享/环状引用
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const n = node as {
      kind?: string;
      target?: { kind?: string; name?: string; origin?: { start?: { line?: number } } };
    };
    if (n.kind === 'Call' && n.target?.kind === 'Name' && n.target.name) {
      out.push({ name: n.target.name, line: n.target.origin?.start?.line });
    }
    Object.values(node as Record<string, unknown>).forEach(walk);
  })(core);
  return out;
}

/**
 * 判断一个函数名在引擎里是否存在。
 *
 * <p>不自己维护"合法名单"——那会与引擎漂移。改为**问引擎本身**：编一个只调该名字的
 * 探针模块并求值，若报 `Undefined function` 即不存在；存在的函数会因参数个数/类型
 * 报别的错，同样说明"名字是认识的"。
 *
 * <p>★探针**必须传一个实参**。解释器按 arity 分派构造器：零参的 `Some()` 会报
 * `Undefined function 'Some'`，而 `Some(0)` 正常——若探针写成零参，`Some`/`Ok`/`Err`
 * 这些真实存在的构造器会被误判成"不存在"（实测确认）。传 1 个参数对
 * `List.empty`（零参 builtin）也不影响判定，因为参数个数不符报的是别的错。
 *
 * <p>结果缓存：同一个名字在整个 content/ 里会出现很多次。
 */
const nameExistsCache = new Map<string, boolean>();
function functionExists(name: string): boolean {
  const cached = nameExistsCache.get(name);
  if (cached !== undefined) return cached;
  const probe = compile(`Module probe.\n\nRule probe produce Int:\n  Return ${name}(0).\n`, {
    lexicon: EN_US,
  });
  let exists = true;
  if (probe.success) {
    const outcome = evaluate(probe.core as never, 'probe', {}) as {
      success: boolean;
      error?: string;
    };
    exists = !/Undefined function/.test(outcome.error ?? '');
  }
  // 探针本身编译失败（名字不是合法调用语法）时不下结论，交回原样通过，
  // 避免把测试的局限当成文档的错。
  nameExistsCache.set(name, exists);
  return exists;
}

/**
 * 收集块内所有**不存在**的被调函数。
 *
 * <p>★为什么扫 IR 而不是"跑一遍看报错"：求值只覆盖**入参恰好走到的那条路径**。
 * 实测 `If x at least 1000000: Return List.definitelyNotReal(x).` 在合成入参
 * `{x:0}` 下走 else 分支，整条规则返回 success——未定义函数完全漏网。
 * content/ 下有 16 个文件含分支示例，这不是理论问题。
 *
 * <p>扫 IR 则与执行路径无关：`Call` 节点在编译期就已全部存在，
 * 分支、未被调用的规则、lambda 体内的调用都能覆盖到。
 */
function undefinedCalls(core: unknown, moduleFuncs: Set<string>): string[] {
  const found: string[] = [];
  for (const call of collectCalls(core)) {
    // 模块内自定义的规则名不是 builtin，跳过。
    if (moduleFuncs.has(call.name)) continue;
    if (functionExists(call.name)) continue;
    found.push(`第 ${call.line ?? '?'} 行: ${call.name}`);
  }
  return [...new Set(found)];
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

  // ★硬编码块数：新增/删除示例必须显式改这个数字，让"覆盖面变了"在 review 里可见。
  // 用 toBeGreaterThan(0) 挡不住"豁免掉 45/46 个块仍然全绿"这类静默塌缩
  // （对抗性审查实证：豁免机制会让用例数 94→93 而报告仍显示 all pass）。
  const EXPECTED_BLOCK_COUNT = 47;

  it(`content/ 下恰有 ${EXPECTED_BLOCK_COUNT} 个 aster 块（变动需显式更新此数）`, () => {
    expect(blocks.length).toBe(EXPECTED_BLOCK_COUNT);
  });

  it.each(blocks)(
    '$file 第 $index 个 aster 块所调用的函数都存在',
    ({ source }) => {
      const outcome = compileInAnyLexicon(source);
      if (!outcome.ok) return; // 编译失败已由上一条用例报出，此处不重复报错
      const moduleFuncs = new Set(
        ((outcome.core as { decls?: Array<{ kind?: string; name?: string }> }).decls ?? [])
          .filter((d) => d.kind === 'Func' && d.name)
          .map((d) => d.name as string),
      );
      const missing = undefinedCalls(outcome.core, moduleFuncs);
      if (missing.length > 0) {
        throw new Error(
          `示例调用了引擎里不存在的函数（compile 不校验这一点）：\n${source}\n\n` +
            missing.map((m) => `  - ${m}`).join('\n'),
        );
      }
      expect(missing).toEqual([]);
    },
  );
});
