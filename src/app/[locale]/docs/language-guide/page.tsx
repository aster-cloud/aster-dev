import { setRequestLocale } from 'next-intl/server';
import { loadDoc } from '@/lib/load-doc';

export default async function LanguageGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const Content = await loadDoc(locale, 'language-guide');
  return <Content />;
}
