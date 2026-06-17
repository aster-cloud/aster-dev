import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// next-intl 中间件：locale 协商 + /[locale] 前缀重写（与 aster-cloud 同构）。
export default createMiddleware(routing);

export const config = {
  // 跳过 api / 静态资源 / 内部路径。
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
