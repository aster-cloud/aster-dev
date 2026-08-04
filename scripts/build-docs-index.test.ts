// 文档搜索索引测试。
//
// 锁的是一条**产品级不变量**：索引里的每个 slug 都必须有真实路由。
// 站内助手（aster-cloud）会用这份索引生成给用户点的链接——索引进一个
// 没有路由的 slug，等于给用户一条必然 404 的链接。
//
// ★不 mock 文件系统：直接跑真实生成器、读真实产物。mock 掉就测不出
//   "content 里有但路由没有"这类真实漂移（quickstart.mdx 就是这种情况）。

import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..');
const LOCALES = ['en', 'zh', 'de', 'hi'] as const;

type Entry = { slug: string; title: string; description: string; headings: string[] };
type Index = { locale: string; entries: Entry[] };

function readIndex(locale: string): Index {
  return JSON.parse(
    readFileSync(join(REPO_ROOT, 'public', `search-index.${locale}.json`), 'utf8'),
  ) as Index;
}

/** 有 page.tsx 的 docs 路由目录 —— 线上可访问的唯一真相。 */
function routedSlugs(): Set<string> {
  const root = join(REPO_ROOT, 'src/app/[locale]/docs');
  const out = new Set<string>();
  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (name.isDirectory() && existsSync(join(root, name.name, 'page.tsx'))) {
      out.add(name.name);
    }
  }
  return out;
}

beforeAll(() => {
  // 跑真实生成器，保证测的是当前代码的产物而非陈旧文件。
  execFileSync('node', [join(REPO_ROOT, 'scripts/build-docs-index.mjs')], { stdio: 'pipe' });
});

describe('docs search index', () => {
  it('★每个 slug 都有真实路由（否则助手会给出 404 链接）', () => {
    const routed = routedSlugs();
    expect(routed.size).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      for (const e of readIndex(locale).entries) {
        expect(routed, `${locale}/${e.slug} 无对应路由`).toContain(e.slug);
      }
    }
  });

  it('★无路由的内容不进索引（quickstart 有 mdx 但无 page.tsx）', () => {
    const hasQuickstartContent = existsSync(join(REPO_ROOT, 'content/en/quickstart.mdx'));
    const hasQuickstartRoute = existsSync(
      join(REPO_ROOT, 'src/app/[locale]/docs/quickstart/page.tsx'),
    );
    // 前提成立时才断言——将来若补了路由，本用例自动失效而不是误报
    if (hasQuickstartContent && !hasQuickstartRoute) {
      for (const locale of LOCALES) {
        expect(readIndex(locale).entries.map((e) => e.slug)).not.toContain('quickstart');
      }
    }
  });

  it('★de/hi 无本地化内容时回退 en 条目（线上正是这样渲染的）', () => {
    // loadDoc 缺失即 fallback en，索引不跟着回退会让这两个语言检索恒零命中
    const en = readIndex('en').entries.map((e) => e.slug).sort();
    for (const locale of ['de', 'hi'] as const) {
      const got = readIndex(locale).entries.map((e) => e.slug).sort();
      expect(got.length).toBeGreaterThan(0);
      expect(got).toEqual(en);
    }
  });

  it('每条都有标题（无标题的条目对检索没有意义）', () => {
    for (const locale of LOCALES) {
      for (const e of readIndex(locale).entries) {
        expect(e.title.trim().length, `${locale}/${e.slug} 标题为空`).toBeGreaterThan(0);
      }
    }
  });

  it('描述不含 markdown 残留与 import 行', () => {
    for (const locale of LOCALES) {
      for (const e of readIndex(locale).entries) {
        expect(e.description).not.toMatch(/^import\s/);
        expect(e.description).not.toContain('```');
        expect(e.description.length).toBeLessThanOrEqual(200);
      }
    }
  });

  it('zh 是真本地化内容，不是 en 副本', () => {
    const en = readIndex('en').entries;
    const zh = readIndex('zh').entries;
    expect(zh.length).toBe(en.length);
    // 至少多数条目标题应与 en 不同——否则说明本地化没生效
    const differing = zh.filter((z, i) => z.title !== en[i].title).length;
    expect(differing).toBeGreaterThan(en.length / 2);
  });

  // ★回归：CodeQL js/incomplete-multi-character-sanitization。
  //   原实现用单次 replace(/<!--[\s\S]*?-->/g,'')，对嵌套输入不完整——
  //   '<!-- <!-- x --> -->' 替换后残留 ' -->'。索引内容会进 UI 与 LLM prompt，
  //   残留标记既可能破坏渲染，也可能被当成有意义的文本。
  it('★索引中不含任何 HTML 注释残留标记', () => {
    for (const locale of LOCALES) {
      for (const e of readIndex(locale).entries) {
        const all = [e.title, e.description, ...e.headings].join(' ');
        expect(all, `${locale}/${e.slug} 残留注释标记`).not.toContain('<!--');
        expect(all, `${locale}/${e.slug} 残留注释标记`).not.toContain('-->');
      }
    }
  });

  it('locale 字段与文件名一致（消费侧据此拼 URL 前缀）', () => {
    for (const locale of LOCALES) {
      expect(readIndex(locale).locale).toBe(locale);
    }
  });
});
