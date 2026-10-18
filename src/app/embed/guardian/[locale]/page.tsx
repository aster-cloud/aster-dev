import { setRequestLocale } from 'next-intl/server';
import { EmbedStory } from './embed-story';

export default async function GuardianEmbedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EmbedStory locale={locale} />;
}
