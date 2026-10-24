import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// Next 自己用来匹配 redirects 的同一个 path-to-regexp，测试结果即线上匹配语义。
import { match } from 'next/dist/compiled/path-to-regexp';
import { listPosts } from '../lib/blog';
import { locales } from '../i18n/config';
import { UNMIGRATED, legacyRedirects } from './legacy-redirects';

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
  '/learn/cnl-quick-reference.html',
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
  '/getting-started/quickstart.html',
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
function step(url: string): string | undefined {
  for (const r of redirects) {
    const m = match(r.source)(url);
    if (!m) continue;
    const rest = (m.params as { path?: string[] }).path ?? [];
    return r.destination.replace(/\/:path[*+]/, rest.length ? `/${rest.join('/')}` : '');
  }
  return undefined;
}

/** 跟随同站重定向链（浏览器的行为），返回最终 URL；无规则命中时返回 undefined。 */
function resolve(url: string): string | undefined {
  let current: string | undefined;
  let next = step(url);
  for (let hops = 0; next !== undefined && hops < 5; hops++) {
    current = next;
    if (current.startsWith('https://')) return current;
    next = step(current);
  }
  return current;
}

const stripLocale = (path: string) => path.replace(/^\/(zh|de|hi)(?=\/|$)/, '') || '/';

describe('legacy redirects (issue #45)', () => {
  for (const locale of locales) {
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

  // 每条跨站规则逐一钉死目标：前缀校验挡不住"指到 cloud 上另一个页面"的错误。
  it.each([
    ['/api/rest/policies', 'https://aster-lang.cloud/docs/api/rest/policies'],
    ['/zh/api', 'https://aster-lang.cloud/zh/docs/api'],
    ['/hi/getting-started/quickstart', 'https://aster-lang.cloud/hi/docs/getting-started/quickstart'],
    ['/hi/getting-started/quickstart.html', 'https://aster-lang.cloud/hi/docs/getting-started/quickstart'],
    ['/de/graphql', 'https://aster-lang.cloud/de/docs/api/graphql/overview'],
    ['/graphql/queries', 'https://aster-lang.cloud/docs/api/graphql/queries'],
    ['/websocket', 'https://aster-lang.cloud/docs/api/websocket/preview'],
    ['/hi/websocket/preview', 'https://aster-lang.cloud/hi/docs/api/websocket/preview'],
  ])('%s → %s', (from, to) => {
    expect(resolve(from)).toBe(to);
  });

  it.each([
    ['/index.html', '/'],
    ['/zh/index.html', '/zh'],
    ['/zh/editions/index.html', '/zh/docs/editions'],
    ['/learn/overview.html', '/docs/overview'],
    ['/de/pricing', '/de/docs/editions'],
  ])('同站 %s → %s', (from, to) => {
    expect(resolve(from)).toBe(to);
  });

  it('UNMIGRATED 里的页面确实还没有路由（内容迁入后应从清单移除并补规则）', () => {
    for (const path of UNMIGRATED) expect(hasRoute(path)).toBe(false);
  });

  it('不劫持本站现有页面', () => {
    for (const path of ['/docs', '/docs/overview', '/playground', '/blog', '/blog/feed.xml']) {
      expect(resolve(path)).toBeUndefined();
      expect(resolve(`/hi${path}`)).toBeUndefined();
    }
  });
});
