import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * 首页（从 VitePress docs/index.md 的 home hero 迁移而来，ADR 0018 Phase 3）。
 *
 * 文案全部走 next-intl messages（devSite namespace），运行时从后端 /api/v1/messages
 * 加载 → 改文案无需重新构建文档站。"choose your path" 两卡片对照原站的业务/开发者分流。
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
    <div>
      <section style={{ textAlign: 'center', margin: '3rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{t('heroName')}</h1>
        <p style={{ fontSize: '1.25rem', color: '#475569' }}>{t('heroText')}</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <Link href="/playground" style={ctaPrimary}>
            {t('tryPlayground')}
          </Link>
          <Link href="/docs" style={ctaAlt}>
            {t('quickStart')}
          </Link>
        </div>
      </section>

      <h2>{t('choosePath')}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}
      >
        <article style={card}>
          <h3>👤 {t('businessExpertTitle')}</h3>
          <p>{t('businessExpertBody')}</p>
        </article>
        <article style={card}>
          <h3>⚙️ {t('developerTitle')}</h3>
          <p>{t('developerBody')}</p>
        </article>
      </div>
    </div>
  );
}

const ctaPrimary: React.CSSProperties = {
  background: '#2563eb',
  color: '#fff',
  padding: '0.65rem 1.25rem',
  borderRadius: 8,
  textDecoration: 'none',
};
const ctaAlt: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: '0.65rem 1.25rem',
  borderRadius: 8,
  textDecoration: 'none',
  color: '#1e293b',
};
const card: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '1.5rem',
};
