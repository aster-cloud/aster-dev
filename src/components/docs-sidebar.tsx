'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * 文档左侧分组导航（语言规范标准 IA）：
 *   Getting Started → Language Guide → Standard Library → Reference → Tooling → Examples
 *
 * PoC 阶段链接到已迁移的页面；后续里程碑随 63 篇文档批量补全。
 */
export function DocsSidebar() {
  const t = useTranslations('docsNav');
  const pathname = usePathname();

  const groups: { title: string; items: { href: string; label: string }[] }[] = [
    {
      title: t('gettingStarted'),
      items: [{ href: '/docs', label: t('quickstart') }],
    },
    {
      title: t('languageGuide'),
      items: [
        { href: '/docs/language-guide', label: t('syntax') },
        { href: '/docs/language-guide#types', label: t('types') },
        { href: '/docs/language-guide#expressions', label: t('expressions') },
        { href: '/docs/language-guide#functions', label: t('functions') },
        { href: '/docs/language-guide#modules', label: t('modules') },
      ],
    },
    {
      title: t('reference'),
      items: [{ href: '/docs/reference', label: t('reference') }],
    },
  ];

  return (
    <nav aria-label="Docs" className="text-sm">
      {groups.map((group) => (
        <div key={group.title} className="mb-6">
          <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            {group.title}
          </p>
          <ul className="space-y-0.5 border-l border-border">
            {group.items.map((item) => {
              const active = pathname === item.href.split('#')[0];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`-ml-px block border-l py-1 pl-3 transition-colors ${
                      active
                        ? 'border-primary font-medium text-primary'
                        : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
