import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Next 16 proxy 约定（取代已弃用的 middleware.ts）。
 * next-intl locale 协商 + /[locale] 前缀重写。
 */
export default createMiddleware(routing);

export const config = {
  // 跳过 api / 静态资源 / 内部路径。
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
