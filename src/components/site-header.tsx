import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { MobileNav } from './mobile-nav';
import { Code2 } from 'lucide-react';

/**
 * 站点顶栏（sticky，毛玻璃背景，与 aster-cloud 视觉语言对齐）。
 * 左 logo + 主导航，右语言切换 + 主题切换 + GitHub。
 */
export async function SiteHeader() {
  const t = await getTranslations('devNav');

  const nav = [
    { href: '/docs', label: t('docs') },
    { href: '/docs/language-guide', label: t('guide') },
    { href: '/docs/reference', label: t('reference') },
    { href: '/playground', label: t('playground') },
    { href: '/demos', label: t('demos') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Image src="/logo.svg" alt="Aster Lang" width={28} height={28} priority />
          Aster
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <a
            href="https://github.com/aster-cloud/aster-lang-core"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg sm:h-9 sm:min-h-0 sm:w-9 sm:min-w-0"
          >
            <Code2 className="h-4 w-4" />
          </a>
          {/* 移动端主导航：汉堡 + 抽屉（仅 <md 显示，nav label 由 server 翻译后传入） */}
          <MobileNav nav={nav} />
        </div>
      </div>
    </header>
  );
}
