import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { formatPostDate, listPosts } from '@/lib/blog';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'devBlog' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: { types: { 'application/rss+xml': '/blog/feed.xml' } },
  };
}

/** 博客列表。文章只有英文；其他 locale 显示同一列表并提示原文语言。 */
export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('devBlog');
  const posts = listPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">{t('title')}</h1>
      <p className="mt-3 text-fg-muted">
        {t('description')}{' '}
        {/* RSS 是路由处理器而非页面，用普通 <a>，不加 locale 前缀 */}
        <a href="/blog/feed.xml" className="font-medium text-primary hover:underline">
          {t('rss')}
        </a>
      </p>
      {locale !== 'en' && <p className="mt-2 text-sm text-fg-muted">{t('englishOnly')}</p>}
      <ul className="mt-10 divide-y divide-border">
        {posts.map((post) => (
          <li key={post.slug} className="py-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              <Link href={`/blog/posts/${post.slug}`} className="text-fg hover:text-primary">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.author} ·{' '}
              {post.tags.join(' · ')}
            </p>
            <p className="mt-3 text-fg-muted">{post.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
