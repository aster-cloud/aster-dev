/**
 * AI Guardian 演示页（公开）。
 *
 * 浏览器内真编译真执行 Aster 守卫规则：AI 客服的工具调用被放行、升级、送审或拒绝，
 * 并留下哈希链证据；视图 A 为动手沙盒，视图 C 为 MCP 智能体对话（视图 B 剧情只在嵌入路由）。纯客户端，无网络。
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { GuardianContent } from './guardian-content';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guardianDemo.seo' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}/demos/guardian` },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  };
}

export default async function GuardianPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="bg-bg">
      <GuardianContent locale={locale} />
    </main>
  );
}
