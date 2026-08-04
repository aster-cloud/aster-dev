#!/usr/bin/env node
/**
 * 构建期文档搜索索引。
 *
 * <p>扫 `content/<locale>/<slug>.mdx`，抽出 H1 作标题、首段作描述、H2/H3 作小节，
 * 输出 `public/search-index.<locale>.json`。放 public 是为了让 **aster-cloud 的
 * 站内助手**能在它自己的构建期抓取并合并——助手因此可以引用 aster-lang.dev 的
 * 内容，而不必在运行时抓站（运行时抓站意味着站点改版就静默失效、网络抖动就答
 * 不出，与"答案可溯源"的产品承诺相悖）。
 *
 * <p><b>★只索引有真实路由的 slug</b>：`content/` 里有 `quickstart.mdx`，但
 * `src/app/[locale]/docs/` 下没有对应路由目录，线上 /docs/quickstart 是 404。
 * 索引进去就等于给助手一条必然 404 的链接。故以**路由目录**为准，而非文件。
 *
 * <p>输出 schema 与 aster-cloud 的 search-index 完全一致（slug/title/description/
 * headings），这样消费侧不需要写第二套解析。
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, readdirSync, existsSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CONTENT_ROOT = resolve(REPO_ROOT, 'content');
const ROUTES_ROOT = resolve(REPO_ROOT, 'src/app/[locale]/docs');
const OUTPUT_DIR = resolve(REPO_ROOT, 'public');
const LOCALES = ['en', 'zh', 'de', 'hi'];

/** 与 aster-cloud 同预算：超了宁可 fail 也不拖慢首屏。 */
const GZIP_BUDGET_BYTES = 25 * 1024;

/**
 * 有真实路由的 slug 集合 —— 以 `src/app/[locale]/docs/<slug>/` 目录为准。
 *
 * <p>不读 load-doc.ts 的 SLUGS 白名单：那是"允许加载哪些内容"，
 * 与"线上是否可访问"不是一回事（quickstart 就在白名单里却没有路由）。
 */
function routedSlugs() {
  const out = new Set();
  for (const name of readdirSync(ROUTES_ROOT)) {
    const full = join(ROUTES_ROOT, name);
    if (!lstatSync(full).isDirectory()) continue;
    if (existsSync(join(full, 'page.tsx'))) out.add(name);
  }
  return out;
}

/** 去掉 MDX 里的 import/export 行与 HTML 注释，避免它们混进标题/描述。 */
function cleanBody(raw) {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\r?\n/)
    .filter((l) => !/^\s*(import|export)\s/.test(l))
    .join('\n');
}

/** H1 作标题（本仓 MDX 无 frontmatter，标题就是正文第一个 # ）。 */
function parseTitle(body) {
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : '';
}

/**
 * 首个非空正文段落作描述（截断到 200 字符）。
 *
 * <p>跳过标题、代码块、列表、表格、JSX 标签——它们当描述都没有意义。
 */
function parseDescription(body) {
  const lines = body.split(/\r?\n/);
  let inFence = false;
  const buf = [];
  for (const line of lines) {
    if (line.startsWith('```')) {
      inFence = !inFence;
      if (buf.length) break;
      continue;
    }
    if (inFence) continue;
    const t = line.trim();
    if (!t) {
      if (buf.length) break; // 段落结束
      continue;
    }
    if (/^#/.test(t) || /^[-*|>]/.test(t) || /^</.test(t)) {
      if (buf.length) break;
      continue;
    }
    buf.push(t);
  }
  const text = buf
    .join(' ')
    // 去掉 markdown 强调/行内代码/链接语法，留纯文本
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
  return text.length > 200 ? `${text.slice(0, 197)}...` : text;
}

/** H2 + H3（跳过围栏代码块内的 # 注释）。 */
function parseHeadings(body) {
  const out = [];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^###?\s+(.+?)\s*$/);
    if (m && !line.startsWith('# ')) out.push(m[1].trim());
  }
  return out;
}

function buildLocale(locale, routed) {
  const dir = join(CONTENT_ROOT, locale);
  if (!existsSync(dir)) return { locale, entries: [] };
  const entries = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.mdx')) continue;
    const slug = name.slice(0, -4);
    // ★无路由的内容不索引——否则助手会给出必然 404 的链接。
    if (!routed.has(slug)) {
      console.warn(`[build-docs-index] skip ${locale}/${name} — 无对应路由目录`);
      continue;
    }
    const body = cleanBody(readFileSync(join(dir, name), 'utf8'));
    const title = parseTitle(body);
    const headings = parseHeadings(body);
    if (!title && headings.length === 0) continue;
    entries.push({ slug, title, description: parseDescription(body), headings });
  }
  return { locale, entries };
}

function main() {
  const routed = routedSlugs();
  if (routed.size === 0) {
    throw new Error('[build-docs-index] 未发现任何 docs 路由目录，疑似路径变更');
  }
  let failed = false;
  // 先建 en——它是所有 locale 的回退源（见 src/lib/load-doc.ts）。
  const enIndex = buildLocale('en', routed);
  for (const locale of LOCALES) {
    let index = buildLocale(locale, routed);
    // ★内容缺失时线上按 en 渲染（loadDoc 的 fail-open），索引必须跟着回退，
    //   否则 de/hi 检索恒零命中。entries 用 en 的，locale 字段保留自身——
    //   消费侧据此拼 /de/docs/... 前缀，路由是存在的（只是内容为英文）。
    if (index.entries.length === 0 && locale !== 'en') {
      console.warn(`[build-docs-index] ${locale}: 无本地化内容，回退 en 索引（与 loadDoc 同口径）`);
      index = { locale, entries: enIndex.entries };
    }
    const json = `${JSON.stringify(index, null, 2)}\n`;
    const gz = gzipSync(json).length;
    const outFile = join(OUTPUT_DIR, `search-index.${locale}.json`);
    writeFileSync(outFile, json);
    const status = gz > GZIP_BUDGET_BYTES ? 'OVER BUDGET' : 'ok';
    console.log(
      `[build-docs-index] ${locale}: ${index.entries.length} entries, ${gz}B gzip (${status})`,
    );
    if (gz > GZIP_BUDGET_BYTES) failed = true;
  }
  if (failed) {
    throw new Error(
      `[build-docs-index] 索引超出 gzip 预算 ${GZIP_BUDGET_BYTES}B —— ` +
        '请精简内容或只索引标题/小节，不要直接调高预算',
    );
  }
}

main();
