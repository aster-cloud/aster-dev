'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { PipelineView } from '@/features/guardian/views/pipeline';
import { defaultLocale } from '@/i18n/config';

/**
 * 「亲手试试」：相对地址，解析到嵌入页自身的来源（本地、预览、生产各自正确）；
 * 默认语言不带前缀（localePrefix: as-needed），以 target=_top 跳出 iframe。
 */
function tryItHref(locale: string): string {
  return locale === defaultLocale ? '/demos/guardian' : `/${locale}/demos/guardian`;
}

/** ?theme=dark|light 强制主题；其他取值视为未指定，跟随系统。 */
function ThemedStory({ locale }: { locale: string }) {
  const param = useSearchParams().get('theme');
  const theme = param === 'dark' || param === 'light' ? param : undefined;
  return (
    <ThemeProvider forcedTheme={theme}>
      <div className="min-h-screen p-4">
        <PipelineView tryItHref={tryItHref(locale)} />
      </div>
    </ThemeProvider>
  );
}

export function EmbedStory({ locale }: { locale: string }) {
  return (
    <Suspense fallback={null}>
      <ThemedStory locale={locale} />
    </Suspense>
  );
}
