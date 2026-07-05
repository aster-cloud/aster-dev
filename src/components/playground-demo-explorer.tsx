import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardBody } from '@/components/ui';

/**
 * Playground 底部的「探索 demo」区（server component）。
 *
 * playground 是「写自己的规则」的工作台；四个 demo 是「看 Aster 能做什么」的成品展示
 * （kitten/poker 3D 动画、jingyesi/sherlock LayoutMap 双视图）——它们的富交互无法塞进
 * playground 的编辑器+文本形态，故此处只做**入口聚合**：把 playground 与 demos 双向连通，
 * 让用户在演练场里发现四个 demo。文案复用 demosIndex.cards（与 /demos 索引同源）。
 */
const DEMO_CARDS = [
  { key: 'kitten', href: '/demos/kitten', emoji: '🐱' },
  { key: 'poker', href: '/demos/poker', emoji: '🃏' },
  { key: 'jingyesi', href: '/demos/jingyesi', emoji: '🌕' },
  { key: 'sherlock', href: '/demos/sherlock', emoji: '🔍' },
] as const;

export async function PlaygroundDemoExplorer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'demosIndex' });
  const tp = await getTranslations({ locale, namespace: 'playgroundDemos' });

  return (
    <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
      <div className="mb-6 border-t border-border pt-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{tp('eyebrow')}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-fg">{tp('title')}</h2>
        <p className="mt-1 text-fg-muted">{tp('subtitle')}</p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEMO_CARDS.map((card) => (
          <li key={card.key}>
            <Link href={card.href} className="block h-full focus:outline-none">
              <Card className="h-full transition-shadow hover:shadow-brand">
                <CardBody className="flex h-full flex-col gap-2 pt-5">
                  <span className="text-2xl" aria-hidden>{card.emoji}</span>
                  <h3 className="font-display text-base font-semibold tracking-tight text-fg">
                    {t(`cards.${card.key}.title`)}
                  </h3>
                  <p className="flex-1 text-sm text-fg-muted">{t(`cards.${card.key}.description`)}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t('enter')}<span aria-hidden>→</span>
                  </span>
                </CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
