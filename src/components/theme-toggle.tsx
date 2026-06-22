'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** 亮/暗主题切换按钮（与 aster-cloud 一致的图标语言）。 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 避免 SSR 与客户端主题不一致的 hydration 闪烁：仅在客户端挂载后才渲染图标。
  // 这是 next-themes 官方推荐的 mount-guard，setState-in-effect 在此是有意为之。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg sm:h-9 sm:min-h-0 sm:w-9 sm:min-w-0"
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  );
}
