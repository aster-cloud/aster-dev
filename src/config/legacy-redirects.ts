import type { NextConfig } from 'next';
import { locales } from '../i18n/config';

type Redirect = Awaited<ReturnType<NonNullable<NextConfig['redirects']>>>[number];

/**
 * 旧 VitePress 站（aster-lang-dev，已归档）的 URL → 本站或 aster-lang.cloud 的对应页面。
 *
 * 为什么需要：旧站靠 Cloudflare Pages 的 _redirects 把旧路径 308/301 走，Workers 版本站
 * 接管 aster-lang.dev 后这张表没有迁过来，旧书签、搜索结果与外链全部 404。旧表还漏了
 * Hindi 前缀（issue #45）。这里按 i18n 配置里的 locale 统一展开，新增语言自动覆盖。
 *
 * 规则形状：
 *   - 旧站未开 cleanUrls，链接是 xxx.html 与 xxx/index.html。最前面两条通配规则先把它们
 *     规范成无扩展名路径，后续规则只需按干净路径书写。
 *   - 同站：en 不带前缀（localePrefix 'as-needed'），其余带 /<locale>。
 *   - 跨站：aster-lang.cloud 同样是 as-needed，en 为 /docs/...，其余为 /<locale>/docs/...。
 *   - 规则按顺序首个命中生效，精确规则必须排在同前缀的 :path* 规则之前。
 *
 * legacy-redirects.test.ts 用 Next 自身的路径匹配器校验：旧站每个 URL 要么命中这里的规则
 * 且同站目标确有路由，要么本站已有同路径页面，要么列在 UNMIGRATED（明确记录、尚无去处）。
 */

const CLOUD = 'https://aster-lang.cloud';

/** 旧路径（无 locale 前缀）→ 新路径。`:path*` 同时匹配旧路径本身与其任意子路径。 */
interface Rule {
  from: string;
  to: string;
}

export const SAME_SITE: readonly Rule[] = [
  { from: '/learn', to: '/docs' },
  { from: '/learn/overview', to: '/docs/overview' },
  { from: '/learn/browser-api', to: '/docs/browser-api' },
  { from: '/learn/deployment-guide', to: '/docs/deployment' },
  { from: '/learn/cnl-quick-reference', to: '/docs/reference' },
  { from: '/learn/playground', to: '/playground' },
  { from: '/editions', to: '/docs/editions' },
  // 2026-Q2 旧站已把 /pricing 并入 /editions，这里直接指向最终页面，避免两跳。
  { from: '/pricing/:path*', to: '/docs/editions' },
  { from: '/community/lexicons', to: '/docs/lexicons' },
];

/** 2026-Q3 应用层文档迁往 aster-lang.cloud；to 为 cloud 上不含 locale 前缀的路径。 */
export const CROSS_SITE: readonly Rule[] = [
  { from: '/api/:path*', to: '/docs/api/:path*' },
  { from: '/getting-started/:path*', to: '/docs/getting-started/:path*' },
  { from: '/graphql', to: '/docs/api/graphql/overview' },
  { from: '/graphql/:path*', to: '/docs/api/graphql/:path*' },
  { from: '/websocket', to: '/docs/api/websocket/preview' },
  { from: '/websocket/:path*', to: '/docs/api/websocket/:path*' },
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

/** 旧站静态文件形态的 URL 规范为干净路径。本站没有任何 .html 页面，不会误伤。 */
const HTML_SUFFIX: readonly Redirect[] = [
  { source: '/index.html', destination: '/', permanent: true },
  { source: '/:path+/index.html', destination: '/:path+', permanent: true },
  { source: '/:path+.html', destination: '/:path+', permanent: true },
];

export function legacyRedirects(): Redirect[] {
  const perLocale = locales.flatMap((locale) => {
    const p = locale === 'en' ? '' : `/${locale}`;
    return [
      ...SAME_SITE.map(({ from, to }) => ({ source: `${p}${from}`, destination: `${p}${to}`, permanent: true })),
      ...CROSS_SITE.map(({ from, to }) => ({ source: `${p}${from}`, destination: `${CLOUD}${p}${to}`, permanent: true })),
    ];
  });
  return [...HTML_SUFFIX, ...perLocale];
}
