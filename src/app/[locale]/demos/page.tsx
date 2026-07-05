/**
 * Demos 索引落地页（公开）。迁移自 aster-cloud。
 *
 * 聚合 aster-lang.dev 上与 cloud 无关的可交互 demo（纯客户端 compile/evaluate）：
 * 猫咪心情引擎 / 德州扑克 / 源码即诗（静夜思·福尔摩斯）。各卡片进入对应 demo 子路由。
 * 注：credit/vocab 是 cloud 专属（DB-backed），不迁到 dev，故 DEMO_CARDS 已裁剪。
 */
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardBody, Container, Stack } from '@/components/ui';
import { Link } from '@/i18n/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'demosIndex.seo' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}/demos` },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  };
}

/** demo 卡片元数据：href 指向子路由，文案走 i18n（demosIndex.cards.<key>）。
 * 只列 aster-lang.dev 实际存在的 demo——credit/vocab 是 cloud 专属，已裁剪；
 * 「源码即诗/推理」拆成独立的 jingyesi（静夜思）+ sherlock（斑点带子案）两个 demo。 */
const DEMO_CARDS = [
  { key: 'kitten', href: '/demos/kitten', emoji: '🐱' },
  { key: 'poker', href: '/demos/poker', emoji: '🃏' },
  { key: 'jingyesi', href: '/demos/jingyesi', emoji: '🌕' },
  { key: 'sherlock', href: '/demos/sherlock', emoji: '🔍' },
] as const;

export default async function DemosIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'demosIndex' });

  return (
    <main className="bg-bg">
      <Container className="py-12 sm:py-16">
        <Stack gap={2} className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('eyebrow')}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-fg-muted">{t('subtitle')}</p>
        </Stack>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_CARDS.map((card) => (
            <li key={card.key}>
              <Link href={card.href} className="block h-full focus:outline-none">
                <Card className="h-full transition-shadow hover:shadow-brand">
                  <CardBody className="flex h-full flex-col gap-3 pt-6">
                    <span className="text-3xl" aria-hidden>{card.emoji}</span>
                    <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
                      {t(`cards.${card.key}.title`)}
                    </h2>
                    <p className="flex-1 text-sm text-fg-muted">{t(`cards.${card.key}.description`)}</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      {t('enter')}
                      <span aria-hidden>→</span>
                    </span>
                  </CardBody>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
