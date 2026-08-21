import { setRequestLocale } from 'next-intl/server';
import { DocsSidebar } from '@/components/docs-sidebar';
import { DocsSidebarDrawer } from '@/components/docs-sidebar-drawer';
import { DocsToc } from '@/components/docs-toc';
import type { ReactNode } from 'react';

/**
 * 文档布局：左固定分组导航 + 中正文（prose）+ 右页内目录（on this page）。
 *
 * 右栏 TOC 从**运行时 DOM** 读标题 id，因此天然跟随当前语言——
 * rehype-slug 按标题文本生成 id（en `types` / zh `类型`），任何写死的
 * 锚点表都会在非英文页失效（issue #24）。
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
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_200px]">
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
      {/* 页内目录：仅 xl 以上显示——lg 档宽度要留给正文与代码块，塞第三栏会把
          正文挤到换行频繁。移动端已有 DocsSidebarDrawer 提供章节导航。 */}
      <aside className="hidden xl:block">
        <div className="sticky top-20">
          <DocsToc />
        </div>
      </aside>
    </div>
  );
}
