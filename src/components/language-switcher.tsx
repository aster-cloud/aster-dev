'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, localeNames, partialLocales, type Locale } from '@/i18n/config';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/**
 * 语言切换器（与 aster-cloud 同款交互）。
 *
 * PoC 阶段列编译期全集；后续里程碑接后端 /api/v1/lexicons 可用性约束
 * （与 cloud 四重交集 compiled∩backend∩platform∩team 同源）。partial locale
 * 标 beta 角标。
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function switchTo(target: Locale) {
    setOpen(false);
    router.replace(pathname, { locale: target });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Switch language"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
      >
        <Globe className="h-4 w-4" />
        <span>{localeNames[locale]}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 min-w-40 overflow-hidden rounded-lg border border-border bg-bg shadow-brand"
        >
          {locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => switchTo(l)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-bg-muted ${
                  l === locale ? 'font-semibold text-primary' : 'text-fg'
                }`}
              >
                {localeNames[l]}
                {partialLocales.includes(l) && (
                  <span className="ml-2 rounded-full bg-warning-subtle px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    beta
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
