import { defaultLocale, locales, type Locale } from '@/i18n/config';
import type { ComponentType } from 'react';

/**
 * 按 locale 加载 content/<locale>/<slug>.mdx，缺失则 fallback 到 en（与 messages
 * 的 fail-open 同纪律）。slug 用白名单避免动态 import 的任意路径。
 *
 * ★返回值带 `fellBack` 标志：de/hi 目前只有 quickstart 一篇，其余 8 篇都会回落英文。
 * 回落本身是对的（好过 404），但**静默**回落不对——语言切换器只显示
 * "Deutsch / हिन्दी" 且这两个 locale 未标 partial，读者合理预期看到的是本地语言。
 * 由调用方据此渲染一条"本页尚未翻译"的提示。
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

export interface LoadedDoc {
  Content: ComponentType;
  /** 是否因目标 locale 缺该文档而回落到默认语言（英文）。 */
  fellBack: boolean;
}

export async function loadDoc(locale: string, slug: DocSlug): Promise<LoadedDoc> {
  const target = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
  try {
    const Content = (await import(`../../content/${target}/${slug}.mdx`)).default;
    return { Content, fellBack: false };
  } catch {
    const Content = (await import(`../../content/${defaultLocale}/${slug}.mdx`)).default;
    // target === defaultLocale 时说明是英文文档自身缺失（不该发生），此时不算"回落"。
    return { Content, fellBack: target !== defaultLocale };
  }
}
