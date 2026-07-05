import { setRequestLocale } from 'next-intl/server';
import AsterPlayground from '@/components/AsterPlayground';
import { PlaygroundDemoExplorer } from '@/components/playground-demo-explorer';

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <AsterPlayground />
      {/* 演练场底部聚合四个 demo 入口：让用户在写规则的工作台里发现成品展示（融合 demos↔playground）。 */}
      <PlaygroundDemoExplorer locale={locale} />
    </>
  );
}
