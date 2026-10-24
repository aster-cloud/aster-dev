import type { NextConfig } from 'next';

type Redirect = Awaited<ReturnType<NonNullable<NextConfig['redirects']>>>[number];

/**
 * 旧 VitePress 站（aster-lang-dev，已归档）的 URL → 本站或 aster-lang.cloud 的对应页面。
 *
 * 为什么需要：旧站靠 Cloudflare Pages 的 _redirects 把旧路径 308/301 走，Workers 版本站
 * 接管 aster-lang.dev 后这张表没有迁过来，旧书签、搜索结果与外链全部 404。旧表还漏了
 * Hindi 前缀（issue #45）。这里按 locale 统一展开，四个语言自动对齐，不再逐个手写。
 *
 * 规则形状：
 *   - 同站：en 不带前缀（localePrefix 'as-needed'），其余带 /<locale>。
 *   - 跨站：aster-lang.cloud 同样是 as-needed，en 为 /docs/...，其余为 /<locale>/docs/...。
 *   - 旧站未开 cleanUrls，页面原本是 xxx.html、目录页是 xxx/index.html，两种都要接住。
 *
 * legacy-redirects.test.ts 用 Next 自身的路径匹配器校验：旧站每个 URL 要么命中这里的规则
 * 且同站目标确有路由，要么本站已有同路径页面，要么列在 UNMIGRATED（明确记录、尚无去处）。
 */

export const LOCALES = ['en', 'zh', 'de', 'hi'] as const;
type Locale = (typeof LOCALES)[number];

const CLOUD = 'https://aster-lang.cloud';

/** 旧路径（无 locale 前缀）→ 本站新路径。`page` 表示旧站叶子页（有 .html 变体）。 */
interface SameSite {
  from: string;
  to: string;
  kind: 'page' | 'dir' | 'tree';
}

export const SAME_SITE: readonly SameSite[] = [
  { from: '/learn', to: '/docs', kind: 'dir' },
  { from: '/learn/overview', to: '/docs/overview', kind: 'page' },
  { from: '/learn/browser-api', to: '/docs/browser-api', kind: 'page' },
  { from: '/learn/deployment-guide', to: '/docs/deployment', kind: 'page' },
  { from: '/learn/cnl-quick-reference', to: '/docs/reference', kind: 'page' },
  { from: '/learn/playground', to: '/playground', kind: 'page' },
  { from: '/editions', to: '/docs/editions', kind: 'dir' },
  // 2026-Q2 旧站已把 /pricing 并入 /editions，这里直接指向最终页面，避免两跳。
  { from: '/pricing', to: '/docs/editions', kind: 'tree' },
  { from: '/community/lexicons', to: '/docs/lexicons', kind: 'page' },
];

/** 旧路径 → aster-lang.cloud 路径（不含 locale 前缀）。2026-Q3 应用层文档迁往 cloud。 */
interface CrossSite {
  from: string;
  to: string;
  /** true：from 下的子路径原样拼到 to 之后 */
  tree: boolean;
}

export const CROSS_SITE: readonly CrossSite[] = [
  { from: '/api', to: '/docs/api', tree: true },
  { from: '/getting-started', to: '/docs/getting-started', tree: true },
  { from: '/graphql', to: '/docs/api/graphql/overview', tree: false },
  { from: '/graphql', to: '/docs/api/graphql', tree: true },
  { from: '/websocket', to: '/docs/api/websocket/preview', tree: false },
  { from: '/websocket', to: '/docs/api/websocket', tree: true },
];

/**
 * 旧站有、但新站与 cloud 都还没有对应内容的页面。保持 404，等内容迁移时再补规则。
 * 列在这里是为了让测试能区分"已知缺口"和"新出现的漏网之鱼"。
 */
export const UNMIGRATED: readonly string[] = [
  '/community',
  '/community/contribute',
  '/community/wanted-languages',
  '/community/compliance',
  '/community/compliance/dpa-template',
  '/community/compliance/dsar',
  '/community/compliance/telemetry-fields',
  '/enterprise',
  '/adr/0010-route-ownership-contract',
];

const prefix = (locale: Locale) => (locale === 'en' ? '' : `/${locale}`);

/**
 * 一条旧路径对应的全部入口：叶子页 /x 还可能以 /x.html 被引用，目录页以 /x/index.html
 * 被引用；tree 用 :path*，它同时匹配 /x 本身与任意子路径。
 */
function legacySources(path: string, kind: SameSite['kind']): string[] {
  if (kind === 'page') return [path, `${path}.html`];
  if (kind === 'dir') return [path, `${path}/index.html`];
  return [`${path}/:path*`];
}

export function legacyRedirects(): Redirect[] {
  return LOCALES.flatMap((locale) => {
    const p = prefix(locale);
    const sameSite = SAME_SITE.flatMap(({ from, to, kind }) =>
      legacySources(from, kind).map((source) => ({
        source: `${p}${source}`,
        destination: `${p}${to}`,
        permanent: true,
      })),
    );
    const crossSite = CROSS_SITE.map(({ from, to, tree }) => ({
      source: tree ? `${p}${from}/:path*` : `${p}${from}`,
      destination: tree ? `${CLOUD}${p}${to}/:path*` : `${CLOUD}${p}${to}`,
      permanent: true,
    }));
    return [...sameSite, ...crossSite];
  });
}
