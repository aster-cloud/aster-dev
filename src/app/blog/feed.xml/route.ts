import { listPosts } from '@/lib/blog';
import { buildFeed } from '@/lib/blog-feed';

// 构建期生成静态文件。路径带扩展名，不经 next-intl 中间件，因此放在 [locale] 段之外。
export const dynamic = 'force-static';

export function GET() {
  return new Response(buildFeed(listPosts()), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
