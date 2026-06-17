import { setRequestLocale } from 'next-intl/server';
import AsterPlayground from '@/components/AsterPlayground';

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AsterPlayground />;
}
