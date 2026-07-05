/**
 * 「源码即诗 / 源码即推理」demo 页（/demos/poem）。迁移自 aster-lang-ts/examples 的命令行 demo。
 *
 * 展示两段「自然语言文本即 Aster 源码」：李白《静夜思》（运行输出诗名）与福尔摩斯《斑点带子案》
 * 推理（喂入线索运行输出真凶）。纯客户端 compile/evaluate，无 cloud 后端依赖。
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import dynamic from 'next/dynamic';

const PoemContent = dynamic(() => import('./poem-content'));

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'poemPage.seo' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}/demos/poem` },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  };
}

export default async function PoemDemoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PoemContent />;
}
