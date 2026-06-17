import { setRequestLocale } from 'next-intl/server';
import { DocsSidebar } from '@/components/docs-sidebar';
import type { ReactNode } from 'react';

/**
 * 文档布局：左固定分组导航 + 右正文（prose）。语言规范标准三栏式，
 * 后续里程碑右侧补 TOC（on this page）。
 */
export default async function DocsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <DocsSidebar />
        </div>
      </aside>
      <article className="prose prose-zinc max-w-none dark:prose-invert">
        {children}
      </article>
    </div>
  );
}
