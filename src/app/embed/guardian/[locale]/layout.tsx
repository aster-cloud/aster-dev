import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { routing } from '@/i18n/routing';

/** 嵌入页不进搜索索引；cloud 以 iframe 引用。 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// 字体与 [locale]/layout 保持一致，globals.css 把这些变量接入 token。
const fraunces = Fraunces({ subsets: ['latin'], variable: '--aster-font-display-loaded', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--aster-font-sans-loaded', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--aster-font-mono-loaded', display: 'swap' });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * AI Guardian 嵌入布局：只提供字体、文案与样式，不渲染站点头尾。
 * 位于 [locale] 段之外，因为 [locale]/layout 会给所有页面加 SiteHeader / SiteFooter。
 * 主题由页面内的 ThemeProvider 提供（需要读取 ?theme 查询参数）。
 */
export default async function EmbedLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* esbuild __name 兜底：OpenNext 打包后 inline script 会引用未声明的 __name，详见 [locale]/layout.tsx。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'globalThis.__name=globalThis.__name||function(t,n){try{Object.defineProperty(t,"name",{value:n,configurable:true})}catch(e){}return t};',
          }}
        />
      </head>
      <body className="bg-bg text-fg antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
