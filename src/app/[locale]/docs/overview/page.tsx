import { setRequestLocale } from 'next-intl/server';
import { loadDoc } from '@/lib/load-doc';
import { DocsFallbackNotice } from '@/components/docs-fallback-notice';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { Content, fellBack } = await loadDoc(locale, 'overview');
  return (
    <>
      {fellBack && <DocsFallbackNotice locale={locale} />}
      <Content />
    </>
  );
}
