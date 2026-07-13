/**
 * aster-dev 文档站 locale 配置（ADR 0018 Phase 3）。
 *
 * 与 aster-cloud 的 i18n/config 对齐：短码 locale，统一从后端 locale 注册表
 * （/api/v1/lexicons）派生可用集合。这里只声明站点构建期支持的 locale 全集；
 * 运行时哪些可见仍受后端可用性开关约束（与 cloud 同源）。
 */
export const locales = ['en', 'zh', 'de', 'hi'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  de: 'Deutsch',
  hi: 'हिन्दी',
};

/**
 * 部分翻译的 locale（与 cloud partialLocales 一致）。
 *
 * hi 已补齐至 100% 覆盖 en backbone（184/184 键，正规 Devanagari），故不再是 partial，
 * 与 aster-cloud 的 partialLocales=[] 口径统一（此前 dev 声明 hi=partial 与 cloud 矛盾）。
 */
export const partialLocales: readonly Locale[] = [] as const;
