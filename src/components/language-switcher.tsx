'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { localeNames, partialLocales, type Locale } from '@/i18n/config';
import { useAvailableLocales } from '@/hooks/useAvailableLocales';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/**
 * 语言切换器（与 aster-cloud 同款交互）。
 *
 * 只显示后端可用的 locale（compiled∩backend，见 useAvailableLocales，与 cloud
 * 四重交集同源）。fail-open：后端异常时回退编译期全集。partial locale 标 beta。
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { available } = useAvailableLocales();
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
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg sm:h-9 sm:min-h-0"
      >
        <Globe className="h-4 w-4" />
        <span>{localeNames[locale]}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 min-w-40 overflow-hidden rounded-lg border border-border bg-bg shadow-brand"
        >
          {available.map((l) => (
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
