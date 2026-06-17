import './globals.css';
import type { ReactNode } from 'react';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata = {
  title: 'Aster Lang — Policy · Workflow · Decision',
  description:
    'Write policies, workflows and decisions in plain English, 中文, Deutsch, हिन्दी — on a deterministic, auditable engine where every decision is replayable.',
};

/*
 * 自托管品牌字体（与 aster-cloud 同款 next/font/google）：
 *   Fraunces = display 标题，Inter = sans 正文，JetBrains Mono = code。
 * 注入 --aster-font-*-loaded，globals.css 把它们 splice 进 token 名。
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--aster-font-display-loaded',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--aster-font-sans-loaded',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--aster-font-mono-loaded',
  display: 'swap',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-bg text-fg antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
