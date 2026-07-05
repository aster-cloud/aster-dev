/**
 * 《斑点带子案》demo 页（/demos/sherlock）——「源码即推理」的交互推理游戏。
 *
 * 福尔摩斯的推断即 Aster 决策规则。用户在探案台勾选案发线索的任意组合，规则实时重跑、
 * 输出真凶如何随线索翻转（真编译真运行）。用 LayoutMap 展示「显示视图（推理独白）」与
 * 「编译视图（缩进决策链 canonical）」——编译走 canonical。纯客户端 compile/evaluate。
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

const SherlockContent = dynamic(() => import('./sherlock-content'));

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sherlockPage.seo' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}/demos/sherlock` },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  };
}

export default async function SherlockDemoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="bg-bg">
      <SherlockContent />
    </main>
  );
}
