import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// Next 自己用来匹配 redirects 的同一个 path-to-regexp，测试结果即线上匹配语义。
import { match } from 'next/dist/compiled/path-to-regexp';
import { listPosts } from '../lib/blog';
import { LOCALES, UNMIGRATED, legacyRedirects } from './legacy-redirects';

/**
 * 旧站（aster-cloud/aster-lang-dev @ 9bbc482，已归档）对外暴露过的全部路径，不含 locale 前缀：
 * docs/ 下每个 .md 页面，加上旧 _redirects 已经在承接的历史入口。
 * 页面在 en/zh/de/hi 四个前缀下都存在过（各 locale 子集不同，这里按全集校验，更严）。
 */
const LEGACY_PATHS = [
  '/learn/overview',
  '/learn/overview.html',
  '/learn/browser-api',
  '/learn/browser-api.html',
  '/learn/cnl-quick-reference',
  '/learn/deployment-guide',
  '/learn/playground',
  '/editions',
  '/editions/index.html',
  '/community/lexicons',
  '/community/lexicons.html',
  '/blog',
  ...listPosts().map((p) => `/blog/posts/${p.slug}`),
  // 旧 _redirects 承接的历史入口
  '/pricing',
  '/pricing/enterprise',
  '/api/rest',
  '/getting-started',
  '/getting-started/quickstart',
  '/graphql',
  '/graphql/schema',
  '/websocket',
  '/websocket/events',
  // 尚无去处（UNMIGRATED）
  ...UNMIGRATED,
];

const APP = join(process.cwd(), 'src/app/[locale]');

/** 本站是否有该路径的页面（路径不含 locale 前缀）。 */
function hasRoute(path: string): boolean {
  const slug = /^\/blog\/posts\/([^/]+)$/.exec(path)?.[1];
  if (slug) return listPosts().some((p) => p.slug === slug);
  return existsSync(join(APP, path, 'page.tsx'));
}

const redirects = legacyRedirects();

/** 按 Next 的规则顺序取第一条命中的 redirect，返回替换参数后的目标。 */
function resolve(url: string): string | undefined {
  for (const r of redirects) {
    const m = match(r.source)(url);
    if (!m) continue;
    const rest = (m.params as { path?: string[] }).path ?? [];
    return r.destination.replace('/:path*', rest.length ? `/${rest.join('/')}` : '');
  }
  return undefined;
}

const stripLocale = (path: string) => path.replace(/^\/(zh|de|hi)(?=\/|$)/, '') || '/';

describe('legacy redirects (issue #45)', () => {
  for (const locale of LOCALES) {
    const p = locale === 'en' ? '' : `/${locale}`;
    describe(locale, () => {
      for (const path of LEGACY_PATHS) {
        it(`${p}${path}`, () => {
          const url = `${p}${path}`;
          const target = resolve(url);
          if (target === undefined) {
            // 没有规则：要么本站原路径就有页面，要么是已登记的缺口
            expect(hasRoute(path) || UNMIGRATED.includes(path)).toBe(true);
            return;
          }
          if (target.startsWith('https://')) {
            const expectedPrefix = `https://aster-lang.cloud${p}/docs/`;
            expect(target.startsWith(expectedPrefix)).toBe(true);
            return;
          }
          // 同站：目标与来源同 locale，且目标确有页面
          expect(target.startsWith(p)).toBe(true);
          expect(hasRoute(stripLocale(target))).toBe(true);
        });
      }
    });
  }

  it('子路径原样拼接到 cloud 目标', () => {
    expect(resolve('/hi/getting-started/quickstart')).toBe(
      'https://aster-lang.cloud/hi/docs/getting-started/quickstart',
    );
    expect(resolve('/api/rest/policies')).toBe('https://aster-lang.cloud/docs/api/rest/policies');
    expect(resolve('/de/graphql')).toBe('https://aster-lang.cloud/de/docs/api/graphql/overview');
  });

  it('每个 locale 的规则条数相同（新增规则不会只照顾部分语言）', () => {
    const counts = LOCALES.map(
      (l) => redirects.filter((r) => (l === 'en' ? !/^\/(zh|de|hi)\//.test(r.source) : r.source.startsWith(`/${l}/`))).length,
    );
    expect(new Set(counts).size).toBe(1);
  });

  it('UNMIGRATED 里的页面确实还没有路由（内容迁入后应从清单移除并补规则）', () => {
    for (const path of UNMIGRATED) expect(hasRoute(path)).toBe(false);
  });

  it('不劫持本站现有页面', () => {
    for (const path of ['/docs', '/docs/overview', '/playground', '/blog']) {
      expect(resolve(path)).toBeUndefined();
      expect(resolve(`/hi${path}`)).toBeUndefined();
    }
  });
});
