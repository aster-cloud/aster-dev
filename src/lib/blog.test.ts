import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatPostDate, getPost, listPosts } from './blog';
import { buildFeed } from './blog-feed';

const CONTENT = join(process.cwd(), 'content/blog');

describe('blog posts (issue #44)', () => {
  const posts = listPosts();

  it('有文章，且日期都是合法的 ISO YYYY-MM-DD', () => {
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) {
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${p.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(p.date);
    }
  });

  it('按日期倒序', () => {
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('slug 唯一，且与 content/blog 下的正文文件一一对应', () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const files = readdirSync(CONTENT).map((f) => f.replace(/\.mdx$/, ''));
    expect([...files].sort()).toEqual([...slugs].sort());
  });

  it('未知 slug 查不到', () => {
    expect(getPost('../../package')).toBeUndefined();
  });

  it('日期格式化不受时区影响', () => {
    expect(formatPostDate('2026-01-15')).toBe('Jan 15, 2026');
    expect(formatPostDate('2026-12-01')).toBe('Dec 1, 2026');
  });
});

describe('RSS feed', () => {
  it('每篇文章一个 item，链接形状与旧站一致', () => {
    const xml = buildFeed(listPosts());
    expect(xml.match(/<item>/g)).toHaveLength(listPosts().length);
    for (const p of listPosts()) {
      expect(xml).toContain(`<guid isPermaLink="true">https://aster-lang.dev/blog/posts/${p.slug}</guid>`);
    }
  });

  it('转义标题中的 XML 特殊字符', () => {
    const xml = buildFeed([
      { slug: 's', title: 'A & B <C>', description: '"q"', date: '2026-01-01', author: 'x', tags: [] },
    ]);
    expect(xml).toContain('<title>A &amp; B &lt;C&gt;</title>');
    expect(xml).toContain('<pubDate>Thu, 01 Jan 2026 00:00:00 GMT</pubDate>');
  });
});
