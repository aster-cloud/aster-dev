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
 * 仅检查 ```aster 块。形式语法（EBNF）等非源码块请用 ```ebnf 等其它语言标签，本测试
 * 不会尝试编译它们。
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compile,
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

/** 尝试用每种 lexicon 编译；返回成功的 locale id，或全部失败时的错误清单。 */
function compileInAnyLexicon(
  source: string,
): { ok: true; locale: string } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  for (const [id, lexicon] of LEXICONS) {
    const result = compile(source, { lexicon });
    if (result.success) return { ok: true, locale: id };
    const msgs = (result.parseErrors ?? []).map((e) => e.message).join('; ');
    errors.push(`${id}: ${msgs || '编译失败（无诊断）'}`);
  }
  return { ok: false, errors };
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
});
