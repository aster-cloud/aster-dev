'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * next-themes 封装（与 aster-cloud 同款）。用 `data-theme` 属性驱动暗色，
 * 对齐 @aster-cloud/tokens 内部的 [data-theme="dark"] 选择器。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
