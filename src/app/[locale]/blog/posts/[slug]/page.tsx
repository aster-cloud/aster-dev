import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { formatPostDate, getPost, listPosts, loadPostContent } from '@/lib/blog';
import { SITE_URL } from '@/lib/blog-feed';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => listPosts().map((p) => ({ locale, slug: p.slug })));
}

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${SITE_URL}/blog/posts/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = getPost(slug);
  const Content = await loadPostContent(slug);
  if (!post || !Content) notFound();
  const t = await getTranslations('devBlog');

  return (
    // 正文只有英文：显式标 lang，避免 zh/de/hi 页面上的英文被按页面语言朗读与索引。
    <article lang="en" className="prose prose-zinc mx-auto max-w-3xl px-4 py-12 dark:prose-invert sm:px-6">
      <p className="not-prose text-sm">
        <Link href="/blog" className="text-fg-muted hover:text-fg">
          ← {t('back')}
        </Link>
      </p>
      <h1>{post.title}</h1>
      <p className="not-prose -mt-4 mb-8 text-sm text-fg-muted">
        <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.author}
      </p>
      {locale !== 'en' && <p className="not-prose mb-8 text-sm text-fg-muted">{t('englishOnly')}</p>}
      <Content />
    </article>
  );
}
