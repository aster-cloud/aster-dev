'use client';

import { usePathname } from '@/i18n/navigation';
import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * 移动端抽屉的共享行为 hook（header 导航 + docs 侧栏复用）。
 *
 * 统一处理可访问性底线：
 * - body 滚动锁（打开时锁，关闭/卸载恢复 prevOverflow）
 * - Esc 关闭 → 走 close()，焦点回触发按钮
 * - 简单 focus trap：Tab/Shift+Tab 在抽屉内循环（配合 role=dialog aria-modal）
 * - 路由切换自动关闭：用 render 期间按 pathname 守卫纠正 state（本仓 lint 禁
 *   set-state-in-effect），并把 closeKey（pathname + hash）一起比对，覆盖
 *   hash-only 链接（如 /docs/x#types）不变 pathname 的场景。
 *
 * 返回 open / openWith / close / panelRef / triggerRef / firstFocusRef。
 */
export function useDrawer(): {
  open: boolean;
  openDrawer: () => void;
  close: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  firstFocusRef: RefObject<HTMLButtonElement | null>;
} {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 打开时锁定的导航键（pathname#hash）。pathname 或 hash 变化即视为已导航 → 关闭。
  const [openedKey, setOpenedKey] = useState<string | null>(null);
  const currentKey =
    pathname + (typeof window !== 'undefined' ? window.location.hash : '');
  if (open && openedKey !== null && openedKey !== currentKey) {
    setOpen(false);
    setOpenedKey(null);
  }

  function close() {
    setOpen(false);
    setOpenedKey(null);
    triggerRef.current?.focus();
  }

  function openDrawer() {
    setOpen(true);
    setOpenedKey(currentKey);
  }

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstFocusRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
        return;
      }
      // 简单 focus trap：Tab 在抽屉内可聚焦元素间循环。
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, openDrawer, close, panelRef, triggerRef, firstFocusRef };
}
