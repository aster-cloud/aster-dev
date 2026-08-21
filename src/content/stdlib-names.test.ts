/**
 * 文档提到的 stdlib 函数必须在引擎里真实存在（回归守卫）。
 *
 * 背景：姊妹守卫 `cnl-examples.test.ts` 只把 ```aster 代码块喂给 `compile`。
 * 但**未知内置函数在编译期不解析**——`compile("Return Text.nope(x).")` 返回
 * `success: true`，只有 `evaluate` 才报 `Undefined function`。实测把
 * `Text.substring`（当时 TS 引擎没有）塞进代码块，那个守卫依然全绿。
 *
 * 更要命的是：stdlib 文档把函数列在**表格**里而非代码块里，表格根本不在
 * 那个守卫的正则覆盖范围内——两层漏网，于是六个 JVM-only 函数长期挂在
 * 文档上，用户在浏览器演练场照抄必然撞 `Undefined function`。
 *
 * ★其中三个（Maybe.unwrap / Result.unwrap / Result.unwrapErr）是人工审计**漏掉**的：
 *   当时只从 stdlib 表格里抽名字，而它们写在另一种表格形态里。本守卫改成
 *   「扫全文所有 X.y( 引用」后立刻把它们暴露出来——这正是它存在的理由。
 *
 * 本测试改从**运行期**求证：把文档里出现的每个 `X.y(` 逐个真正 evaluate 一次，
 * 只把 `Undefined function` 判为失败（参数类型/元数不匹配等其它错误说明函数
 * 存在，不算）。名单不硬编码在这里——硬编码的名单自己也会漂移，直接问引擎。
 *
 * ★ 已知的 JVM-only 例外集中登记在 `JVM_ONLY` 并在文档里标 †。
 *   2026-08：aster-lang-ts#112 已补齐原先那六个，随 1.0.23 发版，故该集合现为空。
 *   将来若又出现 JVM-only 函数，加进去并在文档标 †；补齐后不移除则断言报红。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compile,
  evaluate,
  initializeAllBundledLexicons,
  EN_US,
} from '@aster-cloud/aster-lang-ts/browser';

const CONTENT_ROOT = fileURLToPath(new URL('../../content', import.meta.url));

/**
 * 已知只在 JVM 引擎实现、TS 引擎尚缺的内置函数。文档中已用 † 标注。
 * TS 侧补齐后应清空本集合（见 aster-lang-ts#112）。
 */
const JVM_ONLY = new Set<string>([
  // 1.0.23 起为空：aster-lang-ts#112 已在 TS 侧补齐原先那六个仅 JVM 可用的函数，
  // 随 1.0.23 列车发到 npm（实测 @aster-cloud/aster-lang-ts@1.0.23 六个全部可求值）。
  // 下方"名单不含已补齐函数"的断言会盯着这里：若将来又有 JVM-only 函数写进文档，
  // 加进本集合并在文档标 † 即可；补齐后不移除则该断言报红。
]);

/** 文档里 stdlib 命名空间白名单——只检查这些前缀，避免把示例里的用户模块名当成内置。 */
const NAMESPACES = ['Text', 'List', 'Map', 'Date', 'Decimal', 'Num', 'Maybe', 'Option', 'Result'];

function collectMdx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...collectMdx(p));
    else if (entry.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/** 抽取文档中所有形如 `Text.foo(` 的函数引用（表格、代码块、散文一视同仁）。 */
function collectStdlibRefs(): Map<string, string[]> {
  const re = new RegExp(`\\b(${NAMESPACES.join('|')})\\.([a-zA-Z][a-zA-Z0-9]*)\\s*\\(`, 'g');
  const found = new Map<string, string[]>();
  for (const abs of collectMdx(CONTENT_ROOT)) {
    const file = relative(CONTENT_ROOT, abs);
    const text = readFileSync(abs, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = `${m[1]}.${m[2]}`;
      const files = found.get(name) ?? [];
      if (!files.includes(file)) files.push(file);
      found.set(name, files);
    }
  }
  return found;
}

/**
 * 问引擎：这个名字存在吗？
 *
 * 只有 `Undefined function` 才算"不存在"；元数/类型不匹配等错误恰恰证明它存在。
 */
function existsInEngine(name: string): boolean {
  const src = `Module probe.\n\nRule r given x as Text, produce Text:\n  Return ${name}(x).\n`;
  const c = compile(src, { lexicon: EN_US });
  if (!c.success || !c.core) return false;
  const r = evaluate(c.core, 'r', { x: 'probe' });
  if (r.success) return true;
  return !/Undefined function/i.test(String(r.error ?? ''));
}

describe('文档提到的 stdlib 函数在引擎中真实存在', () => {
  beforeAll(async () => {
    await initializeAllBundledLexicons();
  });

  const refs = collectStdlibRefs();

  it('确实从文档里抽到了 stdlib 引用（防正则失效后静默全过）', () => {
    expect(refs.size).toBeGreaterThan(10);
  });

  // 自检：探针必须能判负。否则"全部通过"没有任何意义——这正是原守卫的毛病。
  it('探针具备鉴别力：不存在的函数必须被判为不存在', () => {
    expect(existsInEngine('Text.definitelyNotARealBuiltin')).toBe(false);
    expect(existsInEngine('Text.toUpper')).toBe(true);
  });

  it('文档中每个 stdlib 函数都能在 TS 引擎解析（JVM-only 例外需标 †）', () => {
    const phantom: string[] = [];
    for (const [name, files] of refs) {
      if (JVM_ONLY.has(name)) continue;
      if (!existsInEngine(name)) phantom.push(`${name}（出现于 ${files.join(', ')}）`);
    }
    expect(
      phantom,
      `以下函数写在文档里但 TS 引擎中不存在——用户在演练场照抄会撞 ` +
        `"Undefined function"。请修引擎、改文档，或（若确为 JVM-only）` +
        `加入 JVM_ONLY 并在文档中标 †：\n  ${phantom.join('\n  ')}`,
    ).toEqual([]);
  });

  it('JVM_ONLY 名单不含已被 TS 引擎补齐的函数（防名单过期后掩盖真实覆盖）', () => {
    const stale = [...JVM_ONLY].filter((n) => existsInEngine(n));
    expect(
      stale,
      `这些函数 TS 引擎已经实现，应从 JVM_ONLY 移除并去掉文档里的 † 标记：\n  ${stale.join('\n  ')}`,
    ).toEqual([]);
  });
});
