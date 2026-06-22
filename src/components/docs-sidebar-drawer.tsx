'use client';

import { DocsSidebar } from './docs-sidebar';
import { useTranslations } from 'next-intl';
import { PanelLeft, X } from 'lucide-react';
import { useDrawer } from '@/hooks/useDrawer';

/**
 * 移动端文档章节导航抽屉（仅 <lg 显示；桌面用 docs/layout.tsx 的固定 aside）。
 *
 * 复用 DocsSidebar（已是 client 组件）。可访问性统一在 useDrawer。给 DocsSidebar 传
 * onNavigate=close：覆盖 hash-only 链接（如 /docs/language-guide#types 在同页只变
 * hash 不变 pathname，route-change 关闭不触发）——点任意章节链接都显式关抽屉。
 */
export function DocsSidebarDrawer() {
  const t = useTranslations('docsNav');
  const { open, openDrawer, close, panelRef, triggerRef, firstFocusRef } = useDrawer();

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={openDrawer}
        aria-label={t('sectionsLabel')}
        aria-expanded={open}
        aria-controls="docs-sidebar-drawer"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
      >
        <PanelLeft className="h-4 w-4" />
        {t('sectionsLabel')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t('sectionsLabel')}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <div
            ref={panelRef}
            id="docs-sidebar-drawer"
            className="absolute left-0 top-0 flex h-[100dvh] w-72 max-w-[85vw] flex-col gap-2 overflow-y-auto border-r border-border bg-bg p-4 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-fg-muted">{t('sectionsLabel')}</span>
              <button
                ref={firstFocusRef}
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DocsSidebar onNavigate={close} />
          </div>
        </div>
      )}
    </div>
  );
}
