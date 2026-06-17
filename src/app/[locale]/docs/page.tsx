import { setRequestLocale } from 'next-intl/server';
import { loadDoc } from '@/lib/load-doc';

/**
 * 文档首页 = quickstart（ADR 0018 Phase 3）。按 locale 加载 MDX，缺失 fallback en。
 * prose 包裹由 docs/layout.tsx 提供。
 */
export default async function DocsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const Content = await loadDoc(locale, 'quickstart');
  return <Content />;
}
