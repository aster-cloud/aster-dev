import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { CodeBlock } from '@/components/code-block';
import { HeroText } from '@/components/hero-text';
import { ArrowRight, GitCompareArrows, Languages, ScrollText } from 'lucide-react';

const HERO_SAMPLE = `Module LoanApproval.

# Decisions read like the rules they encode
Rule approve given applicant:
  if applicant.creditScore is at least 700
    and applicant.income is greater than 50000
  then return "approved"
  else return "manual review".`;

/**
 * 首页 —— 代码优先 hero（现代语言官网标配）+ 三大价值 + 受众分流。
 * 文案走 next-intl（devSite namespace），运行时从后端 /api/v1/messages 加载。
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('devSite');

  return (
    <>
      {/* ── Hero：左文案 + 右可运行代码 ── */}
      <section className="border-b border-border bg-gradient-to-b from-bg to-bg-subtle">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {t('badge')}
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              {t('heroName')}
            </h1>
            {/* ★动态化★：heroText 里的语言列表（"…English, 中文, Deutsch or
                हिन्दी…"）改由 client 组件按 compiled∩backend 实时拼接，管理员
                在后端禁用某语言后这句即时收敛。fail-open 回退完整四语。 */}
            <HeroText />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/playground"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-brand transition-colors hover:bg-primary-hover"
              >
                {t('tryPlayground')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-bg-muted"
              >
                {t('quickStart')}
              </Link>
            </div>
          </div>

          <div className="lg:pl-4">
            <CodeBlock code={HERO_SAMPLE} filename="loan-approval.aster" />
            <p className="mt-3 text-center text-xs text-fg-subtle">{t('heroCodeHint')}</p>
          </div>
        </div>
      </section>

      {/* ── 三大价值 ── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon={<Languages className="h-5 w-5" />}
            title={t('valueLanguageTitle')}
            body={t('valueLanguageBody')}
          />
          <Feature
            icon={<GitCompareArrows className="h-5 w-5" />}
            title={t('valueDeterministicTitle')}
            body={t('valueDeterministicBody')}
          />
          <Feature
            icon={<ScrollText className="h-5 w-5" />}
            title={t('valueAuditableTitle')}
            body={t('valueAuditableBody')}
          />
        </div>
      </section>

      {/* ── 受众分流 ── */}
      <section className="border-t border-border bg-bg-subtle">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-fg">{t('choosePath')}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <PathCard
              emoji="👤"
              title={t('businessExpertTitle')}
              body={t('businessExpertBody')}
              ctaLabel={t('businessExpertCta')}
              href="/docs"
            />
            <PathCard
              emoji="⚙️"
              title={t('developerTitle')}
              body={t('developerBody')}
              ctaLabel={t('developerCta')}
              href="/docs/reference"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}

function PathCard({
  emoji,
  title,
  body,
  ctaLabel,
  href,
}: {
  emoji: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-bg p-6">
      <div className="text-2xl">{emoji}</div>
      <h3 className="mt-3 font-display text-lg font-semibold text-fg">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-fg-muted">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
