import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

/**
 * next-intl 路由：/[locale]/... 前缀。与 aster-cloud 同构。
 * localePrefix 'as-needed'：默认 locale 不带前缀（/docs），其它带（/zh/docs）。
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});
