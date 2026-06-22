import { setRequestLocale } from 'next-intl/server';
import { DocsSidebar } from '@/components/docs-sidebar';
import { DocsSidebarDrawer } from '@/components/docs-sidebar-drawer';
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
      {/* min-w-0：让网格 1fr 轨道可收缩到视口宽度（默认 min-width:auto 会被 prose
          里不可断的长行/代码块撑宽，导致移动端正文横向溢出、文字被切）。 */}
      <article className="prose prose-zinc min-w-0 max-w-none dark:prose-invert">
        {/* 移动端章节导航入口（仅 <lg 显示；桌面用上方固定 aside） */}
        <div className="not-prose mb-6 lg:hidden">
          <DocsSidebarDrawer />
        </div>
        {children}
      </article>
    </div>
  );
}
