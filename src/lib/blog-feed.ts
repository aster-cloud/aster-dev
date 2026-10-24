import type { BlogPost } from './blog';

/** 站点根地址：RSS 里的链接必须是绝对 URL。 */
export const SITE_URL = 'https://aster-lang.dev';

const FEED_TITLE = 'Aster Lang Blog';
const FEED_DESC = 'Product updates, language deep dives, and design notes from the Aster Lang team.';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 生成 RSS 2.0。链接形状与旧站一致（/blog/posts/<slug>），老订阅者的 guid 不变、不会重复推送。 */
export function buildFeed(posts: readonly BlogPost[]): string {
  const items = posts.map((p) => {
    const url = `${SITE_URL}/blog/posts/${p.slug}`;
    return [
      '    <item>',
      `      <title>${escapeXml(p.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <description>${escapeXml(p.description)}</description>`,
      `      <dc:creator>${escapeXml(p.author)}</dc:creator>`,
      `      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>`,
      ...p.tags.map((t) => `      <category>${escapeXml(t)}</category>`),
      '    </item>',
    ].join('\n');
  });
  const lastBuild = posts[0] ? new Date(`${posts[0].date}T00:00:00Z`).toUTCString() : new Date(0).toUTCString();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${FEED_TITLE}</title>`,
    `    <link>${SITE_URL}/blog</link>`,
    `    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(FEED_DESC)}</description>`,
    '    <language>en-US</language>',
    `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
