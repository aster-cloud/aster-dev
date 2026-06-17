import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { locales, localeNames, type Locale } from '@/i18n/config';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * locale 段布局：注入 NextIntlClientProvider + 顶部语言切换器。
 *
 * 语言切换器的可用集合**最终**应受后端 /api/v1/lexicons 可用性约束（与 cloud
 * 四重交集同源）；PoC 阶段先列编译期全集，后续里程碑接入运行时过滤。
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
    <NextIntlClientProvider>
      <header
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Link href="/" style={{ fontWeight: 700, textDecoration: 'none' }}>
          aster-lang.dev
        </Link>
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
          {locales.map((l) => (
            <LocaleLink key={l} target={l} current={locale as Locale} />
          ))}
        </nav>
      </header>
      <main style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1.5rem' }}>
        {children}
      </main>
    </NextIntlClientProvider>
  );
}

/** 切到 target locale 的链接（default locale 不带前缀，与 routing as-needed 一致）。 */
function LocaleLink({ target, current }: { target: Locale; current: Locale }) {
  const href = target === routing.defaultLocale ? '/' : `/${target}`;
  const active = target === current;
  return (
    <Link
      href={href}
      style={{
        textDecoration: active ? 'underline' : 'none',
        fontWeight: active ? 700 : 400,
      }}
    >
      {localeNames[target]}
    </Link>
  );
}
