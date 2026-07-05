/**
 * 《静夜思》demo 页（/demos/jingyesi）——「源码即诗」。
 *
 * 李白的诗按原词序即 Aster 源码，运行输出诗名。用 LayoutMap 展示「显示视图（原诗工整四句）」
 * 与「编译视图（受语法约束的 canonical）」两种排版——编译走 canonical。纯客户端 compile/evaluate。
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

const JingyesiContent = dynamic(() => import('./jingyesi-content'));

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'jingyesiPage.seo' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}/demos/jingyesi` },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  };
}

export default async function JingyesiDemoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="bg-bg">
      <JingyesiContent />
    </main>
  );
}
