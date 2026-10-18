'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * next-themes 封装（与 aster-cloud 同款）。用 `data-theme` 属性驱动暗色，
 * 对齐 @aster-cloud/tokens 内部的 [data-theme="dark"] 选择器。
 * forcedTheme 供嵌入页按 ?theme 固定主题，不传则跟随系统。
 */
export function ThemeProvider({ children, forcedTheme }: { children: ReactNode; forcedTheme?: string }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forcedTheme}
    >
      {children}
    </NextThemesProvider>
  );
}
