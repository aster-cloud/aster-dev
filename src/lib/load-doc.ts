import { defaultLocale, locales, type Locale } from '@/i18n/config';
import type { ComponentType } from 'react';

/**
 * 按 locale 加载 content/<locale>/<slug>.mdx，缺失则 fallback 到 en（与 messages
 * 的 fail-open 同纪律）。slug 用白名单避免动态 import 的任意路径。
 */
const SLUGS = [
  'quickstart',
  'overview',
  'language-guide',
  'lexicons',
  'stdlib',
  'reference',
  'browser-api',
  'deployment',
  'editions',
] as const;
export type DocSlug = (typeof SLUGS)[number];

export async function loadDoc(locale: string, slug: DocSlug): Promise<ComponentType> {
  const target = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
  try {
    return (await import(`../../content/${target}/${slug}.mdx`)).default;
  } catch {
    return (await import(`../../content/${defaultLocale}/${slug}.mdx`)).default;
  }
}
