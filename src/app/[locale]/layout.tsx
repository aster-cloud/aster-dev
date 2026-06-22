import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 显式声明移动端 viewport：width=device-width + initialScale=1 确保跨设备一致缩放。
 * **不**设 maximumScale/userScalable —— 禁用缩放会伤可访问性（低视力用户需放大）。
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/*
 * 自托管品牌字体（与 aster-cloud 同款 next/font/google）：
 *   Fraunces = display 标题，Inter = sans 正文，JetBrains Mono = code。
 * 注入 --aster-font-*-loaded，globals.css 把它们 splice 进 token 名。
 */
const fraunces = Fraunces({ subsets: ['latin'], variable: '--aster-font-display-loaded', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--aster-font-sans-loaded', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--aster-font-mono-loaded', display: 'swap' });

/** per-locale SEO：title/description 来自 messages，并声明 hreflang 备用语言。 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'devSite' });
  return {
    title: { default: `Aster Lang — ${t('heroName')}`, template: '%s · Aster Lang' },
    description: t('heroText'),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? '/' : `/${l}`]),
      ),
    },
    openGraph: {
      title: `Aster Lang — ${t('heroName')}`,
      description: t('heroText'),
      locale,
      type: 'website',
    },
  };
}

/**
 * locale 段布局：拥有 <html lang>/<body>/字体/主题 + 站点 chrome（与 aster-cloud
 * 同款，root layout 是 pass-through）。setRequestLocale 让本段静态渲染（SSG）。
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/*
          esbuild __name polyfill（与 aster-cloud 同款修复）。

          OpenNext-on-Cloudflare 用 esbuild 的 keepNames 转换打包 worker，会发出对
          __name helper 的调用以在压缩后保留类/函数的 .name。helper 定义在 worker
          bundle 里，但落进 HTML 的某些 inline <script>（尤其 next-themes 的主题
          bootstrap 脚本）也引用 __name 却不重新声明 → 浏览器在首个 inline script
          抛 "Uncaught ReferenceError: __name is not defined"（线上 /docs/lexicons
          等所有页面都中招）。

          在任何其它 inline script 之前定义一个等价兜底（设 .name 并返回入参，
          与 esbuild 自身定义行为一致），bundled helper 未加载时也行为相同。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'globalThis.__name=globalThis.__name||function(t,n){try{Object.defineProperty(t,"name",{value:n,configurable:true})}catch(e){}return t};',
          }}
        />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <ThemeProvider>
          <NextIntlClientProvider>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
