import type { ReactNode } from 'react';

export const metadata = {
  title: 'aster-lang.dev',
  description: 'Policy · Workflow · Decision — in plain English, 中文, Deutsch, हिन्दी',
};

// 根布局：locale 段自带 <html lang>，这里仅作最外层壳。
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
