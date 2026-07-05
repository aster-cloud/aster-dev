import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

/** 站点页脚（与 aster-cloud 简洁页脚语言一致）。 */
export async function SiteFooter() {
  const t = await getTranslations('devFooter');

  return (
    <footer className="border-t border-border bg-bg-subtle">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Aster Lang" width={24} height={24} />
          <span>© {new Date().getFullYear()} Aster Lang</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/docs" className="transition-colors hover:text-fg">
            {t('docs')}
          </Link>
          <Link href="/playground" className="transition-colors hover:text-fg">
            {t('playground')}
          </Link>
          <Link href="/demos" className="transition-colors hover:text-fg">
            {t('demos')}
          </Link>
          <a
            href="https://aster-lang.cloud"
            className="transition-colors hover:text-fg"
            target="_blank"
            rel="noreferrer"
          >
            {t('cloud')}
          </a>
          <a
            href="https://github.com/aster-cloud/aster-lang-core"
            className="transition-colors hover:text-fg"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
