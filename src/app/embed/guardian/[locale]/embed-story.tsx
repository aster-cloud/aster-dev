'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { PipelineView } from '@/features/guardian/views/pipeline';

/** ?theme=dark|light 强制主题；其他取值视为未指定，跟随系统。 */
function ThemedStory({ locale }: { locale: string }) {
  const param = useSearchParams().get('theme');
  const theme = param === 'dark' || param === 'light' ? param : undefined;
  return (
    <ThemeProvider forcedTheme={theme}>
      <div className="min-h-screen p-4">
        <PipelineView tryItHref={`https://aster-lang.dev/${locale}/demos/guardian`} />
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
