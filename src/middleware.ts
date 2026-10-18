import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * next-intl 中间件：locale 协商 + /[locale] 前缀重写（与 aster-cloud 同构）。
 *
 * 用 middleware.ts（非 Next 16 的 proxy.ts）—— OpenNext Cloudflare 部署要求
 * middleware 跑 Edge runtime；proxy.ts 默认 Node runtime 不被 OpenNext 支持
 * （"Node.js middleware is not currently supported"）。middleware.ts 默认 Edge，
 * 与 aster-cloud 对齐。dev 的"middleware 弃用"提示是 cosmetic，OpenNext 兼容优先。
 */
export default createMiddleware(routing);

export const config = {
  // 跳过 api / 嵌入路由 / 静态资源 / 内部路径。embed 自带 /embed/<name>/[locale] 段，
  // 不走 locale 前缀重写，否则英文会被改写为 /en/embed/... 而 404。只排除 embed/ 目录，
  // 不误伤以 embed 开头的其他路径（如 /embedding）。
  matcher: ['/((?!api|embed/|_next|_vercel|.*\\..*).*)'],
};
