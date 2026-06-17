import './globals.css';
import type { ReactNode } from 'react';

/*
 * Root layout —— pass-through（与 aster-cloud 同款）。
 * 所有本地化页面经 [locale]/layout.tsx 服务，那里渲染 <html lang>/<body>/字体/
 * 主题。本文件仅满足 Next.js "root layout 必须存在"的要求，且导入全局样式。
 * 保持 pass-through 让 [locale] 段能用 setRequestLocale 做静态渲染（SSG）。
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
