'use client';

import { Link } from '@/i18n/navigation';
import { Menu, X } from 'lucide-react';
import { useDrawer } from '@/hooks/useDrawer';

type NavItem = { href: string; label: string };

/**
 * 移动端主导航（汉堡按钮 + 滑入抽屉）。
 *
 * header 是 server component：nav label 在 server 端经 getTranslations 翻译后，
 * 以可序列化的 {href,label}[] 传进来（next-intl 官方推荐做法，避免在 client 内
 * 重复 useTranslations 扩大 i18n payload）。仅 <md 显示（桌面用 server 端的 nav）。
 *
 * 可访问性（统一在 useDrawer）：aria-expanded/aria-controls、role=dialog aria-modal、
 * Esc 关并回焦点、focus trap、遮罩点击关、点链接后关（route 变化）、body 滚动锁、
 * 关闭后焦点回触发按钮。高度用 100dvh 避开 mobile Safari 地址栏跳动。
 */
export function MobileNav({ nav }: { nav: NavItem[] }) {
  const { open, openDrawer, close, panelRef, triggerRef, firstFocusRef } = useDrawer();

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={openDrawer}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Site navigation">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            id="mobile-nav-drawer"
            className="absolute right-0 top-0 flex h-[100dvh] w-72 max-w-[85vw] flex-col gap-1 border-l border-border bg-bg p-4 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-fg-muted">Menu</span>
              <button
                ref={firstFocusRef}
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="flex min-h-11 items-center rounded-md px-3 text-base text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
