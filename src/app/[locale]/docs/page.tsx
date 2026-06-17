import { setRequestLocale } from 'next-intl/server';
import { defaultLocale, locales, type Locale } from '@/i18n/config';
import type { ComponentType } from 'react';

/**
 * 文档页（ADR 0018 Phase 3 PoC）：按 locale 加载 content/<locale>/quickstart.mdx。
 *
 * 证明"每 locale 一套 MDX 文档"的内容路由路径在 Next.js 可行（对照 VitePress 的
 * docs/<lang>/）。缺失的 locale 文档 fallback 到 en —— 与 messages 的 fail-open 同纪律。
 * 后续里程碑把 64 篇 md 批量迁移进来，并接 next-intl 的 pathnames 做本地化 URL。
 */
export default async function DocsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const Content = await loadDoc(locale as Locale);
  return (
    <article className="prose">
      <Content />
    </article>
  );
}

/** 动态加载该 locale 的 quickstart MDX，缺失则 fallback 到 en。 */
async function loadDoc(locale: Locale): Promise<ComponentType> {
  const target = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
  try {
    return (await import(`../../../../content/${target}/quickstart.mdx`)).default;
  } catch {
    return (await import(`../../../../content/${defaultLocale}/quickstart.mdx`)).default;
  }
}
